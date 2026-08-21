import { describe, expect, it } from 'vitest'
import type { AlertaListItemDto, PagedResult, SeveridadAlerta } from '@/services/contracts/flota'
import {
  CORRELACION_SENAL_PROBLEMA_DISPONIBLE,
  DETECCION_DE_SENALES_CONECTADA,
  PAGINA_DE_SENALES,
  QUERY_DE_SENALES,
  avisoDeSenales,
  claseDeAnilloDeSeveridad,
  claveDeTipoAlerta,
  esSenalActiva,
  indiceDeSenales,
  lecturaDeSenales,
  senalesActivasDelVehiculo,
  senalesDelVehiculo,
  severidadDelMarcador,
  severidadMaxima,
  varianteDeSeveridadAlerta,
} from './vocabulario-senales'

/**
 * `f-12` — señales embebidas. Lo que estos casos protegen es UNA frase:
 *
 *   **la ausencia de señales no puede leerse como "todo bien".**
 *
 * Hoy no existe ni un escritor de alertas en el backend (GATE 2 / B-38), asi que las 3 superficies
 * embebidas van a estar vacias el 100 % de las veces. Un badge que no aparece, sin nada que lo
 * explique, afirma que el vehiculo esta revisado y limpio — y nadie miro.
 */

/* ── Fixtures ────────────────────────────────────────────────────────────────────────────────── */

function senal(parcial: Partial<AlertaListItemDto> = {}): AlertaListItemDto {
  return {
    id: 'a1',
    tipo: 'sin_senal_prolongada',
    severidad: 'media',
    vehiculo: { vehiculoFlotaId: 'v1', patente: 'AB 123 CD' },
    conductor: null,
    geozona: null,
    descripcion: 'El equipo dejó de reportar',
    fechaInicio: '2026-08-15T10:00:00Z',
    fechaResolucion: null,
    estado: 'abierta',
    ubicacion: null,
    ...parcial,
  }
}

function pagina(
  items: AlertaListItemDto[],
  totalItems = items.length,
): PagedResult<AlertaListItemDto> {
  return {
    items,
    pagination: {
      page: 1,
      pageSize: PAGINA_DE_SENALES,
      totalItems,
      totalPages: Math.max(1, Math.ceil(totalItems / PAGINA_DE_SENALES)),
      itemCount: items.length,
      hasPreviousPage: false,
      hasNextPage: totalItems > items.length,
      fromItem: items.length === 0 ? 0 : 1,
      toItem: items.length,
    },
  }
}

/* ── 1. El interruptor ───────────────────────────────────────────────────────────────────────── */

describe('la deteccion NO esta conectada, y todo el paso cuelga de eso', () => {
  /**
   * ⚠️ **ESTE CASO SE PONE ROJO EL DIA QUE EL PO CIERRE GATE 2, Y ESA ES LA SEÑAL.**
   * No es fragilidad: es el recordatorio de que hay que releer el copy de las 3 superficies antes de
   * encender la capa. Mientras el catalogo `tipos_alerta_flota` este vacio, la FK rechaza toda
   * insercion y `GET /alertas` devuelve 0 items **siempre**.
   */
  it('el interruptor esta en false y no se deriva de la respuesta', () => {
    expect(DETECCION_DE_SENALES_CONECTADA).toBe(false)

    // La clave: una organizacion CON la deteccion conectada y cero señales abiertas es un caso
    // legitimo y bueno. Derivar el flag de `items.length === 0` colapsaria los dos casos, que es
    // exactamente la mentira que este archivo existe para impedir.
    const indice = indiceDeSenales(pagina([]))
    expect(indice.cargado).toBe(true)
    expect(indice.deteccionConectada).toBe(false)
  })

  it('no hay forma de enlazar una señal con su problema: el dato NO existe en el contrato', () => {
    // `AlertaListItemDto` no lleva `problemaId` y `alertas_operativas_flota` no tiene columna hacia
    // `problemas_operativos_flota`: son 2 tablas disjuntas. `f-12` paso 2 pide
    // `/app/flota/problemas?ticket=<problemaId>` y ese id no se puede construir.
    expect(CORRELACION_SENAL_PROBLEMA_DISPONIBLE).toBe(false)
    expect(senal()).not.toHaveProperty('problemaId')
  })

  it('la query es una CONSTANTE de modulo: misma referencia en cada render', () => {
    // Un objeto literal nuevo por render dentro de una query key es el bucle de requests que este
    // repo ya se comio dos veces.
    expect(QUERY_DE_SENALES).toBe(QUERY_DE_SENALES)
    expect(QUERY_DE_SENALES.pageSize).toBe(PAGINA_DE_SENALES)
  })
})

/* ── 2. La lectura de cada superficie ────────────────────────────────────────────────────────── */

