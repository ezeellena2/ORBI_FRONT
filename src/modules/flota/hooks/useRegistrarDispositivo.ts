import { useMutation, useQueryClient } from '@tanstack/react-query'
import { flotaKeys } from '../query-keys'
import { dispositivosService } from '@/services/flota/dispositivos-service'
import type { DispositivoDetalleDto, RegistrarDispositivoRequest } from '@/services/contracts/flota'

/**
 * Alta de dispositivo GPS en el inventario (`POST /api/flota/dispositivos`, permiso
 * `flota.dispositivos.crear`).
 *
 * El dispositivo nace en `estado_stock = 'en_stock'` (default del contrato, `datos.md` §3.3) y con
 * su transicion INICIAL de stock ya escrita — que es de donde el detalle repone despues
 * `fechaAltaOperativa` (D-S3-26). No se pasa por `instalado`: a ese estado se llega solo asignando
 * el equipo a un vehiculo.
 *
 * SOLO MODO A: el IMEI tiene que existir en el registro canonico. El Modo B esta bloqueado por
 * `traccar_device_id` (B-7) y el backend lo rechaza con 400
 * `flota.dispositivo.alta_modo_b_no_soportado`.
 *
 * Errores que la UI distingue POR `code`, nunca por status:
 *  - 409 `flota.dispositivo.imei_duplicado` — ya hay un dispositivo ACTIVO con ese IMEI. El indice
 *    es parcial sobre `activo`, asi que un equipo dado de baja NO ocupa el IMEI.
 *  - 404 `flota.dispositivo.canonico_no_existe` — el IMEI no resuelve en el canonico.
 *  - 404 `flota.dispositivo.modelo_no_existe` / `...proveedor_sim_no_existe` — el uuid del catalogo
 *    no existe O es de otra organizacion.
 *  - 500 `flota.dispositivo.canonico_no_coordinable` — la coordinacion no llego a destino. Es
 *    REINTENTABLE: no quedo nada escrito.
 *
 * Invalida el prefijo `['flota','dispositivos']`: la fila nueva tiene que aparecer en el listado con
 * cualquier filtro y en cualquier pagina.
 */
export function useRegistrarDispositivo() {
  const queryClient = useQueryClient()

  return useMutation<DispositivoDetalleDto, unknown, RegistrarDispositivoRequest>({
    mutationFn: async (data) => {
      const respuesta = await dispositivosService.registrar(data)
      return respuesta.data
    },
    onSuccess: (detalle) => {
      // El POST devuelve el detalle completo: se siembra la cache del id nuevo para que navegar a
      // la ficha recien creada no muestre un esqueleto por un dato que ya esta en la mano.
      queryClient.setQueryData(flotaKeys.dispositivoDetalle(detalle.id), detalle)
      void queryClient.invalidateQueries({ queryKey: flotaKeys.dispositivos() })
    },
  })
}
