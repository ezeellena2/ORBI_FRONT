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
import {
  CAPACIDADES_BLOQUEADAS_DEL_CENTRO,
  ESTADOS_ALERTA,
  ESTADOS_ENTREGA_WEBHOOK,
  ESTADOS_PROBLEMA,
  ESTADOS_SLA_PROBLEMA,
  FACTORES_PRIORIDAD,
  MOTIVOS_CONDICION_INVALIDA,
  ORIGENES_SENAL,
  SEVERIDADES_ALERTA,
  SEVERIDADES_PROBLEMA,
  TIPOS_PROBLEMA,
  TIPOS_REGLA_PROBLEMA,
  TIPOS_TIMELINE_PROBLEMA,
  claveDeAccionProblema,
  claveDeAyudaDeFactorPrioridad,
  claveDeEstadoAlerta,
  claveDeEstadoDerivadoDeWebhook,
  claveDeEstadoEntrega,
  claveDeEstadoProblema,
  claveDeEstadoSla,
  claveDeFactorPrioridad,
  claveDeGuiaDeErrorCentro,
  claveDeMotivoCondicionInvalida,
  claveDeOrigenSenal,
  claveDeSeveridadAlerta,
  claveDeSeveridadProblema,
  claveDeTipoProblema,
  claveDeTipoRegla,
  claveDeTipoTimeline,
  estadoDerivadoDeWebhook,
} from './vocabulario-centro-problemas'
import { claveDelVacioDeLaBandeja } from './vocabulario-sala-problemas'
import {
  ACCIONES_DE_REGLA,
  CAMPOS_DSL,
  OPCIONES_DE_PLAZO_MINUTOS,
  OPERADORES_DSL,
  VALORES_DTC_CRITICIDAD,
  claveDeAccionDeRegla,
  claveDeAyudaDeCampoDsl,
  claveDeCampoDsl,
  claveDeOperadorDsl,
  formatoDePlazo,
} from './vocabulario-reglas-problemas'
import {
  ACCIONES_DE_WEBHOOK,
  HEADERS_DE_FIRMA,
  claveDeAccionDeWebhook,
} from './vocabulario-integraciones'
import {
  COLUMNAS_DEL_TABLERO,
  claveDeAyudaDeColumna,
  claveDeColumnaDelTablero,
} from './vocabulario-kanban-problemas'
import { TABS_DEL_TICKET, claveDeTabDelTicket } from './vocabulario-ticket-problema'

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

