import { useMutation, useQueryClient } from '@tanstack/react-query'
import { flotaKeysAfectadasPorAsignacion } from '../query-keys'
import { vehiculosService } from '@/services/flota/vehiculos-service'
import type { AsignacionVehiculoDispositivoDto } from '@/services/contracts/flota'

/**
 * El MISMO endpoint que `useAsignarDispositivo` (`POST .../vehiculos/{id}/asignaciones/dispositivo`,
 * permiso `flota.vehiculos.asignar-dispositivo`), con **el vehiculo en las variables en vez de en la
 * firma del hook**.
 *
 * ── POR QUE EXISTEN LOS DOS, Y NO ES DUPLICACION ──────────────────────────────────────────────
 * Lo que cambia entre las 2 pantallas es **cuando se conoce el `vehiculoFlotaId`**:
 *  - desde la ficha del vehiculo y desde el wizard ya es un dato de la pantalla → `useAsignarDispositivo`
 *    lo toma en la firma;
 *  - desde el INVENTARIO (`f-07`) lo elige el usuario dentro del formulario, asi que en el primer
 *    render todavia vale `''`.
 *
 * Tomarlo igual en la firma obligaba a leer el control con `form.watch()`, que el React Compiler
 * marca como incompatible (devuelve una funcion que no se puede memoizar sin arriesgar UI vieja) y
 * el lint rechaza. Pasarlo como variable de la mutation es la forma correcta: el id viaja **con la
 * operacion**, que es cuando efectivamente se conoce.
 *
 * ⚠️ NO ES UN CRUD DE UNA TABLA: el backend coordina con PlataformaCanonica ANTES de persistir
 * (D-S3-13) porque la correlacion dispositivo->vehiculo la posee el Canonico, y es lo que hace que
 * Telemetria acepte las posiciones. Si esa coordinacion falla, la mutation falla y **no queda nada
 * escrito**. No hay estado intermedio que reconciliar.
 *
 * REASIGNAR NO ES UN ERROR: si el vehiculo ya tenia GPS, el backend cierra la asignacion anterior
 * (`motivo_cierre = reasignacion`) y devuelve el saliente a `en_stock`. Por eso la invalidacion es la
 * misma de siempre y toca los 2 prefijos.
 *
 * La respuesta trae el `asignacionId`, unico camino al `DELETE` (D-S3-16). Desde el inventario **no
 * se guarda**, y no es un descuido: la desasociacion vive en la ficha del vehiculo, que es donde el
 * usuario la busca, y esa pantalla ya tiene su propio manejo del id (B-19).
 */
export interface InstalarDispositivoEnVehiculoVariables {
  /** Id LOCAL del vehiculo de la flota (A-4). Va a la URL, no al body. */
  vehiculoFlotaId: string
  /** Id local del dispositivo. Es el UNICO campo que declara `AsignarDispositivoRequest`. */
  dispositivoFlotaId: string
}

export function useInstalarDispositivoEnVehiculo() {
  const queryClient = useQueryClient()

  return useMutation<
    AsignacionVehiculoDispositivoDto,
    unknown,
    InstalarDispositivoEnVehiculoVariables
  >({
    mutationFn: async ({ vehiculoFlotaId, dispositivoFlotaId }) => {
      const respuesta = await vehiculosService.asignarDispositivo(vehiculoFlotaId, {
        dispositivoFlotaId,
      })
      return respuesta.data
    },
    onSuccess: () => {
      for (const key of flotaKeysAfectadasPorAsignacion()) {
        void queryClient.invalidateQueries({ queryKey: key })
      }
    },
  })
}
