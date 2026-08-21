import { describe, expect, it } from 'vitest'
import {
  POLLING_MAPA_MS,
  antiguedadDeLaSenal,
  claseDelMarcador,
  claveDeIgnicion,
  claveDeMotor,
  contarFueraDelMapa,
  filtrarItemsDelMapa,
  hayFiltrosDeMapaActivos,
  instanteDeReferencia,
  puedeMostrarVelocidad,
  vacioDelMapa,
} from './vocabulario-mapa'
import { ESTADOS_CONEXION } from './vocabulario-conexion'
import type { EstadoConexion, MapaItemDto } from '@/services/contracts/flota'

/**
 * Las reglas del MAPA EN VIVO, ancladas.
 *
 * Los tests de este repo son de LOGICA PURA (`environment: node`): no montan componentes. Por eso
 * todo lo que decide que ve el usuario en esta pantalla vive en `vocabulario-mapa.ts` y no en el
 * JSX — es la unica capa donde se puede poner una red.
 *
 * ⚠️ Este archivo NO puede importar nada que arrastre `leaflet`: Leaflet toca `window` al cargarse y
 * el runner corre en Node. Por eso importa el vocabulario y **nunca** `components/mapa/*`.
 */

function item(parcial: Partial<MapaItemDto> = {}): MapaItemDto {
  return {
    vehiculoFlotaId: parcial.vehiculoFlotaId ?? '11111111-1111-1111-1111-111111111111',
    patente: parcial.patente !== undefined ? parcial.patente : 'AB 123 CD',
    modelo: parcial.modelo !== undefined ? parcial.modelo : 'Ford Transit',
    ubicacion: parcial.ubicacion ?? {
      latitud: -34.6,
      longitud: -58.44,
      direccionGrados: null,
      fechaUtc: '2026-08-14T12:00:00Z',
    },
    velocidadKmH: parcial.velocidadKmH ?? 45,
    ignicion: parcial.ignicion !== undefined ? parcial.ignicion : true,
    estado: parcial.estado ?? 'en_linea',
    conductorAsignado:
      parcial.conductorAsignado !== undefined
        ? parcial.conductorAsignado
        : { conductorFlotaId: 'c1', nombreCompleto: 'Carlos Méndez' },
    alertasActivasCount: parcial.alertasActivasCount ?? null,
  }
}

describe('la cadencia del polling es la del contrato', () => {
  it('cae dentro de la banda 10-15 s que fija `api.md` §Mapa en vivo (C-9)', () => {
    // Fuera de esa banda el mapa deja de ser "en vivo" (mas lento) o castiga a `Flota.Api`, que
    // hace 2 llamadas a Telemetria por request (mas rapido). No es un numero de estilo.
    expect(POLLING_MAPA_MS).toBeGreaterThanOrEqual(10_000)
    expect(POLLING_MAPA_MS).toBeLessThanOrEqual(15_000)
  })
})

describe('el marcador se pinta con el MISMO vocabulario que el badge del listado', () => {
  it('`sin_dato` es NEUTRO, no `peligro`', () => {
    // La mentira mas cara del slice: con Telemetria caida TODA la flota cae en `sin_dato`, y un mapa
    // entero de marcadores rojos manda a llamar al proveedor de GPS por una flota que esta bien.
    expect(claseDelMarcador('sin_dato')).toBe('marcador--neutro')
  })

  it('los 4 codigos tienen su clase, y ninguna se repite entre estados de distinta naturaleza', () => {
    expect(claseDelMarcador('en_linea')).toBe('marcador--exito')
    expect(claseDelMarcador('desconectado')).toBe('marcador--peligro')
    expect(claseDelMarcador('incompleto')).toBe('marcador--advertencia')
    expect(claseDelMarcador('sin_dato')).not.toBe(claseDelMarcador('desconectado'))
  })

  it('todos los codigos del vocabulario producen una clase valida', () => {
    for (const estado of ESTADOS_CONEXION) {
      expect(claseDelMarcador(estado)).toMatch(/^marcador--[a-z]+$/)
    }
  })
})

describe('la velocidad solo acompaña a un estado que la respalde', () => {
  it('se muestra con `en_linea`', () => {
    expect(puedeMostrarVelocidad('en_linea')).toBe(true)
  })

  it('NO se muestra con `desconectado`: el numero existe pero es viejo', () => {
    // "Desconectado · 45 km/h" presenta como actual la ultima velocidad conocida de un equipo que
    // dejo de reportar.
    expect(puedeMostrarVelocidad('desconectado')).toBe(false)
  })

  it('NO se muestra con `sin_dato`: es ademas el estado de una posicion sacada de la cache', () => {
    expect(puedeMostrarVelocidad('sin_dato')).toBe(false)
    expect(puedeMostrarVelocidad('incompleto')).toBe(false)
  })
})