describe('las claves del CENTRO DE PROBLEMAS existen en los 2 idiomas', () => {
  /**
   * Las 13 familias de abajo se arman por CONCATENACION (`estadoProblema.${estado}`), asi que no las
   * ve ni el compilador ni `verificar-i18n.mjs`: una clave ausente en LOS DOS idiomas esta
   * parejamente ausente y pasa el linter. `t()` devolveria `tipoProblema.dtc_critico` crudo en la
   * celda donde el operador tenia que leer que se le rompio el motor a un vehiculo.
   */
  it('los vocabularios cerrados del contrato, codigo por codigo', () => {
    for (const estado of ESTADOS_PROBLEMA) esperarTexto(claveDeEstadoProblema(estado))
    for (const severidad of SEVERIDADES_PROBLEMA) esperarTexto(claveDeSeveridadProblema(severidad))
    for (const tipo of TIPOS_PROBLEMA) esperarTexto(claveDeTipoProblema(tipo))
    for (const origen of ORIGENES_SENAL) esperarTexto(claveDeOrigenSenal(origen))
    for (const tipo of TIPOS_TIMELINE_PROBLEMA) esperarTexto(claveDeTipoTimeline(tipo))
    for (const tipo of TIPOS_REGLA_PROBLEMA) esperarTexto(claveDeTipoRegla(tipo))
    for (const estado of ESTADOS_ENTREGA_WEBHOOK) esperarTexto(claveDeEstadoEntrega(estado))
    for (const estado of ESTADOS_ALERTA) esperarTexto(claveDeEstadoAlerta(estado))
    for (const severidad of SEVERIDADES_ALERTA) esperarTexto(claveDeSeveridadAlerta(severidad))

    for (const accion of ['asignar', 'silenciar', 'resolver', 'ver_mapa', 'ver_vehiculo'] as const) {
      esperarTexto(claveDeAccionProblema(accion))
    }
  })

  it('los 4 estados de SLA, incluido el que el backend nunca emite', () => {
    // `por_vencer` se traduce igual: el vocabulario es cerrado y el dia que el PO fije el umbral la
    // clave tiene que estar. Lo que NO se dibuja hoy es el badge (ver `ESTADOS_SLA_EMITIDOS`).
    for (const estado of ESTADOS_SLA_PROBLEMA) {
      esperarTexto(claveDeEstadoSla(estado))
      esperarTexto(`slaAyuda.${estado}`)
    }
  })

  it('los 7 factores de prioridad, con su etiqueta Y su explicacion', () => {
    // ⚠️ `FactorPrioridadDto.etiqueta` y `.explicacion` viajan VACIAS desde el backend a proposito
    // (son copy, y el backend tiene prohibido hardcodear copy de negocio). Si estas claves faltan,
    // el desglose de prioridad se renderiza con 7 filas en blanco.
    for (const codigo of FACTORES_PRIORIDAD) {
      esperarTexto(claveDeFactorPrioridad(codigo))
      esperarTexto(claveDeAyudaDeFactorPrioridad(codigo))
    }
  })

  it('los 6 estados DERIVADOS del badge de webhook (no son un campo del DTO)', () => {
    for (const activo of [true, false]) {
      for (const ultimo of [null, ...ESTADOS_ENTREGA_WEBHOOK]) {
        esperarTexto(claveDeEstadoDerivadoDeWebhook(estadoDerivadoDeWebhook(activo, ultimo)))
      }
    }
  })

  it('los 9 motivos del rechazo del DSL, mas el fallback de causa desconocida', () => {
    // El fallback no es decoracion: el backend puede agregar una causa nueva y el usuario tiene que
    // leer algo, no la clave cruda.
    for (const motivo of MOTIVOS_CONDICION_INVALIDA) {
      esperarTexto(claveDeMotivoCondicionInvalida(motivo))
    }
    esperarTexto(claveDeMotivoCondicionInvalida('causa_que_no_existe'))
  })

  it('los 11 tratamientos de error tienen su linea de GUIA', () => {
    // Es el copy que dice QUE HACER. El backend resuelve QUE PASO (por `message_key`); esto no lo
    // reemplaza, y sin esto el usuario se queda sin siguiente paso — que en `transicionBloqueada`
    // significa reintentar para siempre.
    for (const tratamiento of [
      'transicionBloqueada',
      'problemaCerrado',
      'condicionInvalida',
      'urlNoPermitida',
      'conflicto',
      'noEncontrado',
      'sinPermiso',
      'moduloNoActivo',
      'validacion',
      'red',
      'generico',
    ] as const) {
      esperarTexto(claveDeGuiaDeErrorCentro(tratamiento))
    }
  })

  it('CADA capacidad bloqueada tiene su motivo escrito, en los 2 idiomas', () => {
    // Sin esto, la regla del modulo —"o no va, o va deshabilitada CON EL MOTIVO visible"— queda sin
    // texto que mostrar, y un control gris sin explicacion se lee como un bug.
    for (const capacidad of Object.values(CAPACIDADES_BLOQUEADAS_DEL_CENTRO)) {
      esperarTexto(capacidad.clave)
    }
  })

  /**
   * Copy LITERAL de las 3 pantallas del Centro: no lo produce ninguna funcion del vocabulario, asi
   * que no lo alcanza el barrido de arriba. Se enumera a mano por el mismo motivo que el copy del
   * mapa y el de la tarjeta de ubicacion de la ficha.
   *
   * ⚠️ **El vacio de la bandeja es UNO desde el cierre de slice-06.** Habia dos —`vacioSinDatos`
   * ("tu flota esta tranquila", copy de la ficha §9) y `vacioDeteccionSinConectar`— elegidos por un
   * flag escrito a mano, y el que salia siempre afirmaba que **ninguna regla estaba activa en la
   * organizacion**: un hecho que esta pantalla nunca consulta y que el usuario puede falsificar
   * creando una regla en la pantalla de al lado. Los 2 copys se borraron; el que quedo dice el
   * **mecanismo**, que es lo unico que se puede afirmar sin preguntar nada.
   */
  it('el copy literal de las 3 pantallas del Centro', () => {
    const claves = [
      'centro.problemas.titulo',
      'centro.problemas.subtitulo',
      'centro.problemas.vacioDeLaBandeja.titulo',
      'centro.problemas.vacioDeLaBandeja.descripcion',
      'centro.problemas.vacioSinResultados.titulo',
      'centro.problemas.vacioSinResultados.limpiar',
      'centro.problemas.error.titulo',
      'centro.problemas.datosParciales.titulo',
      'centro.problemas.datosParciales.descripcion',
      'centro.problemas.sinValor',
      'prioridadDesglose.titulo',
      'prioridadDesglose.aclaracionSuma',
      // El desglose muestra los DOS números (la prioridad persistida y lo que los factores explican
      // hoy) porque pueden diferir — DRIFT 8. Sin estas 2 claves, la fila de la suma sale sin
      // etiqueta y la diferencia se lee como un error de cálculo.
      'prioridadDesglose.suma',
      'prioridadDesglose.desfasaje',

      'centro.reglas.titulo',
      'centro.reglas.subtitulo',
      'centro.reglas.vacioSinDatos.titulo',
      'centro.reglas.vacioSinDatos.descripcion',
      'centro.reglas.vacioSinDatos.cta',
      'centro.reglas.vacioSinResultados.titulo',
      'centro.reglas.vacioSinResultados.limpiar',
      'centro.reglas.error.titulo',
      'centro.reglas.alcanceTodaLaOrganizacion',
      'centro.reglas.conWebhook',
      'centro.reglas.sinWebhook',
      'condicionInvalida.titulo',
      'condicionInvalida.enCondicion',
      'condicionInvalida.sinIndice',

      'centro.integraciones.titulo',
      'centro.integraciones.subtitulo',
      'centro.integraciones.vacioSinDatos.titulo',
      'centro.integraciones.vacioSinDatos.descripcion',
      'centro.integraciones.vacioSinDatos.cta',
      'centro.integraciones.vacioSinResultados.titulo',
      'centro.integraciones.vacioSinResultados.limpiar',
      'centro.integraciones.vacioSinEntregas.titulo',
      // El vacio del log de entregas se parte en 2 por la misma razon que el de los 3 listados:
      // "no hay entregas" y "ninguna de las cargadas es de ESTE endpoint" son hechos distintos, y
      // el segundo lo produce un filtro que el usuario puede quitar.
      'centro.integraciones.vacioSinEntregasDelEndpoint.titulo',
      'centro.integraciones.vacioSinEntregasDelEndpoint.verTodas',
      'centro.integraciones.error.titulo',
      'centro.integraciones.entregasDeTodaLaOrganizacion',
      'centro.integraciones.entregas.soloEstaPagina',
      'centro.integraciones.secreto.titulo',
      'centro.integraciones.secreto.descripcion',
      'centro.integraciones.secreto.copiar',
      'centro.integraciones.secreto.copiado',
      'centro.integraciones.secreto.errorCopiar',
      'centro.integraciones.secreto.entendido',
      'centro.integraciones.probar.accion',
      'centro.integraciones.probar.aclaracion',
      'centro.integraciones.firma.titulo',
      'centro.integraciones.firma.descripcion',
      'centro.integraciones.firma.stringCanonico',
      'centro.integraciones.firma.tolerancia',
      'centro.integraciones.firma.toleranciaPendiente',
      'centro.integraciones.eventos.titulo',
      'centro.integraciones.eventos.noDisponible',
      'centro.integraciones.eventos.aclaracionSinSuscripciones',
    ]

    for (const clave of claves) esperarTexto(clave)
  })
})