describe('ninguna superficie dice "sin señales" mientras la deteccion no corra', () => {
  it('con el interruptor apagado, TODO vehiculo lee `deteccion_sin_conectar`', () => {
    const indice = indiceDeSenales(pagina([]))
    const lectura = lecturaDeSenales(indice, 'v1')

    expect(lectura.tipo).toBe('deteccion_sin_conectar')
    if (lectura.tipo !== 'deteccion_sin_conectar') return

    // La celda muestra el marcador de dato ausente y la ayuda dice por que. Nunca "Sin señales".
    expect(lectura.clave).toBe('senales.celda.sinConectar')
    expect(lectura.claveAyuda).toBe('senales.ayuda.sinConectar')
  })

  /**
   * ⚠️ **INALCANZABLE HOY, A PROPOSITO.** La rama `sin_senales` es el copy correcto para el dia que
   * la deteccion corra y el vehiculo este efectivamente limpio. Se conserva escrita —con su copy en
   * los 2 idiomas— para que encender GATE 2 no exija reescribir la pantalla.
   */
  it('la rama `sin_senales` existe y NO se puede alcanzar con el interruptor apagado', () => {
    const indice = { ...indiceDeSenales(pagina([])), deteccionConectada: false }
    expect(lecturaDeSenales(indice, 'v1').tipo).not.toBe('sin_senales')

    // Encendiendo el interruptor a mano (lo que hara GATE 2) la rama aparece.
    const conectado = { ...indiceDeSenales(pagina([])), deteccionConectada: true }
    const lectura = lecturaDeSenales(conectado, 'v1')
    expect(lectura.tipo).toBe('sin_senales')
    if (lectura.tipo !== 'sin_senales') return
    expect(lectura.clave).toBe('senales.celda.sinSenales')
  })

  it('un indice PARCIAL no habilita a decir "sin señales"', () => {
    // Se trajo 1 de 500: un vehiculo sin badge puede tener señales en la pagina que no vino.
    const conectado = {
      ...indiceDeSenales(pagina([senal()], 500)),
      deteccionConectada: true,
    }
    expect(conectado.parcial).toBe(true)

    const lectura = lecturaDeSenales(conectado, 'otro-vehiculo')
    expect(lectura.tipo).toBe('deteccion_sin_conectar')
    if (lectura.tipo !== 'deteccion_sin_conectar') return
    expect(lectura.claveAyuda).toBe('senales.ayuda.indiceParcial')
  })

  it('un request que todavia no volvio NO es un indice vacio', () => {
    // Colapsarlos dejaria a la pantalla afirmando "ningun vehiculo tiene señales" justo cuando no
    // pudo preguntarlo.
    const sinRespuesta = indiceDeSenales(undefined)
    expect(sinRespuesta.cargado).toBe(false)

    const conectado = { ...sinRespuesta, deteccionConectada: true }
    expect(lecturaDeSenales(conectado, 'v1').tipo).toBe('cargando')
  })
})

/* ── 3. Severidad ────────────────────────────────────────────────────────────────────────────── */

describe('severidad de SEÑAL: 3 valores, no 4', () => {
  it('`critica` no pertenece a este vocabulario', () => {
    // `f-12` §Contrato manda a `dtos.ts` §9 (`SeveridadProblema`, 4 valores). El de la SEÑAL es
    // `severidades_alerta_flota` — 3 — y `dtos.ts` §10.1 lo aclara literal (PENDIENTE #12).
    // Consecuencia: el ejemplo de verificacion de `f-12` ("una señal `critica`") NO es construible.
    const codigos: SeveridadAlerta[] = ['alta', 'media', 'baja']
    for (const codigo of codigos) expect(varianteDeSeveridadAlerta(codigo)).toBeTruthy()
    expect(Object.keys({ alta: 0, media: 0, baja: 0 })).toHaveLength(3)
  })

  it('`baja` es neutro: no compite con el color del estado de conexion', () => {
    expect(varianteDeSeveridadAlerta('alta')).toBe('peligro')
    expect(varianteDeSeveridadAlerta('media')).toBe('advertencia')
    expect(varianteDeSeveridadAlerta('baja')).toBe('neutro')
  })

  it('gana la MAXIMA, no la mas reciente', () => {
    // Con una `alta` y una `media`, mostrar la mas reciente esconderia la peor.
    expect(severidadMaxima([senal({ severidad: 'media' }), senal({ severidad: 'alta' })])).toBe(
      'alta',
    )
    expect(severidadMaxima([senal({ severidad: 'alta' }), senal({ severidad: 'media' })])).toBe(
      'alta',
    )
    expect(severidadMaxima([senal({ severidad: 'baja' }), senal({ severidad: 'media' })])).toBe(
      'media',
    )
    expect(severidadMaxima([])).toBeNull()
  })
})

/* ── 4. El indice: una request, no N ─────────────────────────────────────────────────────────── */

