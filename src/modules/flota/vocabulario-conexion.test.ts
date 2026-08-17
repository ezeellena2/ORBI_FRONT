import { describe, expect, it } from 'vitest'
import type { EstadoConexion } from '@/services/contracts/flota'
import {
  ESTADOS_CONEXION,
  VALORES_FILTRO_CONEXION,
  claveDeAyudaDeConexion,
  claveDeAyudaDeConexionDeEquipo,
  claveDeConexion,
  claveDeVacioPorFiltroDeConexion,
  claveDeVacioPorFiltroDeConexionDeEquipo,
  coberturaDeConexion,
  hayFuenteDeConexion,
  lecturaDeUltimaSenal,
  varianteDeConexion,
} from './vocabulario-conexion'

/**
 * El vocabulario de conexion es la regla mas facil de romper de este slice y la mas cara: `sin_dato`
 * y `desconectado` conviven en la misma columna, se ven casi igual y significan cosas opuestas.
 * Por eso se testea la funcion pura y no el render — es donde vive la regla.
 */

describe('sin_dato NO es desconectado', () => {
  it('solo `en_linea` y `desconectado` salen de un dato real del upstream', () => {
    // `sin_dato` es AUSENCIA de fila upstream: GPS en stock, vehiculo sin GPS, o Telemetria caida.
    // Con `false` la UI no puede afirmar nada sobre el equipo.
    expect(hayFuenteDeConexion('en_linea')).toBe(true)
    expect(hayFuenteDeConexion('desconectado')).toBe(true)
    expect(hayFuenteDeConexion('sin_dato')).toBe(false)
    expect(hayFuenteDeConexion('incompleto')).toBe(false)
  })

  it('`sin_dato` NUNCA se pinta como falla: es neutro, no peligro', () => {
    // Si `sin_dato` fuera rojo, una caida de Telemetria pintaria la flota entera de rojo y el
    // operador llamaria al proveedor de GPS por una flota que esta bien.
    expect(varianteDeConexion('sin_dato')).toBe('neutro')
    expect(varianteDeConexion('desconectado')).toBe('peligro')
    expect(varianteDeConexion('sin_dato')).not.toBe(varianteDeConexion('desconectado'))
  })

  it('cada codigo tiene etiqueta Y explicacion: la etiqueta sola no distingue los dos casos', () => {
    for (const estado of ESTADOS_CONEXION) {
      expect(claveDeConexion(estado)).toBe(`estadoConexion.${estado}`)
      expect(claveDeAyudaDeConexion(estado)).toBe(`conexion.ayuda.${estado}`)
    }
  })
})

describe('la columna "Ultima senal" no afirma nada cuando falta el dato', () => {
  it('sin fila upstream se rinde con el MISMO vocabulario que el badge, sin copy propio', () => {
    // `ultimaSenal === null` significa exactamente "no hubo fila upstream" (`MapearItem` la
    // construye con `upstream is null ? null : ...`, de la misma respuesta de la que sale `estado`).
    // Esa ausencia llega por 3 caminos que el DTO no distingue, asi que la columna no puede elegir
    // uno. Un copy propio para esta celda es como se reintroduce la mentira: "Sin senal aun" elige
    // "nunca reporto" y, con Telemetria caida, se lo afirma a la flota entera.
    const lectura = lecturaDeUltimaSenal(null)

    expect(lectura.tipo).toBe('sin_dato')
    if (lectura.tipo !== 'sin_dato') return
    expect(lectura.clave).toBe(claveDeConexion('sin_dato'))
    expect(lectura.claveAyuda).toBe(claveDeAyudaDeConexion('sin_dato'))
  })

  it('NUNCA usa el vocabulario de `desconectado`: la ausencia no es un corte', () => {
    const lectura = lecturaDeUltimaSenal(undefined)

    expect(lectura.tipo).toBe('sin_dato')
    if (lectura.tipo !== 'sin_dato') return
    expect(lectura.clave).not.toBe(claveDeConexion('desconectado'))
    expect(lectura.claveAyuda).not.toBe(claveDeAyudaDeConexion('desconectado'))
  })

  it('con fecha devuelve la fecha tal cual: el formato relativo es de la celda, no del vocabulario', () => {
    const lectura = lecturaDeUltimaSenal('2026-08-13T10:15:00Z')

    expect(lectura.tipo).toBe('fecha')
    if (lectura.tipo !== 'fecha') return
    expect(lectura.fechaUtc).toBe('2026-08-13T10:15:00Z')
  })
})