describe('las claves de la SALA y de la LINEA DE TIEMPO existen en los 2 idiomas', () => {
  /**
   * La raíz del vacío de la bandeja sale de `claveDelVacioDeLaBandeja()` y el JSX le concatena
   * `.titulo` / `.descripcion`. Ni el compilador ni `verificar-i18n.mjs` ven esa concatenación: sin
   * este caso, la pantalla mostraría `centro.problemas.vacioDeLaBandeja.titulo` en crudo.
   *
   * ⚠️ Es **una** rama desde el cierre de slice-06: las 2 anteriores elegían entre afirmar que la
   * flota estaba tranquila y afirmar que la organización no tenía reglas activas, y la pantalla no
   * puede sostener ninguna de las dos.
   */
  it('el vacio de la bandeja resuelve a texto en los 2 idiomas', () => {
    esperarTexto(`${claveDelVacioDeLaBandeja()}.titulo`)
    esperarTexto(`${claveDelVacioDeLaBandeja()}.descripcion`)
  })

  it('el copy literal del shell, la Sala y la linea de tiempo', () => {
    const claves = [
      'centro.submenu.vistas',
      'centro.submenu.configurar',
      'centro.submenu.sala',
      'centro.submenu.timeline',
      'centro.submenu.reglas',
      'centro.submenu.integraciones',
      'centro.submenu.sinPermiso',
      'centro.submenu.alternar',

      'centro.problemas.sinAcceso.titulo',
      'centro.problemas.sinAcceso.descripcion',
      'centro.problemas.sinAcceso.volver',
      'centro.problemas.error.reintentar',
      'centro.problemas.error.tituloRefresco',
      'centro.problemas.paginacion.anterior',
      'centro.problemas.paginacion.siguiente',
      'centro.problemas.paginacion.porPagina',
      'centro.problemas.paginacion.rango',
      'centro.problemas.actualizando',
      'centro.problemas.resumen.linea',
      'centro.problemas.resumen.aclaracion',

      'centro.submenu.kanban',

      'centro.sala.cola.titulo',
      'centro.sala.cola.aclaracionOrden',
      'centro.sala.cola.aclaracionSinFiltros',
      'centro.sala.cola.sinPatente',
      'centro.sala.cola.sinResponsable',
      'centro.sala.detalle.titulo',
      'centro.sala.detalle.abrirTicket',
      'centro.sala.detalle.vacio',
      'centro.sala.detalle.quePaso',
      'centro.sala.detalle.sinDescripcion',
      'centro.sala.detalle.accionSugerida',
      'centro.sala.detalle.detectado',
      'centro.sala.detalle.vehiculo',
      'centro.sala.detalle.conductor',
      'centro.sala.detalle.responsable',
      'centro.sala.detalle.senales',
      'centro.sala.detalle.senalSinDetalle',
      'centro.sala.detalle.errorTitulo',
      'centro.sala.acciones.sinPermiso',
      'centro.sala.acciones.asignarBloqueado',
      'centro.sala.sla.sinPlazo',
      'centro.sala.sla.sinDato',
      'centro.sala.contexto.titulo',
      'centro.sala.contexto.operativo',
      'centro.sala.contexto.ignicion',
      'centro.sala.contexto.ignicionSi',
      'centro.sala.contexto.ignicionNo',
      'centro.sala.contexto.velocidad',
      'centro.sala.contexto.velocidadValor',
      'centro.sala.contexto.ultimaSenal',
      'centro.sala.contexto.sinVehiculo',
      'centro.sala.contexto.otrosDelVehiculo',
      'centro.sala.contexto.otrosDelVehiculoAclaracion',
      'centro.sala.contexto.otrosDelVehiculoVacio',

      'centro.timeline.titulo',
      'centro.timeline.ventana',
      'centro.timeline.ventanaAclaracion',
      'centro.timeline.ahora',
      'centro.timeline.leyenda',
      'centro.timeline.aclaracionOrigenes',
      'centro.timeline.carril.vacio',
      'centro.timeline.carril.geozonaDiferido',
      'centro.timeline.evento.abrir',
      'centro.timeline.insight.ajustarRegla',

      'centro.silenciar.titulo',
      'centro.silenciar.descripcion',
      'centro.silenciar.motivo',
      'centro.silenciar.motivoAyuda',
      'centro.silenciar.ventana',
      'centro.silenciar.ventana30',
      'centro.silenciar.ventana120',
      'centro.silenciar.ventanaFinDeTurnoPendiente',
      'centro.silenciar.notificaciones',
      'centro.silenciar.webhooks',
      'centro.silenciar.webhooksAclaracion',
      'centro.silenciar.aclaracion',
      'centro.silenciar.confirmar',

      'centro.resolver.titulo',
      'centro.resolver.descripcion',
      'centro.resolver.resultado',
      'centro.resolver.resuelto',
      'centro.resolver.resueltoAyuda',
      'centro.resolver.descartado',
      'centro.resolver.descartadoAyuda',
      'centro.resolver.evidencia',
      'centro.resolver.evidenciaAyuda',
      'centro.resolver.aclaracion',
      'centro.resolver.aclaracionIntegracion',
      'centro.resolver.confirmar',
    ]

    for (const clave of claves) esperarTexto(clave)
  })

  /**
   * Las claves con PLURAL (`_one` / `_other`) no se resuelven con `esperarTexto`: la hoja del JSON
   * es `x_one`, no `x`. Se verifican las 2 formas, en los 2 idiomas — un plural presente en es-AR y
   * ausente en en pasa el verificador de paridad **solo si falta el mismo sufijo en los dos**, que
   * es justo lo que un copy/paste a medias produce.
   */
  it('las claves con plural tienen sus 2 formas', () => {
    const conPlural = [
      'centro.problemas.total',
      'centro.sala.cola.senales',
      'centro.sala.sla.enPlazo',
      'centro.sala.sla.vencido',
      'centro.timeline.fueraDeLosCarriles',
      'centro.timeline.carril.eventos',
      'centro.timeline.carril.criticos',
    ]

    for (const clave of conPlural) {
      esperarTexto(`${clave}_one`)
      esperarTexto(`${clave}_other`)
    }
  })

  /**
   * Las 2 familias del TABLERO se arman por concatenación sobre los 4 códigos de columna, así que
   * no las ve ni el compilador ni `verificar-i18n.mjs`. La **ayuda** no es decorativa: sin ella,
   * "Detectado" con un problema que ya tiene responsable adentro se lee como un bug, y "Resuelto
   * hoy" no aclara que "hoy" es el día del navegador (DA-PC-16).
   */
  it('las claves del KANBAN: titulo y ayuda de las 4 columnas', () => {
    for (const columna of COLUMNAS_DEL_TABLERO) {
      esperarTexto(claveDeColumnaDelTablero(columna))
      esperarTexto(claveDeAyudaDeColumna(columna))
    }
  })

  it('las claves de los 4 tabs del TICKET', () => {
    for (const tab of TABS_DEL_TICKET) esperarTexto(claveDeTabDelTicket(tab))
  })

  it('el copy literal del tablero y del ticket', () => {
    const claves = [
      'centro.kanban.aclaracionPagina',
      'centro.kanban.columnaVacia',

      'centro.ticket.volver',
      'centro.ticket.noExiste',
      'centro.ticket.actualizado',
      'centro.ticket.sinAcciones',
      'centro.ticket.tipoDeProblema',
      'centro.ticket.sinSenales',
      'centro.ticket.porUsuario',
      'centro.ticket.timelineVacio.titulo',
      'centro.ticket.timelineVacio.descripcion',

      // El tab "Contexto regla" se dibuja SIN datos y su copy es lo único que el usuario recibe:
      // faltar de un idioma lo deja mirando un panel vacío sin explicación.
      'centro.ticket.regla.titulo',
      'centro.ticket.regla.descripcion',
      'centro.ticket.regla.sinVinculo',

      // Ídem el tab Integraciones: `webhooks[]` llega vacío SIEMPRE (DRIFT 7) y el copy es lo que
      // impide leer ese vacío como "no se envió nada".
      'centro.ticket.integraciones.titulo',
      'centro.ticket.integraciones.sinEntregas',
      'centro.ticket.integraciones.sinCorrelacion',
      'centro.ticket.integraciones.configurar',
    ]

    for (const clave of claves) esperarTexto(clave)
  })

  it('las claves con plural del tablero y del ticket tienen sus 2 formas', () => {
    const conPlural = [
      'centro.kanban.verMas',
      'centro.kanban.fueraDelTableroSilenciados',
      'centro.kanban.fueraDelTableroCerrados',
      'centro.ticket.integraciones.intentos',
    ]

    for (const clave of conPlural) {
      esperarTexto(`${clave}_one`)
      esperarTexto(`${clave}_other`)
    }
  })

  /** Los mensajes de Zod son claves i18n: sin ellas el formulario muestra `validation.motivo.required`. */
  it('los mensajes de validacion de los 2 modales resuelven a texto', () => {
    for (const clave of [
      'validation.motivo.required',
      'validation.motivo.max_length',
      'validation.evidencia.required',
      'validation.evidencia.max_length',
      'validation.resultado.required',
      'validation.silenciar_hasta_utc.required',
    ]) {
      esperarTexto(clave)
    }
  })
})