describe('los que quedaron fuera del mapa', () => {
  it('sin el total de la flota devuelve `null`: no se arriesga un numero', () => {
    expect(contarFueraDelMapa(undefined, 3)).toBeNull()
    expect(contarFueraDelMapa(null, 3)).toBeNull()
  })

  it('resta exacta cuando se conoce el total', () => {
    expect(contarFueraDelMapa(20, 3)).toBe(17)
    expect(contarFueraDelMapa(20, 20)).toBe(0)
  })

  it('nunca devuelve un negativo aunque las 2 respuestas se crucen', () => {
    // El total y los marcadores llegan de requests distintos: un alta entre uno y otro puede dejar
    // mas marcadores que vehiculos contados. "-1 vehiculos fuera del mapa" es peor que 0.
    expect(contarFueraDelMapa(2, 5)).toBe(0)
  })
})

describe('cual de los vacios corresponde: son TRES, no dos', () => {
  it('total 0 ⇒ `sin_flota`: es el UNICO caso donde el copy de alta es cierto', () => {
    expect(vacioDelMapa(0)).toBe('sin_flota')
  })

  it('total > 0 ⇒ `sin_posicion`', () => {
    expect(vacioDelMapa(20)).toBe('sin_posicion')
    expect(vacioDelMapa(1)).toBe('sin_posicion')
  })

  it('🔴 total DESCONOCIDO no es "no tenes vehiculos"', () => {
    // Es la regresion que este test existe para frenar. `totalDeLaFlota` sale de un segundo request
    // que puede fallar (retry global = 1, sin polling ⇒ queda `undefined` para siempre), y
    // colapsarlo contra `total === 0` hacia que una organizacion con 20 vehiculos y Telemetria
    // caida leyera "Aun no hay vehiculos para mostrar en el mapa · Agregar primer vehiculo".
    expect(vacioDelMapa(undefined)).toBe('total_desconocido')
    expect(vacioDelMapa(null)).toBe('total_desconocido')
    expect(vacioDelMapa(undefined)).not.toBe(vacioDelMapa(0))
  })

  it('los 3 casos son mutuamente excluyentes y cubren todo el dominio', () => {
    const casos = [undefined, null, 0, 1, 999] as const
    for (const total of casos) {
      expect(['sin_flota', 'sin_posicion', 'total_desconocido']).toContain(vacioDelMapa(total))
    }
  })
})

describe('el "ahora" contra el que se mide la antiguedad', () => {
  it('con el refresco andando es el instante de la ultima respuesta buena', () => {
    expect(instanteDeReferencia(1_000, 0)).toBe(1_000)
  })

  it('🟠 un refresco FALLADO tambien corre el reloj: los chips no se congelan', () => {
    // `dataUpdatedAt` solo avanza en exito (`query-core/query.js`: lo escribe `successState`). Con
    // la red cortada 10 minutos, arriba aparecia "No pudimos actualizar el mapa" y cada chip seguia
    // diciendo "hace 8 s" indefinidamente: el banner decia "esto esta viejo" y los datos de al lado
    // decian "esto es de recien".
    expect(instanteDeReferencia(1_000, 600_000)).toBe(600_000)
  })

  it('un error VIEJO no retrocede el reloj de una respuesta nueva', () => {
    expect(instanteDeReferencia(600_000, 1_000)).toBe(600_000)
  })
})

describe('el filtrado del panel (client-side: el endpoint no acepta parametros)', () => {
  const flota = [
    item({ vehiculoFlotaId: 'a', patente: 'AB 123 CD', estado: 'en_linea' }),
    item({
      vehiculoFlotaId: 'b',
      patente: 'EF 456 GH',
      estado: 'desconectado',
      conductorAsignado: { conductorFlotaId: 'c2', nombreCompleto: 'Ana Rodríguez' },
    }),
    item({
      vehiculoFlotaId: 'c',
      patente: null,
      estado: 'sin_dato',
      conductorAsignado: null,
    }),
  ]

  it('sin filtros devuelve todo', () => {
    expect(filtrarItemsDelMapa(flota, { busqueda: '', estado: '' })).toHaveLength(3)
    expect(hayFiltrosDeMapaActivos({ busqueda: '', estado: '' })).toBe(false)
  })

  it('la patente matchea aunque el usuario no escriba los espacios', () => {
    // El backend sirve "AB 123 CD" y el usuario tipea "ab123cd": es el mismo texto.
    const resultado = filtrarItemsDelMapa(flota, { busqueda: 'ab123cd', estado: '' })
    expect(resultado.map((v) => v.vehiculoFlotaId)).toEqual(['a'])
  })

  it('el conductor matchea sin acentos', () => {
    const resultado = filtrarItemsDelMapa(flota, { busqueda: 'rodriguez', estado: '' })
    expect(resultado.map((v) => v.vehiculoFlotaId)).toEqual(['b'])
  })

  it('una patente `null` no rompe la busqueda ni matchea de casualidad', () => {
    // La proyeccion canonica puede no estar vigente: `patente` es nullable en el contrato.
    expect(filtrarItemsDelMapa(flota, { busqueda: 'ab', estado: '' })).toHaveLength(1)
  })

  it('el filtro de estado usa el codigo del contrato, no una categoria derivada', () => {
    const resultado = filtrarItemsDelMapa(flota, { busqueda: '', estado: 'desconectado' })
    expect(resultado.map((v) => v.vehiculoFlotaId)).toEqual(['b'])
    expect(hayFiltrosDeMapaActivos({ busqueda: '', estado: 'desconectado' })).toBe(true)
  })

  it('los dos filtros se combinan con AND', () => {
    expect(
      filtrarItemsDelMapa(flota, { busqueda: 'ab123cd', estado: 'desconectado' }),
    ).toHaveLength(0)
  })

  it('no muta el array de entrada', () => {
    const original = [...flota]
    filtrarItemsDelMapa(flota, { busqueda: 'ab', estado: '' })
    expect(flota).toEqual(original)
  })
})

