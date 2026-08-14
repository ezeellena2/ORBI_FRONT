import { useMutation, useQueryClient } from '@tanstack/react-query'
import { fusionarDetalleTrasPatch } from '../fusion-detalle-vehiculo'
import { flotaKeys } from '../query-keys'
import { vehiculosService } from '@/services/flota/vehiculos-service'
import type { ActualizarVehiculoRequest, VehiculoDetalleDto } from '@/services/contracts/flota'

/**
 * Edición de los datos OPERATIVOS del vehículo (`PATCH`, nunca `PUT` — C-11).
 *
 * Lo pide `f-06` paso 1 y el cimiento del slice no lo construyó: el endpoint ya estaba cubierto por
 * `vehiculosService.actualizar`, faltaba el hook.
 *
 * `setQueryData` con la respuesta antes de invalidar: la pantalla muestra el valor nuevo en el mismo
 * frame en que se cierra el modal, sin esperar el refetch.
 *
 * ⚠️ PERO LA RESPUESTA DEL `PATCH` **NO ES AUTORITATIVA PARA LOS 2 CAMPOS COMPUESTOS**, y por eso se
 * hace un merge y no un reemplazo. El docblock anterior decía que el `PATCH` "devuelve el
 * `VehiculoDetalleDto` completo releído por la misma vía que el `GET`": es cierto para la identidad
 * canónica —`Actualizar` relee la proyección con `ObtenerVigentePorClave`— y **falso para
 * Telemetría**. `VehiculoFlotaService.Actualizar` cierra con
 * `MapearDetalle(vehiculo, vigente)`, o sea **sin** el tercer argumento `upstream`, mientras que
 * `ObtenerPorId` sí llama antes a `ObtenerEstadoDeUnVehiculo`. Con `upstream = null`,
 * `MapeoEstadoConexion.Mapear(null)` devuelve `sin_dato` y `UltimaSenal` queda en `null`.
 *
 * Reemplazar la entrada de caché con esa respuesta hacía que **guardar una edición apagara el badge
 * de conexión**: un vehículo que la ficha mostraba "En línea · 45 km/h" pasaba a "Sin dato" —en el
 * hero y en la tarjeta de ubicación— hasta que aterrizara el refetch de la invalidación. Y si ese
 * refetch se pausa (backend caído, pestaña sin red) se queda así. Es la mentira que este módulo
 * corrige en todas las demás superficies, producida por el atajo de caché.
 *
 * El merge conserva `estado` y `ultimaSenal` de lo que ya había en caché —la última composición
 * REAL— y toma del `PATCH` todo lo demás, que sí es autoritativo. La invalidación de la línea
 * siguiente los refresca contra el servidor de todos modos; lo que se evita es el frame intermedio
 * afirmando algo falso.
 *
 * La invalidación por prefijo `['flota','vehiculos']` alcanza al listado con cualquier filtro (la
 * patente y el alias se ven ahí) y refresca el detalle contra el servidor.
 *
 * Errores que la pantalla ramifica por `code`: `flota.vehiculo.transicion_invalida` (409) y
 * `flota.vehiculo.no_existe` (404, que también es cross-tenant).
 */
export function useEditarVehiculo(vehiculoFlotaId: string) {
  const queryClient = useQueryClient()

  return useMutation<VehiculoDetalleDto, unknown, ActualizarVehiculoRequest>({
    mutationFn: async (data) => {
      const respuesta = await vehiculosService.actualizar(vehiculoFlotaId, data)
      return respuesta.data
    },
    onSuccess: (detalle) => {
      queryClient.setQueryData<VehiculoDetalleDto>(
        flotaKeys.vehiculoDetalle(vehiculoFlotaId),
        (anterior) => fusionarDetalleTrasPatch(anterior, detalle),
      )
      void queryClient.invalidateQueries({ queryKey: flotaKeys.vehiculos() })
    },
  })
}