describe('las claves de REGLAS (f-10) existen en los 2 idiomas', () => {
  /**
   * Las 2 familias del DSL se arman por concatenación sobre los **13** códigos del enum §2.2, así
   * que no las ve ni el compilador ni `verificar-i18n.mjs`.
   *
   * La **ayuda** no es decorativa y es la mitad que importa: 5 de los 13 campos describen un dato
   * que hoy **nadie completa o nadie revisa** (`manipulacion_detectada` no lo computa ninguna capa;
   * `mantenimiento_vencido` lo emite Operaciones, que no existe; los 3 de estado solo se miran
   * cuando llega una señal). Sin esa línea, el usuario arma una regla que se guarda bien y no se
   * dispara nunca, y no tiene forma de enterarse.
   */
  it('etiqueta y ayuda de los 13 campos del DSL', () => {
    expect(CAMPOS_DSL).toHaveLength(13)

    for (const campo of CAMPOS_DSL) {
      esperarTexto(claveDeCampoDsl(campo.codigo))
      esperarTexto(claveDeAyudaDeCampoDsl(campo.codigo))
    }
  })

  /** Los 7 del enum §2.3. El símbolo crudo (`>=`) no se pinta: se traduce a palabras. */
  it('etiqueta de los 7 operadores del DSL', () => {
    expect(OPERADORES_DSL).toHaveLength(7)

    for (const operador of OPERADORES_DSL) esperarTexto(claveDeOperadorDsl(operador))
  })

  it('etiqueta de las 6 acciones del kebab de una regla', () => {
    for (const accion of ACCIONES_DE_REGLA) esperarTexto(claveDeAccionDeRegla(accion))
  })

  /**
   * El select de `dtc_criticidad` reusa el copy de `severidadProblema.*` porque son **el mismo
   * vocabulario de 4 valores** (`motor-de-reglas.md` §2.2). Si una de las 2 listas crece sin la
   * otra, el select muestra la clave cruda: este test es el que se pone rojo.
   */
  it('los 4 valores de dtc_criticidad tienen copy de severidad', () => {
    for (const valor of VALORES_DTC_CRITICIDAD) esperarTexto(`severidadProblema.${valor}`)
  })

  /**
   * El plazo se muestra con la clave + su cantidad (`15 min`, `1 h`), no con un string armado: hora
   * y minuto pluralizan y el plural lo elige i18next. Las 4 opciones del select tienen que caer en
   * una clave con sus 2 formas.
   */
  it('las 4 opciones de plazo resuelven a una clave con plural', () => {
    for (const minutos of OPCIONES_DE_PLAZO_MINUTOS) {
      const { clave } = formatoDePlazo(minutos)
      esperarTexto(`${clave}_one`)
      esperarTexto(`${clave}_other`)
    }
  })

  it('el copy literal de la pantalla de reglas', () => {
    const claves = [
      'centro.reglas.activa',
      'centro.reglas.inactiva',
      'centro.reglas.ordenFijo',
      'centro.reglas.condicionSinTexto',
      'centro.reglas.duplicarSufijo',
      // Sin esta línea, "Aún no configuraste reglas" le echa la culpa al usuario de un vacío que
      // hoy tiene TODA organización, porque el seed del motor no corre (PENDIENTE #4).
      'centro.reglas.vacioSinSeed',
      'centro.reglas.error.reintentar',
      'centro.reglas.error.tituloRefresco',
      'centro.reglas.error.tituloAlternar',
      'centro.reglas.sinAcceso.titulo',
      'centro.reglas.sinAcceso.descripcion',
      'centro.reglas.sinAcceso.volver',
      'centro.reglas.acciones.abrir',
      'centro.reglas.acciones.sinPermiso',
      'centro.reglas.columnas.regla',
      'centro.reglas.columnas.estado',
      'centro.reglas.columnas.severidad',
      'centro.reglas.columnas.condicion',
      'centro.reglas.columnas.operacion',
      'centro.reglas.columnas.plazo',
      'centro.reglas.columnas.webhook',
      'centro.reglas.columnas.acciones',
      'centro.reglas.paginacion.anterior',
      'centro.reglas.paginacion.siguiente',
      'centro.reglas.paginacion.porPagina',
      'centro.reglas.resumen.titulo',
      'centro.reglas.resumen.activas',
      'centro.reglas.resumen.criticas',
      'centro.reglas.resumen.criticasDetalle',
      'centro.reglas.resumen.activaciones',
      'centro.reglas.resumen.activacionesDetalle',
      'centro.reglas.resumen.conWebhook',
      'centro.reglas.resumen.conWebhookDetalle',
      'centro.reglas.resumen.sinDato',
      'centro.reglas.resumen.deLaPagina',

      'centro.reglas.modal.tituloAlta',
      'centro.reglas.modal.tituloEditar',
      'centro.reglas.modal.subtitulo',
      'centro.reglas.modal.nombre',
      'centro.reglas.modal.tipo',
      'centro.reglas.modal.tipoAyuda',
      'centro.reglas.modal.tipoFijo',
      'centro.reglas.modal.severidad',
      'centro.reglas.modal.plazo',
      'centro.reglas.modal.plazoAyuda',
      'centro.reglas.modal.condicion',
      'centro.reglas.modal.condicionAyuda',
      'centro.reglas.modal.combinadorFijo',
      'centro.reglas.modal.campo',
      'centro.reglas.modal.operador',
      'centro.reglas.modal.valor',
      'centro.reglas.modal.valorPlaceholder',
      'centro.reglas.modal.umbral',
      // La ayuda del umbral dice que `sostenido_por` no tiene serie temporal detrás: es lo único
      // que impide construir una regla sostenida que jamás se cumple.
      'centro.reglas.modal.umbralAyuda',
      'centro.reglas.modal.listaAyuda',
      'centro.reglas.modal.verdadero',
      'centro.reglas.modal.falso',
      'centro.reglas.modal.agregarCondicion',
      'centro.reglas.modal.quitarCondicion',
      'centro.reglas.modal.minimoCondiciones',
      'centro.reglas.modal.maximoCondiciones',
      'centro.reglas.modal.webhook',
      'centro.reglas.modal.webhookAyuda',
      'centro.reglas.modal.webhookNinguno',
      'centro.reglas.modal.webhookCargando',
      'centro.reglas.modal.webhookSinPermiso',
      'centro.reglas.modal.webhookYaConfigurado',
      // B-18: volver a "Sin webhook" NO desvincula. Sin este aviso el modal cierra en verde y la
      // regla sigue avisando al endpoint que el usuario creyó haber quitado.
      'centro.reglas.modal.webhookNoSeDesvincula',
      'centro.reglas.modal.accionSugerida',
      'centro.reglas.modal.accionSugeridaAyuda',
      'centro.reglas.modal.activa',
      'centro.reglas.modal.activaAyuda',
      'centro.reglas.modal.guardar',

      // La línea que reemplaza a los 2 controles que la ficha §7 pedía (Alcance y Responsable).
      'centroBloqueado.alcanceRegla',
    ]

    for (const clave of claves) esperarTexto(clave)
  })

  it('las claves con plural de reglas tienen sus 2 formas', () => {
    for (const clave of [
      'centro.reglas.paginacion.rango',
      'centro.reglas.resumen.activasDetalle',
    ]) {
      esperarTexto(`${clave}_one`)
      esperarTexto(`${clave}_other`)
    }
  })

  it('los mensajes de validacion del modal de regla resuelven a texto', () => {
    for (const clave of [
      'validation.nombre.required',
      'validation.nombre.max_length',
      'validation.sla_minutos.invalid',
      'validation.sla_minutos.max',
      'validation.accion_sugerida.required',
      'validation.accion_sugerida.max_length',
      'validation.condicion_json.required',
    ]) {
      esperarTexto(clave)
    }
  })
})

