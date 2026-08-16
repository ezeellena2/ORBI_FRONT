import { describe, expect, it } from 'vitest'
import {
  CAPACIDADES_BLOQUEADAS_DEL_CENTRO,
  ESTADOS_ENTREGA_WEBHOOK,
  ESTADOS_PROBLEMA,
  ESTADOS_SLA_EMITIDOS,
  ESTADOS_SLA_PROBLEMA,
  EVENTOS_PUBLICOS_WEBHOOK,
  FACTORES_PRIORIDAD,
  TRANSICION_DE_ESTADO_DISPONIBLE,
  admiteReintento,
  esErrorDeCampo,
  esEstadoTerminal,
  estadoDerivadoDeWebhook,
  claveDeMotivoCondicionInvalida,
  tratamientoDeErrorCentro,
  varianteDeEstadoSla,
} from './vocabulario-centro-problemas'

/**
 * El vocabulario de errores del Centro es el corazon del slice, y este test es su red.
 *
 * Lo que ancla no es "que la funcion devuelva algo": es que **3 situaciones que el backend sirve con
 * el mismo status —y dos de ellas con el mismo `code`— sigan produciendo consejos distintos**. Si
 * alguien las colapsa "para simplificar", la pantalla vuelve a mandar al operador a reintentar una
 * operacion que no puede completarse nunca.
 */

describe('tratamientoDeErrorCentro — se ramifica por `code`, nunca por status', () => {
  it('la TRANSICION BLOQUEADA no es un conflicto de negocio ni un fallo de red', () => {
    // El catalogo de transiciones esta vacio a proposito: no hay dato que corregir ni momento
    // futuro en el que funcione. Los 3 tratamientos tienen que ser DISTINTOS entre si.
    const bloqueada = tratamientoDeErrorCentro('flota.problema.transicion_invalida', {
      estadoActual: 'detectado',
      estadoDestino: 'en_analisis',
    })
    const cerrado = tratamientoDeErrorCentro('flota.problema.transicion_invalida', {
      estadoActual: 'resuelto',
      estadoDestino: 'en_analisis',
    })
    const red = tratamientoDeErrorCentro('network')

    expect(bloqueada).toBe('transicionBloqueada')
    expect(cerrado).toBe('problemaCerrado')
    expect(red).toBe('red')
    expect(new Set([bloqueada, cerrado, red]).size).toBe(3)
  })

  it('el MISMO code se parte en 2 por `args.estadoActual`, que es el unico discriminante que hay', () => {
    // El catalogo de errores NO tiene code para "accion sobre problema terminal" y el backend no lo
    // invento (patron D-S3-15/16): asignar/silenciar sobre un problema cerrado llega con el mismo
    // `transicion_invalida`. Sin mirar los args, la pantalla diria "el flujo de estados no esta
    // configurado" sobre un caso que simplemente ya se cerro.
    for (const terminal of ['resuelto', 'descartado']) {
      expect(
        tratamientoDeErrorCentro('flota.problema.transicion_invalida', {
          estadoActual: terminal,
        }),
      ).toBe('problemaCerrado')
    }

    // Sin `args` (o con un estado no terminal) cae en bloqueada, que es el caso hoy dominante.
    expect(tratamientoDeErrorCentro('flota.problema.transicion_invalida')).toBe(
      'transicionBloqueada',
    )
  })

  it('los 404 del Centro son uniformes: no distinguen cross-tenant de "no existe"', () => {
    for (const code of [
      'flota.problema.no_existe',
      'flota.regla.no_existe',
      'flota.webhook.no_existe',
      'flota.recurso.organizacion_invalida',
    ]) {
      expect(tratamientoDeErrorCentro(code)).toBe('noEncontrado')
    }
  })

  it('los 2 errores de CAMPO del slice no se mezclan con los de pantalla', () => {
    expect(tratamientoDeErrorCentro('flota.regla.condicion_invalida', { indice: 0 })).toBe(
      'condicionInvalida',
    )
    expect(tratamientoDeErrorCentro('flota.webhook.url_no_permitida', { url: 'http://x' })).toBe(
      'urlNoPermitida',
    )

    expect(esErrorDeCampo('condicionInvalida')).toBe(true)
    expect(esErrorDeCampo('urlNoPermitida')).toBe(true)
    expect(esErrorDeCampo('validacion')).toBe(true)
    expect(esErrorDeCampo('transicionBloqueada')).toBe(false)
    expect(esErrorDeCampo('noEncontrado')).toBe(false)
  })

  it('el 403 no es un error recuperable: sale por su propia rama', () => {
    expect(tratamientoDeErrorCentro('flota.modulo.no_activo')).toBe('moduloNoActivo')
    expect(tratamientoDeErrorCentro('flota.recurso.sin_permiso', { permiso: 'flota.problemas.leer' }))
      .toBe('sinPermiso')
  })

  it('un code desconocido cae en generico y NUNCA explota', () => {
    expect(tratamientoDeErrorCentro('flota.inventado.que_no_existe')).toBe('generico')
    expect(tratamientoDeErrorCentro(null)).toBe('generico')
  })

  it('"Reintentar" SOLO se ofrece donde reintentar puede cambiar algo', () => {
    // Es la regla que impide el loop infinito del kanban.
    expect(admiteReintento('red')).toBe(true)
    expect(admiteReintento('generico')).toBe(true)

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
    ] as const) {
      expect(admiteReintento(tratamiento), `${tratamiento} no debe ofrecer reintento`).toBe(false)
    }
  })
})

