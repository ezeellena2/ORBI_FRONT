import type { VehiculoDetalleDto } from '@/services/contracts/flota'

/**
 * Que se guarda en la cache del detalle despues de un `PATCH` exitoso.
 *
 * ── POR QUE ES UN MERGE Y NO UN REEMPLAZO ─────────────────────────────────────────────────────
 * La respuesta del `PATCH` **no es autoritativa para los 2 campos compuestos**.
 * `VehiculoFlotaService.Actualizar` cierra con `MapearDetalle(vehiculo, vigente)`, o sea **sin** el
 * tercer argumento `upstream`, mientras que `ObtenerPorId` sí llama antes a
 * `ObtenerEstadoDeUnVehiculo`. Con `upstream = null`, `MapeoEstadoConexion.Mapear(null)` devuelve
 * `sin_dato` y `UltimaSenal` queda en `null`.
 *
 * Pisar la entrada de cache con esa respuesta hacia que **guardar una edicion apagara el badge de
 * conexion**: un vehiculo que la ficha mostraba "En linea · 45 km/h" pasaba a "Sin dato" —en el hero
 * y en la tarjeta de ubicacion— hasta que aterrizara el refetch de la invalidacion; y con el refetch
 * pausado (backend caido, pestania sin red) se quedaba asi. Es la mentira que este modulo corrige en
 * todas las demas superficies, producida por un atajo de cache.
 *
 * Se conservan `estado` y `ultimaSenal` de lo que ya habia —la ultima composicion REAL— y se toma
 * del `PATCH` todo lo demas, que si es autoritativo (kilometraje, alias, notas, `fechaActualizacion`
 * y la identidad canonica, que `Actualizar` relee con `ObtenerVigentePorClave`).
 *
 * ── VIVE ACA Y NO EN EL HOOK, A PROPOSITO ─────────────────────────────────────────────────────
 * Los tests de este repo son de logica pura (`environment: node`): una regla escrita dentro del
 * `onSuccess` no se puede ejercer, y **importar el hook desde un test arrastra**
 * `vehiculos-service` -> `http-client` -> i18n, que toca `document` y revienta el runner. Un modulo
 * sin mas dependencia que el tipo es lo unico anclable.
 *
 * `anterior === undefined` = no habia ficha en cache (nadie la esta mirando): no hay composicion que
 * conservar, se escribe la respuesta tal cual —que es lo que pasaba antes en todos los casos— y la
 * invalidacion posterior la corrige.
 */
export function fusionarDetalleTrasPatch(
  anterior: VehiculoDetalleDto | undefined,
  respuesta: VehiculoDetalleDto,
): VehiculoDetalleDto {
  if (anterior === undefined) return respuesta

  return { ...respuesta, estado: anterior.estado, ultimaSenal: anterior.ultimaSenal }
}