describe('las claves de INTEGRACIONES (f-11) existen en los 2 idiomas', () => {
  it('etiqueta de las 6 acciones del kebab de un webhook', () => {
    for (const accion of ACCIONES_DE_WEBHOOK) esperarTexto(claveDeAccionDeWebhook(accion))
  })

  /**
   * El **uso** de cada header es lo que convierte la card en material de onboarding: sin él son 4
   * strings y el integrador no sabe cuál dedupea y cuál evita el replay. Los NOMBRES no se traducen
   * (son protocolo) y por eso no se testean acá.
   */
  it('el uso de los 4 headers de la firma HMAC', () => {
    expect(HEADERS_DE_FIRMA).toHaveLength(4)

    for (const header of HEADERS_DE_FIRMA) esperarTexto(header.clave)
  })

  it('el copy literal de la pantalla de integraciones', () => {
    const claves = [
      'centro.integraciones.lista.titulo',
      'centro.integraciones.sinEnviosAun',
      'centro.integraciones.ultimaEntrega',
      'centro.integraciones.error.tituloAlternar',
      'centro.integraciones.sinAcceso.titulo',
      'centro.integraciones.sinAcceso.descripcion',
      'centro.integraciones.sinAcceso.volver',
      'centro.integraciones.acciones.abrir',
      'centro.integraciones.acciones.sinPermiso',

      'centro.integraciones.filtros.busqueda',
      'centro.integraciones.filtros.busquedaPlaceholder',
      'centro.integraciones.filtros.estado',
      'centro.integraciones.filtros.estadoTodos',
      'centro.integraciones.filtros.estadoPrevalece',
      'centro.integraciones.filtros.soloActivos',
      // El filtrado es client-side: con más de una página tiene que decir sobre qué filtró.
      'centro.integraciones.filtros.soloEstaPagina',

      'centro.integraciones.salud.titulo',
      'centro.integraciones.salud.activos',
      'centro.integraciones.salud.entregas',
      'centro.integraciones.salud.entregasDetalle',
      'centro.integraciones.salud.fallos',
      'centro.integraciones.salud.fallosDetalle',
      'centro.integraciones.salud.sinDato',
      'centro.integraciones.salud.deLaPagina',

      'centro.integraciones.entregas.titulo',
      'centro.integraciones.entregas.evento',
      'centro.integraciones.entregas.endpoint',
      'centro.integraciones.entregas.endpointNoCargado',
      'centro.integraciones.entregas.estado',
      'centro.integraciones.entregas.intentos',
      'centro.integraciones.entregas.status',
      'centro.integraciones.entregas.sinStatus',
      'centro.integraciones.entregas.proximoIntento',
      'centro.integraciones.entregas.error',
      'centro.integraciones.entregas.filtradoPor',
      'centro.integraciones.entregas.quitarFiltro',
      'centro.integraciones.vacioSinEntregas.descripcion',

      'centro.integraciones.firma.rawBody',
      'centro.integraciones.firma.validacionTriple',
      'centro.integraciones.firma.huellaDe',
      'centro.integraciones.firma.rotar',
      'centro.integraciones.firma.sinEndpoint',

      // ══ EL SECRETO ══════════════════════════════════════════════════════════════════════════
      // Estas 3 son las que hacen que el modal del secreto sea una barrera y no un cartel: el
      // subtítulo dice de dónde salió el valor y la confirmación es lo único que separa "lo copié"
      // de "creí que lo había copiado". Un secreto perdido obliga a rotar de nuevo, y rotar hoy le
      // corta las entregas al receptor (B-39).
      'centro.integraciones.secreto.subtituloAlta',
      'centro.integraciones.secreto.subtituloRotacion',
      'centro.integraciones.secreto.confirmacion',

      'centro.integraciones.probar.titulo',
      'centro.integraciones.probar.resultadoAclaracion',

      'centro.integraciones.modal.tituloAlta',
      'centro.integraciones.modal.tituloEditar',
      'centro.integraciones.modal.subtitulo',
      'centro.integraciones.modal.nombre',
      'centro.integraciones.modal.url',
      'centro.integraciones.modal.urlAyuda',
      'centro.integraciones.modal.activo',
      'centro.integraciones.modal.activoAyuda',
      'centro.integraciones.modal.guardar',

      'centro.integraciones.eliminar.titulo',
      'centro.integraciones.eliminar.descripcion',
      'centro.integraciones.eliminar.confirmar',
      'centro.integraciones.rotar.titulo',
      'centro.integraciones.rotar.confirmar',

      // Las 3 de `centroBloqueado` que esta pantalla sirve: sin suscripciones, sin drenado de la
      // cola de reintentos y sin ventana de gracia real.
      'centroBloqueado.suscripciones',
      'centroBloqueado.reintentarEntregas',
      'centroBloqueado.ventanaDeGracia',

      'comun.cerrar',
    ]

    for (const clave of claves) esperarTexto(clave)
  })

  it('las claves con plural de integraciones tienen sus 2 formas', () => {
    esperarTexto('centro.integraciones.salud.activosDetalle_one')
    esperarTexto('centro.integraciones.salud.activosDetalle_other')
  })

  /**
   * ⚠️ **B-39, anclado como copy y no como comentario.** `api.md` §Rotación promete que el secreto
   * anterior sigue validando durante una ventana de gracia; el backend firma con el nuevo desde t=0
   * y manda **una sola** firma, así que hoy el receptor que todavía tiene el viejo pierde el 100 %
   * de las entregas. `ESTADO.md` lo lista entre lo que el frontend **no debe dibujar**.
   *
   * Este test se pone rojo si alguien "arregla" el copy hacia la promesa del contrato **antes** de
   * que exista multi-firma. El día que B-39 se cierre, se cambia el copy y este test con él.
   */
  it('el copy de la rotacion NO promete una ventana de convivencia', () => {
    const prohibido = [
      /sigue (funcionando|validando|sirviendo)/i,
      /ventana de (gracia|convivencia)/i,
      /keeps? working/i,
      /grace (period|window)/i,
    ]

    for (const [idioma, diccionario] of LOCALES) {
      const copy = resolver(diccionario, 'centroBloqueado.ventanaDeGracia')
      expect(typeof copy, `centroBloqueado.ventanaDeGracia falta en ${idioma}`).toBe('string')

      for (const patron of prohibido) {
        expect(
          patron.test(copy as string),
          `el copy de rotacion en ${idioma} promete una ventana que hoy no existe (B-39): ${String(copy)}`,
        ).toBe(false)
      }
    }
  })
})