describe('lo que el Centro NO puede hacer esta declarado, no escondido', () => {
  it('la transicion de estado NO tiene endpoint enrutado: la pantalla no debe emitir el request', () => {
    // Si esto se pone rojo es porque alguien cableo el `POST /problemas/{id}/estado`. Antes de
    // "arreglar" el test hay que verificar que el server lo enrute de verdad: hoy no lo hace, y la
    // llamada seria un 404 de routing SIN `code`, que ninguna pantalla puede explicar.
    expect(TRANSICION_DE_ESTADO_DISPONIBLE).toBe(false)
    expect(CAPACIDADES_BLOQUEADAS_DEL_CENTRO.cambiarEstadoDeProblema.endpointEnrutado).toBe(false)
  })

  it('las 4 capacidades sin ruta estan marcadas como tales', () => {
    for (const capacidad of [
      'comentarProblema',
      'exportarProblemas',
      'gestionarAlerta',
      'cambiarEstadoDeProblema',
    ] as const) {
      expect(
        CAPACIDADES_BLOQUEADAS_DEL_CENTRO[capacidad].endpointEnrutado,
        `${capacidad} no tiene ruta en el server`,
      ).toBe(false)
    }
  })

  it('las 3 que SI responden estan marcadas distinto: el endpoint existe y lo que falta es otra cosa', () => {
    // `reintentarEntregas` responde 200 y reencola de verdad (nadie drena la cola, B-40);
    // `ventanaDeGraciaDelSecreto` rota de verdad (la ventana no compra nada, B-39);
    // `deteccionDeAlertas` lista de verdad (no hay escritor, GATE 2).
    for (const capacidad of [
      'reintentarEntregas',
      'ventanaDeGraciaDelSecreto',
      'deteccionDeAlertas',
    ] as const) {
      expect(CAPACIDADES_BLOQUEADAS_DEL_CENTRO[capacidad].endpointEnrutado).toBe(true)
    }
  })
})

