import { describe, expect, it } from 'vitest'
import { fusionarDetalleTrasPatch } from './fusion-detalle-vehiculo'
import type { VehiculoDetalleDto } from '@/services/contracts/flota'

/**
 * REGRESION — "guardar una edicion apagaba el badge de conexion".
 *
 * `VehiculoFlotaService.Actualizar` cierra con `MapearDetalle(vehiculo, vigente)`, **sin** el tercer
 * argumento `upstream`, mientras que `ObtenerPorId` llama antes a `ObtenerEstadoDeUnVehiculo`. Con
 * `upstream = null`, `MapeoEstadoConexion.Mapear(null)` devuelve `sin_dato` y `UltimaSenal` queda en
 * `null`: la respuesta del `PATCH` **no es autoritativa** para esos 2 campos.
 *
 * El `onSuccess` pisaba la entrada de cache con esa respuesta, asi que un vehiculo que la ficha
 * mostraba "En linea · 45 km/h" pasaba a "Sin dato" —en el hero y en la tarjeta de ubicacion— hasta
 * que aterrizara el refetch de la invalidacion. Con el refetch pausado (backend caido, pestania sin
 * red) se quedaba asi.
 *
 * Misma clase que D-S5-1 del backend (la cache del mapa servia "En linea" sobre una posicion vieja),
 * producida del lado del cliente por un atajo de cache.
 */

const ESTADO_VIVO: VehiculoDetalleDto = {
  id: 'a1',
  vehiculoCanonicoId: 'c1',
  alias: 'Camioneta 1',
  patente: 'AB123CD',
  marca: 'Ford',
  modelo: 'Transit',
  anio: 2024,
  tipo: 'utilitario',
  dispositivo: null,
  conductorPrincipal: null,
  conductoresCount: 0,
  estadoOperativo: 'operativo',
  estado: 'en_linea',
  ultimaSenal: { fechaUtc: '2026-08-14T12:00:00Z', velocidadKmH: 45, ignicion: true },
  fechaCreacion: '2026-01-02T10:00:00Z',
  activo: true,
  vin: null,
  color: null,
  combustible: null,
  kilometrajeActual: 10_000,
  notasOperativas: null,
  conductoresAsignados: [],
  geozonasAsignadas: [],
  fechaActualizacion: '2026-08-01T10:00:00Z',
  creadoPorUsuarioId: null,
  modificadoPorUsuarioId: null,
  creadoPorNombre: null,
  modificadoPorNombre: null,
}

/** Lo que devuelve el `PATCH`: el kilometraje nuevo, y los 2 compuestos SIN componer. */
const RESPUESTA_PATCH: VehiculoDetalleDto = {
  ...ESTADO_VIVO,
  kilometrajeActual: 12_500,
  estado: 'sin_dato',
  ultimaSenal: null,
  fechaActualizacion: '2026-08-14T12:30:00Z',
}

describe('fusionarDetalleTrasPatch', () => {
  it('conserva el estado de conexion compuesto: el PATCH no lo compone y lo apagaria', () => {
    expect(fusionarDetalleTrasPatch(ESTADO_VIVO, RESPUESTA_PATCH).estado).toBe('en_linea')
  })

  it('conserva la ultima senal: viene null en la respuesta del PATCH, no porque no exista', () => {
    expect(fusionarDetalleTrasPatch(ESTADO_VIVO, RESPUESTA_PATCH).ultimaSenal).toEqual(
      ESTADO_VIVO.ultimaSenal,
    )
  })

  it('toma del PATCH todo lo demas, que si es autoritativo', () => {
    const fusionado = fusionarDetalleTrasPatch(ESTADO_VIVO, RESPUESTA_PATCH)

    expect(fusionado.kilometrajeActual).toBe(12_500)
    expect(fusionado.fechaActualizacion).toBe('2026-08-14T12:30:00Z')
  })

  it('sin entrada previa en cache escribe la respuesta tal cual: no hay composicion que conservar', () => {
    expect(fusionarDetalleTrasPatch(undefined, RESPUESTA_PATCH)).toEqual(RESPUESTA_PATCH)
  })
})
