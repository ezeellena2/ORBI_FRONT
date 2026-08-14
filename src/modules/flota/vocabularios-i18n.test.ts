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
import { ESTADOS_MOTOR, claveDeIgnicion, claveDeMotor } from './vocabulario-mapa'

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

describe('las claves del MAPA EN VIVO existen en los 2 idiomas', () => {
  it('las 2 familias que se arman por concatenacion (motor e ignicion)', () => {
    // `claveDeMotor` y `claveDeIgnicion` construyen la clave con un template: ni el compilador ni
    // `verificar-i18n.mjs` las ven, porque una clave ausente en LOS DOS idiomas esta parejamente
    // ausente y pasa el linter. `t()` devolveria `mapa.motor.encendido` crudo en la pantalla.
    for (const motor of ESTADOS_MOTOR) esperarTexto(claveDeMotor(motor))

    for (const ignicion of [true, false]) {
      const clave = claveDeIgnicion(ignicion)
      expect(clave, 'ignicion booleana siempre tiene clave').not.toBeNull()
      esperarTexto(clave as string)
    }
  })

  it('`claveDeIgnicion(null)` NO devuelve clave: la pantalla imprime dato ausente', () => {
    // Es la regla, no un hueco de traduccion: `null` no es "apagada".
    expect(claveDeIgnicion(null)).toBeNull()
  })

  /**
   * El resto del copy del mapa son claves LITERALES escritas en el JSX, asi que tampoco las alcanza
   * el barrido de arriba. Se enumeran a mano por la misma razon que las de la tarjeta de ubicacion
   * de la ficha: la pantalla es nueva y una clave inventada de este lado no la caza ningun gate.
   */
  it('el copy literal de la pantalla, panel por panel', () => {
    const claves = [
      'mapa.titulo',
      'mapa.subtitulo',
      'mapa.actualizando',
      'mapa.sinPatente',

      'mapa.sinAcceso.titulo',
      'mapa.sinAcceso.descripcion',
      'mapa.sinAcceso.volver',

      'mapa.panel.titulo',
      'mapa.panel.colapsar',
      'mapa.panel.expandir',
      'mapa.panel.buscarEtiqueta',
      'mapa.panel.buscar',
      // Se piden con `count`, asi que i18next resuelve `_one`/`_other`: verificar la clave a secas
      // daria un falso verde porque esa clave no existe ni tiene que existir.
      'mapa.panel.enElMapa_one',
      'mapa.panel.enElMapa_other',
      // Lo que el filtro recorta se dice APARTE del "en el mapa", para que el contador de arriba y
      // el aviso de "fuera del mapa" compartan denominador y la resta cierre.
      'mapa.panel.coinciden_one',
      'mapa.panel.coinciden_other',
      // La linea que ata la busqueda vacia con los vehiculos sin posicion: sin ella, buscar una
      // patente que existe pero no reporta contesta "ningun vehiculo coincide", que se lee como
      // "esa patente no existe".
      'mapa.panel.quizaFueraDelMapa_one',
      'mapa.panel.quizaFueraDelMapa_other',
      'mapa.panel.vacioSinResultados',
      'mapa.panel.limpiar',

      'mapa.chip.sinConductor',
      'mapa.chip.conductorSinNombre',

      'mapa.fueraDelMapa.siempre',
      'mapa.fueraDelMapa.titulo_one',
      'mapa.fueraDelMapa.titulo_other',
      'mapa.fueraDelMapa.descripcion',
      'mapa.fueraDelMapa.cta',

      'mapa.vacioSinDatos.titulo',
      'mapa.vacioSinDatos.descripcion',
      'mapa.vacioSinDatos.ctaVehiculos',
      'mapa.vacioSinDatos.ctaAlta',

      'mapa.vacioSinPosicion.titulo_one',
      'mapa.vacioSinPosicion.titulo_other',
      'mapa.vacioSinPosicion.descripcion',
      'mapa.vacioSinPosicion.cta',

      // El TERCER vacio: no se cuantos vehiculos hay. Su ausencia era lo que hacia que un conteo
      // fallado cayera en "Aun no hay vehiculos para mostrar en el mapa" + "Agregar primer
      // vehiculo", sobre una organizacion que ya tiene flota.
      'mapa.vacioTotalDesconocido.titulo',
      'mapa.vacioTotalDesconocido.descripcion',
      'mapa.vacioTotalDesconocido.cta',

      'mapa.error.titulo',
      'mapa.error.tituloRefresco',
      'mapa.error.reintentar',

      'mapa.enlace.titulo',
      'mapa.enlace.descripcion',
      'mapa.enlace.entendido',

      'mapa.detalle.cerrar',
      'mapa.detalle.abrirFicha',
      'mapa.detalle.snapshot',
      'mapa.detalle.tabs.actual',
      'mapa.detalle.tabs.recorrido',
      'mapa.detalle.ubicacion.titulo',
      'mapa.detalle.ubicacion.coordenadas',
      'mapa.detalle.ubicacion.altitud',
      'mapa.detalle.ubicacion.reportada',
      'mapa.detalle.telemetria.titulo',
      'mapa.detalle.telemetria.velocidad',
      'mapa.detalle.telemetria.rumbo',
      'mapa.detalle.telemetria.motor',
      'mapa.detalle.telemetria.ignicion',
      'mapa.detalle.telemetria.odometro',
      'mapa.detalle.conductor.titulo',
      'mapa.detalle.error.titulo',
      'mapa.detalle.error.reintentar',

      // La pestaña "Recorrido" DECLARA que no tiene fuente y no emite ningun request (B-9): su copy
      // es lo unico que el usuario recibe, asi que faltar de un idioma lo deja sin explicacion.
      'mapa.recorrido.titulo',
      'mapa.recorrido.descripcion',

      'mapa.unidades.kmh',
      'mapa.unidades.km',
      'mapa.unidades.grados',
      'mapa.unidades.metros',
    ]

    for (const clave of claves) esperarTexto(clave)
  })
})