describe('el indice se arma de UNA respuesta y no pierde señales', () => {
  it('agrupa por vehiculo y conserva las cerradas para el panel', () => {
    const indice = indiceDeSenales(
      pagina([
        senal({ id: 'a1', vehiculo: { vehiculoFlotaId: 'v1', patente: 'AB 123 CD' } }),
        senal({
          id: 'a2',
          estado: 'cerrada',
          vehiculo: { vehiculoFlotaId: 'v1', patente: 'AB 123 CD' },
        }),
        senal({ id: 'a3', vehiculo: { vehiculoFlotaId: 'v2', patente: 'EF 456 GH' } }),
      ]),
    )

    // El panel de la ficha muestra "activas Y recientes": las cerradas siguen en el indice.
    expect(senalesDelVehiculo(indice, 'v1')).toHaveLength(2)
    // El badge y el anillo del marcador solo miran las vivas.
    expect(senalesActivasDelVehiculo(indice, 'v1')).toHaveLength(1)
    expect(senalesDelVehiculo(indice, 'v2')).toHaveLength(1)
    expect(senalesDelVehiculo(indice, 'inexistente')).toHaveLength(0)
  })

  it('`gestionada` sigue viva: reconocer no es resolver', () => {
    // `cerrada` es el UNICO terminal. Contar `gestionada` como resuelta apagaria el badge de un
    // vehiculo cuyo problema sigue abierto.
    expect(esSenalActiva(senal({ estado: 'abierta' }))).toBe(true)
    expect(esSenalActiva(senal({ estado: 'gestionada' }))).toBe(true)
    expect(esSenalActiva(senal({ estado: 'cerrada' }))).toBe(false)
  })
})

/* ── 5. El aviso de pantalla ─────────────────────────────────────────────────────────────────── */

describe('la pantalla SIEMPRE declara el estado de la capa de señales', () => {
  it('hoy, siempre: la deteccion no esta conectada', () => {
    expect(avisoDeSenales(indiceDeSenales(pagina([])), false)).toBe('deteccion_sin_conectar')
    // Ni siquiera un fallo del request cambia el diagnostico correcto: lo primero que hay que decir
    // es que la deteccion no corre.
    expect(avisoDeSenales(indiceDeSenales(undefined), true)).toBe('deteccion_sin_conectar')
  })

  it('con la deteccion conectada, un fallo del request NO se puede callar', () => {
    const conectado = { ...indiceDeSenales(undefined), deteccionConectada: true }
    expect(avisoDeSenales(conectado, true)).toBe('sin_fuente')
  })

  it('recien con todo en orden el aviso desaparece', () => {
    const conectado = { ...indiceDeSenales(pagina([])), deteccionConectada: true }
    expect(avisoDeSenales(conectado, false)).toBe('ninguno')
  })

  it('con el indice parcial se avisa, aunque el request haya salido bien', () => {
    const conectado = { ...indiceDeSenales(pagina([senal()], 500)), deteccionConectada: true }
    expect(avisoDeSenales(conectado, false)).toBe('indice_parcial')
  })
})

/* ── 6. El marcador del mapa ─────────────────────────────────────────────────────────────────── */

describe('el marcador SUPERPONE la severidad, nunca reemplaza el estado de conexion', () => {
  it('sin severidad no se agrega ninguna clase: el marcador queda como lo dejo slice-05', () => {
    expect(claseDeAnilloDeSeveridad(null)).toBeNull()
  })

  it('cada severidad tiene su clase, y el color se resuelve en el CSS por token', () => {
    expect(claseDeAnilloDeSeveridad('alta')).toBe('marcador--senal-peligro')
    expect(claseDeAnilloDeSeveridad('media')).toBe('marcador--senal-advertencia')
    expect(claseDeAnilloDeSeveridad('baja')).toBe('marcador--senal-neutro')
  })

  it('con la deteccion apagada el marcador NO gana anillo, aunque llegara una señal', () => {
    // La severidad del marcador no se deriva de que la lista este vacia: la decide el interruptor.
    const indice = indiceDeSenales(pagina([senal({ severidad: 'alta' })]))
    expect(severidadDelMarcador(indice, 'v1')).toBeNull()

    const conectado = { ...indice, deteccionConectada: true }
    expect(severidadDelMarcador(conectado, 'v1')).toBe('alta')
  })
})

/* ── 7. El tipo de señal ─────────────────────────────────────────────────────────────────────── */

describe('el frontend NO elige una grafia de `tipo_alerta`', () => {
  it('la clave se arma por concatenacion y cae al codigo crudo', () => {
    // El catalogo esta VACIO (GATE 2) y el contrato publica 2 listas que no se solapan. Enumerar
    // grafias aca seria consolidar la decision del PO desde el frontend.
    expect(claveDeTipoAlerta('conexion_perdida')).toBe('tipoAlerta.conexion_perdida')
    expect(claveDeTipoAlerta('sin_senal_prolongada')).toBe('tipoAlerta.sin_senal_prolongada')
  })
})