describe('valores que un filtro puede ofrecer', () => {
  it('NO ofrece `incompleto`: hoy devuelve lista vacia en los 2 listados', () => {
    // Vehiculos: ninguna capa lo emite (B-31). Dispositivos: es inalcanzable por construccion
    // (B-32). Un chip que siempre da cero resultados le hace concluir al usuario que no tiene
    // vehiculos sin GPS, cuando el problema es que Flota todavia no sabe decirlo.
    expect(VALORES_FILTRO_CONEXION).not.toContain('incompleto')
    expect(VALORES_FILTRO_CONEXION).toEqual(['en_linea', 'desconectado', 'sin_dato'])
  })

  it('el vocabulario completo si tiene los 4: el filtro ofrece menos que el tipo, a proposito', () => {
    // Cuando el PO cierre B-31/B-32, `VALORES_FILTRO_CONEXION` crece y los filtros empiezan a
    // matchear sin tocar nada mas. El tipo no cambia.
    expect(ESTADOS_CONEXION).toHaveLength(4)
    expect(ESTADOS_CONEXION).toContain('incompleto')
    expect(VALORES_FILTRO_CONEXION.length).toBeLessThan(ESTADOS_CONEXION.length)
  })
})

describe('cobertura de conexion de lo que se esta viendo', () => {
  it('cuenta filas con y sin fuente', () => {
    const pagina: EstadoConexion[] = ['en_linea', 'desconectado', 'sin_dato', 'sin_dato']
    const cobertura = coberturaDeConexion(pagina)

    expect(cobertura.total).toBe(4)
    expect(cobertura.conFuente).toBe(2)
    expect(cobertura.sinFuente).toBe(2)
    expect(cobertura.ningunaConFuente).toBe(false)
  })

  it('marca el aviso de datos parciales solo si NINGUNA fila tiene fuente', () => {
    expect(coberturaDeConexion(['sin_dato', 'sin_dato']).ningunaConFuente).toBe(true)
    expect(coberturaDeConexion(['sin_dato', 'en_linea']).ningunaConFuente).toBe(false)
  })

  it('una lista VACIA no dispara el aviso: sin filas no hay nada que declarar parcial', () => {
    // Es el empty-state del listado, no un problema de fuente. Mezclarlos pondria un cartel de
    // "datos parciales" arriba de "todavia no cargaste vehiculos".
    expect(coberturaDeConexion([]).ningunaConFuente).toBe(false)
    expect(coberturaDeConexion(undefined).total).toBe(0)
    expect(coberturaDeConexion(undefined).ningunaConFuente).toBe(false)
  })
})

