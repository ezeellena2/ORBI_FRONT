import { describe, expect, it } from 'vitest'
import es from '@/shared/i18n/locales/es-AR/flota.json'
import en from '@/shared/i18n/locales/en/flota.json'
import {
  ESTADOS_CONEXION,
  claveDeAyudaDeConexion,
  claveDeAyudaDeConexionDeEquipo,
  claveDeConexion,
  claveDeVacioPorFiltroDeConexion,
  claveDeVacioPorFiltroDeConexionDeEquipo,
} from './vocabulario-conexion'
import { VALORES_SITUACION_VEHICULO, claveDeSituacion } from './vocabulario-situacion'

/**
 * REGRESION. `npm run lint` corre `verificar-i18n.mjs`, que compara **es-AR contra en** y falla si
 * los conteos no son parejos. Eso NO cubre el modo de falla de este slice: una clave que el
 * vocabulario PRODUCE y que no existe en ningun idioma esta parejamente ausente, asi que el
 * verificador la deja pasar, `t()` devuelve la clave cruda y el usuario ve `conexion.ayuda.sin_dato`
 * en la celda donde tenia que leer por que su vehiculo no reporta.
 *
 * Es exactamente el defecto que ya se cobro una vez en este modulo (`resolucion-de-errores.test.ts`:
 * typecheck, lint, build y tests en verde mientras la UI mostraba texto crudo). Estas funciones
 * construyen claves por concatenacion (`estadoConexion.${estado}`), asi que el compilador tampoco
 * las ve: la unica red posible es resolverlas contra los JSON reales.
 *
 * ⚠️ Se verifican los DOS idiomas por separado y a proposito. La paridad de conteo del linter no
 * implica que sea la MISMA clave la que esta de los dos lados.
 */

/** Resuelve `a.b.c` contra el JSON del locale. `undefined` = la clave no existe. */
function resolver(diccionario: unknown, clave: string): unknown {
  return clave
    .split('.')
    .reduce<unknown>(
      (nodo, tramo) =>
        typeof nodo === 'object' && nodo !== null
          ? (nodo as Record<string, unknown>)[tramo]
          : undefined,
      diccionario,
    )
}

const LOCALES = [
  ['es-AR', es],
  ['en', en],
] as const

/** Toda clave del vocabulario tiene que resolver a un STRING, no a un objeto intermedio. */
function esperarTexto(clave: string) {
  for (const [idioma, diccionario] of LOCALES) {
    const valor = resolver(diccionario, clave)
    expect(typeof valor, `${clave} falta o no es texto en ${idioma}`).toBe('string')
    expect((valor as string).length, `${clave} esta vacia en ${idioma}`).toBeGreaterThan(0)
  }
}

describe('las claves del vocabulario de CONEXION existen en los 2 idiomas', () => {
  it('etiqueta del badge de los 4 codigos', () => {
    for (const estado of ESTADOS_CONEXION) esperarTexto(claveDeConexion(estado))
  })

  it('explicacion de una linea de los 4 codigos (la que impide leer `sin_dato` como "se desconecto")', () => {
    for (const estado of ESTADOS_CONEXION) esperarTexto(claveDeAyudaDeConexion(estado))
  })

  it('las 2 explicaciones propias del EQUIPO, instalado y no instalado', () => {
    // `incompleto` cae al copy de vehiculo a proposito (es inalcanzable para un dispositivo, B-32):
    // el barrido igual lo pasa por aca para que esa caida quede anclada.
    for (const estado of ESTADOS_CONEXION) {
      for (const instalado of [true, false]) {
        esperarTexto(claveDeAyudaDeConexionDeEquipo(estado, instalado))
      }
    }
  })

  it('los motivos de lista vacia por filtro de conexion, en los 2 listados', () => {
    for (const estado of ESTADOS_CONEXION) {
      for (const hayOtros of [true, false]) {
        const deVehiculo = claveDeVacioPorFiltroDeConexion(estado, hayOtros)
        const deEquipo = claveDeVacioPorFiltroDeConexionDeEquipo(estado, hayOtros)

        // `null` = el vacio no se le atribuye a la conexion; no hay clave que verificar.
        if (deVehiculo !== null) esperarTexto(deVehiculo)
        if (deEquipo !== null) esperarTexto(deEquipo)
      }
    }
  })

  /**
   * La tarjeta "Ubicación actual" de la ficha del vehículo (`TabInfoGeneral`) es la 3.ª superficie
   * de la trampa del slice, y sus claves son LITERALES —no las produce ninguna función del
   * vocabulario—, así que ni el compilador ni el barrido de arriba las alcanzan.
   *
   * Se anclan acá porque la tarjeta se acaba de reescribir: dibujaba "Sin señal / Todavía no hay
   * datos de telemetría para este vehículo" de forma incondicional (afirmando "nunca reportó" sobre
   * cada vehículo de la flota cuando Telemetría no responde), y al cambiarla quedó apuntando a 2
   * claves que **no existían en ninguno de los 2 idiomas**. `verificar-i18n.mjs` compara es-AR
   * contra en: una clave parejamente ausente pasa el linter, y el usuario lee
   * `detalle.ubicacion.mapaPendiente` crudo en la ficha.
   */
  it('el copy de la tarjeta de ubicacion de la ficha (claves literales, fuera del vocabulario)', () => {
    esperarTexto('detalle.ubicacion.titulo')
    esperarTexto('detalle.ubicacion.ultimaSenal')
    esperarTexto('detalle.ubicacion.mapaPendiente')
    esperarTexto('detalle.ubicacion.enFlotaDesde')
    esperarTexto('detalle.ubicacion.abrirMapa')
  })

  it('el aviso de PARTIAL-DATA, con sus 2 formas plurales', () => {
    // `descripcion` se pide con `count`, asi que i18next resuelve `_one`/`_other`. Verificar
    // `descripcion` a secas daria un falso verde: esa clave no existe ni tiene que existir.
    esperarTexto('conexion.datosParciales.titulo')
    esperarTexto('conexion.datosParciales.descripcion_one')
    esperarTexto('conexion.datosParciales.descripcion_other')
    esperarTexto('conexion.datosParciales.parcial')
  })
})

describe('las claves del vocabulario de SITUACION existen en los 2 idiomas', () => {
  it('etiqueta de los 4 valores', () => {
    for (const situacion of VALORES_SITUACION_VEHICULO) esperarTexto(claveDeSituacion(situacion))
  })
})