/* ═══════════════════════════════════════════════════════════════════════════════════════════════
 * f-12 — SEÑALES EMBEBIDAS
 * ═════════════════════════════════════════════════════════════════════════════════════════════ */

describe('las claves de las SEÑALES EMBEBIDAS existen en los 2 idiomas', () => {
  /**
   * Las 4 ramas de `lecturaDeSenales` arman su clave por concatenacion en el vocabulario y el JSX
   * las resuelve con `t(lectura.clave)`. Ni el compilador ni `verificar-i18n.mjs` las ven: una clave
   * parejamente ausente pasa el gate y el usuario lee `senales.celda.sinConectar` en crudo, en la
   * celda donde tenia que leer por que su vehiculo no muestra nada.
   *
   * ⚠️ Dos de estas ramas son INALCANZABLES hoy (`sin_senales` e `indiceParcial`, las dos exigen
   * GATE 2 cerrado) y se anclan igual: son andamio declarado, no basura. El dia que la deteccion se
   * conecte, la pantalla ya sabe decirlo.
   */
  it('las 4 ramas de la celda y sus ayudas resuelven a texto', () => {
    const claves = [
      'senales.celda.sinConectar',
      'senales.celda.sinSenales',
      'senales.ayuda.sinConectar',
      'senales.ayuda.sinSenales',
      'senales.ayuda.indiceParcial',
    ]

    for (const clave of claves) esperarTexto(clave)
  })

  /**
   * `AvisoDeSenales` arma `senales.aviso.${cual}.titulo` con el valor que devuelve `avisoDeSenales`.
   * Los 3 casos que se renderizan tienen que tener copy; `ninguno` no se dibuja (retorna `null`
   * antes), asi que **no** debe tener claves — verificarlo evita el andamio inverso.
   */
  it('los 3 avisos que se dibujan tienen titulo y descripcion; `ninguno` no tiene ninguna', () => {
    for (const cual of ['deteccion_sin_conectar', 'indice_parcial', 'sin_fuente']) {
      esperarTexto(`senales.aviso.${cual}.titulo`)
      esperarTexto(`senales.aviso.${cual}.descripcion`)
    }

    for (const [idioma, diccionario] of LOCALES) {
      expect(
        resolver(diccionario, 'senales.aviso.ninguno'),
        `senales.aviso.ninguno no debe existir en ${idioma}: ese caso no se renderiza`,
      ).toBeUndefined()
    }
  })

  it('el panel de la ficha y la columna del listado tienen su copy', () => {
    const claves = [
      'senales.panel.titulo',
      'senales.panel.subtitulo',
      'senales.panel.sinFecha',
      'senales.panel.sinCorrelacion',
      'senales.panel.irAlCentro',
      'vehiculosListado.columnas.senales',
    ]

    for (const clave of claves) esperarTexto(clave)
  })

  it('el badge con conteo tiene sus 2 formas plurales', () => {
    esperarTexto('senales.badge.conConteo_one')
    esperarTexto('senales.badge.conConteo_other')
  })

  /**
   * ⚠️ **LA REGRESION QUE ESTE PASO EXISTE PARA EVITAR, anclada como copy.**
   *
   * Mientras GATE 2 siga abierto no hay ni un escritor de alertas, asi que las 3 superficies estan
   * vacias el 100 % de las veces. El copy que explica ese vacio **no puede** afirmar que la flota
   * este bien: tiene que decir que la deteccion no corre. Si alguien "mejora" ese texto hacia
   * "sin problemas" / "todo en orden", este test se pone rojo.
   */
  it('el copy del vacio NO afirma que la flota este bien', () => {
    const prohibido = [
      /sin problemas/i,
      /todo (en orden|bien)/i,
      /tu flota est[aá] (tranquila|bien)/i,
      /no hay (alertas|se[nñ]ales)\b/i,
      /all (good|clear)/i,
      /no (issues|problems)/i,
      /everything is (fine|ok)/i,
    ]

    const claves = [
      'senales.ayuda.sinConectar',
      'senales.aviso.deteccion_sin_conectar.titulo',
      'senales.aviso.deteccion_sin_conectar.descripcion',
      'senales.aviso.sin_fuente.titulo',
      'senales.aviso.sin_fuente.descripcion',
    ]

    for (const [idioma, diccionario] of LOCALES) {
      for (const clave of claves) {
        const copy = resolver(diccionario, clave)
        expect(typeof copy, `${clave} falta en ${idioma}`).toBe('string')

        for (const patron of prohibido) {
          expect(
            patron.test(copy as string),
            `${clave} en ${idioma} afirma que la flota esta bien, y hoy nadie miro (GATE 2 / B-38): ${String(copy)}`,
          ).toBe(false)
        }
      }
    }
  })
})