describe('los vocabularios cerrados coinciden con el contrato', () => {
  it('el SLA tiene 4 valores en el union y el backend emite 3', () => {
    // `por_vencer` no se emite: ningun documento fija el umbral. El dia que se decida, este test se
    // pone rojo A PROPOSITO y hay que mover el valor de un array al otro.
    expect(ESTADOS_SLA_PROBLEMA).toHaveLength(4)
    expect(ESTADOS_SLA_EMITIDOS).toHaveLength(3)
    expect(ESTADOS_SLA_EMITIDOS).not.toContain('por_vencer')
  })

  it('`sin_sla` es NEUTRO y no exito: no tener reloj no es ir a tiempo', () => {
    expect(varianteDeEstadoSla('sin_sla')).toBe('neutro')
    expect(varianteDeEstadoSla('vigente')).toBe('exito')
    expect(varianteDeEstadoSla('vencido')).toBe('peligro')
  })

  it('los 7 estados del problema, con sus 2 terminales', () => {
    expect(ESTADOS_PROBLEMA).toHaveLength(7)
    expect(ESTADOS_PROBLEMA.filter((e) => esEstadoTerminal(e))).toEqual(['resuelto', 'descartado'])
    expect(esEstadoTerminal(null)).toBe(false)
    expect(esEstadoTerminal('en_analisis')).toBe(false)
  })

  it('los 7 factores de prioridad estan completos y en el orden del contrato', () => {
    // El DTO exige las 7 entradas siempre, incluso con `puntos: 0`.
    expect(FACTORES_PRIORIDAD).toHaveLength(7)
    expect(FACTORES_PRIORIDAD[0]).toBe('severidad_base')
    expect(FACTORES_PRIORIDAD[6]).toBe('sla_restante')
    expect(FACTORES_PRIORIDAD).toContain('criticidad_activo')
  })

  it('el catalogo publico de webhooks son 14 y NO incluye `webhook.test`', () => {
    // El mockup dibuja 12: le faltan `problem.priority_changed` y `problem.assigned`. Manda el
    // contrato. `webhook.test` es exclusivo del endpoint de prueba y no es suscribible.
    expect(EVENTOS_PUBLICOS_WEBHOOK).toHaveLength(14)
    expect(EVENTOS_PUBLICOS_WEBHOOK.map((e) => e.nombre)).toContain('problem.priority_changed')
    expect(EVENTOS_PUBLICOS_WEBHOOK.map((e) => e.nombre)).toContain('problem.assigned')
    expect(EVENTOS_PUBLICOS_WEBHOOK.map((e) => e.nombre)).not.toContain('webhook.test')

    const noDisponibles = EVENTOS_PUBLICOS_WEBHOOK.filter((e) => !e.disponible).map((e) => e.nombre)
    expect(noDisponibles).toEqual(['geofence.entered', 'geofence.exited', 'maintenance.due'])
  })

  it('un motivo de condicion invalida fuera del catalogo cae en una clave que existe', () => {
    expect(claveDeMotivoCondicionInvalida('campo_desconocido')).toBe(
      'condicionInvalida.motivo.campo_desconocido',
    )
    // El backend podria agregar una causa nueva: el usuario tiene que leer algo, no la clave cruda.
    expect(claveDeMotivoCondicionInvalida('causa_futura')).toBe(
      'condicionInvalida.motivo.desconocido',
    )
  })
})

describe('el badge del endpoint de webhook se DERIVA, no llega como campo', () => {
  it('un endpoint PAUSADO es "inactivo" aunque su ultima entrega haya fallado', () => {
    // Mostrarlo como "Fallando" mandaria a alguien a arreglar un endpoint apagado a proposito.
    for (const ultimo of ESTADOS_ENTREGA_WEBHOOK) {
      expect(estadoDerivadoDeWebhook(false, ultimo)).toBe('inactivo')
    }
    expect(estadoDerivadoDeWebhook(false, null)).toBe('inactivo')
  })

  it('activo sin entregas es "sin_envios", que no es lo mismo que "activo"', () => {
    // Y hoy es el caso NORMAL de todo endpoint recien creado: nace sin suscripciones (PENDIENTE #3),
    // asi que no recibe ninguna entrega automatica.
    expect(estadoDerivadoDeWebhook(true, null)).toBe('sin_envios')
  })

  /**
   * Las 6 filas de la tabla de derivacion de `dtos.ts` §9, **una por una** (`f-11` §Verificacion:
   * "assert por combinacion"). Este test estuvo verde con **2 filas cambiadas** hasta f-10/f-11:
   * `reintentando` daba `con_errores` y `fallido` daba `fallando`, o sea que una entrega **en vuelo**
   * se pintaba como error y un fallo puntual se pintaba igual que un endpoint que ya dejo de recibir.
   * Se corrigio la funcion Y este test, que era el que sostenia el drift.
   */
  it('los 5 estados de entrega mapean EXACTAMENTE a la tabla del contrato', () => {
    expect(estadoDerivadoDeWebhook(true, 'enviado')).toBe('activo')

    // `pendiente` y `reintentando` son la MISMA fila del contrato: la entrega sigue en vuelo.
    expect(estadoDerivadoDeWebhook(true, 'pendiente')).toBe('pendiente')
    expect(estadoDerivadoDeWebhook(true, 'reintentando')).toBe('pendiente')

    // Y estas 2 son filas DISTINTAS: un fallo cerrado no es lo mismo que quedarse sin intentos.
    expect(estadoDerivadoDeWebhook(true, 'fallido')).toBe('con_errores')
    expect(estadoDerivadoDeWebhook(true, 'agotado')).toBe('fallando')
  })

  it('los 6 derivados son alcanzables: ninguna etiqueta del contrato queda muerta', () => {
    const alcanzados = new Set([
      estadoDerivadoDeWebhook(false, null),
      estadoDerivadoDeWebhook(true, null),
      ...ESTADOS_ENTREGA_WEBHOOK.map((estado) => estadoDerivadoDeWebhook(true, estado)),
    ])

    expect([...alcanzados].sort()).toEqual([
      'activo',
      'con_errores',
      'fallando',
      'inactivo',
      'pendiente',
      'sin_envios',
    ])
  })
})
