import { useMutation, useQueryClient } from '@tanstack/react-query'
import { flotaKeys } from '../query-keys'
import { conductoresService } from '@/services/flota/conductores-service'
import type { ConductorDetalleDto, CrearConductorRequest } from '@/services/contracts/flota'

/**
 * Alta de conductor operativo (`POST /api/flota/conductores`, permiso `flota.conductores.crear`).
 *
 * MODO A (`personaId`) o MODO B (`persona` con documento) — exactamente uno; lo valida el server.
 * El Modo B es el camino REAL: el operador tiene el documento en la mano, no un uuid. Ya no degrada
 * (`find-or-create-por-documento` existe desde el 2026-08-11).
 *
 * El conductor nace en `pendiente_documentacion`. Publica `flota.conductor-operativo-creado.v1`.
 *
 * ⚠️ EL FORMULARIO NO LLEVA LICENCIA NI TOGGLE DE INVITACION: los 2 campos se rechazan con 400 (no
 * se descartan en silencio). La licencia se carga despues como documento con
 * `tipoDocumento: 'licencia'`; el canal de invitacion no existe — Flota no invoca Notificaciones.
 *
 * Errores que la UI distingue POR `code`, nunca por status:
 *  - 404 `flota.conductor.persona_no_existe` — Modo A: esa persona no esta proyectada en la org.
 *  - 409 `flota.conductor.persona_ya_es_conductor` — el indice es PARCIAL sobre `activo`: un
 *    conductor DADO DE BAJA no ocupa a la persona, asi que el mensaje no debe decir "ya existe" a
 *    secas sino "ya es conductor ACTIVO".
 *  - 400 `flota.conductor.datos_canonicos_invalidos` — el Canonico rechazo el documento. NO
 *    reintentable con los mismos datos: hay que corregir el input.
 *  - 500 `flota.conductor.canonico_no_creable` — la coordinacion NO llego a destino. SI es
 *    reintentable y NO quedo nada escrito.
 *
 * Invalida el prefijo `['flota','conductores']`: la fila nueva tiene que aparecer en el listado con
 * cualquier filtro y en cualquier pagina.
 */
export function useCrearConductor() {
  const queryClient = useQueryClient()

  return useMutation<ConductorDetalleDto, unknown, CrearConductorRequest>({
    mutationFn: async (data) => {
      const respuesta = await conductoresService.crear(data)
      return respuesta.data
    },
    onSuccess: (detalle) => {
      // El POST devuelve el detalle completo: se siembra la cache del id nuevo para que navegar a
      // la ficha recien creada no muestre un esqueleto por un dato que ya esta en la mano.
      queryClient.setQueryData(flotaKeys.conductorDetalle(detalle.id), detalle)
      void queryClient.invalidateQueries({ queryKey: flotaKeys.conductores() })
    },
  })
}