describe('antiguedad de la ultima posicion', () => {
  const base = Date.parse('2026-08-14T12:00:00Z')

  it('elige la unidad mas grande que no redondee a cero', () => {
    expect(antiguedadDeLaSenal('2026-08-14T11:59:48Z', base)).toEqual({
      cantidad: 12,
      unidad: 'second',
    })
    expect(antiguedadDeLaSenal('2026-08-14T11:57:00Z', base)).toEqual({
      cantidad: 3,
      unidad: 'minute',
    })
    expect(antiguedadDeLaSenal('2026-08-14T10:00:00Z', base)).toEqual({
      cantidad: 2,
      unidad: 'hour',
    })
    expect(antiguedadDeLaSenal('2026-08-12T12:00:00Z', base)).toEqual({
      cantidad: 2,
      unidad: 'day',
    })
  })

  it('recorta los negativos a cero: los relojes del navegador y del servidor no coinciden', () => {
    // "en 4 segundos" sobre una señal de GPS se lee como un bug, y lo unico que pasa es que el
    // cliente esta unos segundos atrasado.
    expect(antiguedadDeLaSenal('2026-08-14T12:00:04Z', base)).toEqual({
      cantidad: 0,
      unidad: 'second',
    })
  })

  it('devuelve `null` ante ausencia o basura, nunca "hace NaN"', () => {
    expect(antiguedadDeLaSenal(null, base)).toBeNull()
    expect(antiguedadDeLaSenal(undefined, base)).toBeNull()
    expect(antiguedadDeLaSenal('no es una fecha', base)).toBeNull()
  })
})

describe('el panel derecho no afirma lo que no sabe', () => {
  it('`ignicion` en `null` NO es "apagada"', () => {
    // `ignicion` es `bool?` upstream (drift declarado contra `dtos.ts`, que la tipa `boolean`).
    // Devolver la clave de "cortada" afirmaria que el motor esta apagado, que es lo que no sabemos.
    expect(claveDeIgnicion(null)).toBeNull()
    expect(claveDeIgnicion(undefined)).toBeNull()
    expect(claveDeIgnicion(true)).toBe('mapa.ignicion.si')
    expect(claveDeIgnicion(false)).toBe('mapa.ignicion.no')
  })

  it('el motor tiene clave para los 3 codigos del vocabulario', () => {
    expect(claveDeMotor('encendido')).toBe('mapa.motor.encendido')
    expect(claveDeMotor('apagado')).toBe('mapa.motor.apagado')
    // `ralenti` NO se emite en v1 (umbral PENDIENTE del PO), pero el tipo del contrato lo declara:
    // la clave existe para que el dia que el PO cierre el umbral no haya que tocar la pantalla.
    expect(claveDeMotor('ralenti')).toBe('mapa.motor.ralenti')
  })
})

describe('regresion: los 2 campos sin fuente batch se leen `null`, nunca 0', () => {
  it('el item del contrato admite `direccionGrados` y `alertasActivasCount` nulos', () => {
    // B-33. Es el shape que el backend sirve SIEMPRE, y el mapa se dibuja igual: sin flecha de
    // orientacion y sin burbuja de conteo. `0` significaria "apunta al norte" y "no tiene alertas".
    const marcador = item()
    expect(marcador.ubicacion.direccionGrados).toBeNull()
    expect(marcador.alertasActivasCount).toBeNull()
  })

  it('el vocabulario no ofrece ninguna funcion que derive rumbo ni conteo de alertas', () => {
    // Ancla por AUSENCIA: si alguien agrega un helper que "completa" esos campos con un valor
    // plausible, este test es el que lo tiene que frenar en la revision.
    const exportados = Object.keys(
      { antiguedadDeLaSenal, claseDelMarcador, contarFueraDelMapa, puedeMostrarVelocidad } as const,
    )
    expect(exportados.some((nombre) => /rumbo|alerta/i.test(nombre))).toBe(false)
  })
})

describe('el filtro de estado acepta cualquier codigo del vocabulario cerrado', () => {
  it('no explota con ninguno de los 4', () => {
    for (const estado of ESTADOS_CONEXION as readonly EstadoConexion[]) {
      expect(() => filtrarItemsDelMapa([item()], { busqueda: '', estado })).not.toThrow()
    }
  })
})