describe('por que la lista quedo vacia con un filtro de conexion', () => {
  it('filtrar por `en_linea` sin fuente tiene su propia explicacion, no "no coincide con tus filtros"', () => {
    // Con Telemetria caida TODO vale `sin_dato`, asi que `estado=en_linea` devuelve vacio. Decir
    // solo "ningun vehiculo coincide" es cierto y enganoso: los vehiculos estan.
    expect(claveDeVacioPorFiltroDeConexion('en_linea')).toBe('conexion.vacio.sinFuente')
    expect(claveDeVacioPorFiltroDeConexion('desconectado')).toBe('conexion.vacio.sinFuente')
  })

  it('`incompleto` tiene su propio motivo: no lo emite nadie (B-31)', () => {
    expect(claveDeVacioPorFiltroDeConexion('incompleto')).toBe('conexion.vacio.incompleto')
  })

  it('sin filtro —o filtrando por `sin_dato`— el vacio no lo causa la conexion', () => {
    // `sin_dato` es justamente el valor que SI matchea cuando no hay fuente: si eso da vacio, es
    // por los otros filtros.
    expect(claveDeVacioPorFiltroDeConexion('')).toBeNull()
    expect(claveDeVacioPorFiltroDeConexion('sin_dato')).toBeNull()
  })

  it('con OTRO filtro puesto no se atribuye el vacio a la conexion', () => {
    // Con una patente tipeada ademas del chip, el vacio puede ser de la patente. La lista vacia no
    // trae filas que mirar, asi que la pantalla no puede saber cual de los dos la vacio: afirmar la
    // causa seria inventarla. Se vuelve al copy generico, que no afirma ninguna.
    expect(claveDeVacioPorFiltroDeConexion('en_linea', true)).toBeNull()
    expect(claveDeVacioPorFiltroDeConexion('desconectado', true)).toBeNull()
  })

  it('`incompleto` conserva su motivo aunque haya otros filtros', () => {
    // Es el unico caso que NO depende de los datos: ninguna capa emite ese codigo (B-31), asi que
    // el cero es seguro, con o sin otro filtro puesto.
    expect(claveDeVacioPorFiltroDeConexion('incompleto', true)).toBe('conexion.vacio.incompleto')
  })

  it('el listado de EQUIPOS usa el mismo criterio con su propio sujeto', () => {
    // Misma regla, distinto copy: "ningun equipo" y no "ningun vehiculo". Si divergiera la REGLA
    // (no el sujeto) las dos pantallas explicarian el mismo vacio de dos maneras distintas.
    expect(claveDeVacioPorFiltroDeConexionDeEquipo('en_linea')).toBe('conexion.vacioEquipo.sinFuente')
    expect(claveDeVacioPorFiltroDeConexionDeEquipo('en_linea', true)).toBeNull()
    expect(claveDeVacioPorFiltroDeConexionDeEquipo('sin_dato')).toBeNull()
    expect(claveDeVacioPorFiltroDeConexionDeEquipo('')).toBeNull()
  })
})

describe('`sin_dato` de un EQUIPO no instalado es lo esperable, no una falla', () => {
  it('un GPS sin vehiculo tiene su propia explicacion', () => {
    // La trampa del slice: un equipo `en_stock` NUNCA aparece en la fuente batch de Telemetria, asi
    // que su `sin_dato` es por AUSENCIA. Con el copy generico ("no llego senal"), un inventario de
    // repuestos se lee como un inventario roto.
    expect(claveDeAyudaDeConexionDeEquipo('sin_dato', false)).toBe(
      'conexion.ayudaEquipo.sinDatoNoInstalado',
    )
    expect(claveDeAyudaDeConexionDeEquipo('sin_dato', true)).toBe('conexion.ayudaEquipo.sinDato')
    expect(claveDeAyudaDeConexionDeEquipo('sin_dato', false)).not.toBe(
      claveDeAyudaDeConexionDeEquipo('sin_dato', true),
    )
  })

  it('`en_linea` y `desconectado` se explican igual que en vehiculos: son afirmaciones del upstream', () => {
    // Duplicar ese copy seria dos verdades del mismo hecho. Lo que cambia con el sujeto es la
    // AUSENCIA, no la afirmacion.
    for (const instalado of [true, false]) {
      expect(claveDeAyudaDeConexionDeEquipo('en_linea', instalado)).toBe(
        claveDeAyudaDeConexion('en_linea'),
      )
      expect(claveDeAyudaDeConexionDeEquipo('desconectado', instalado)).toBe(
        claveDeAyudaDeConexion('desconectado'),
      )
    }
  })

  it('un equipo no instalado NUNCA se pinta como falla', () => {
    // La variante no depende del sujeto: `sin_dato` es neutro para los 3 listados.
    expect(varianteDeConexion('sin_dato')).toBe('neutro')
  })
})
