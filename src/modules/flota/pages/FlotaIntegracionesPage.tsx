import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import { Plug, Plus, SearchX } from 'lucide-react'
import { AccionConMotivo } from '../components/AccionConMotivo'
import { Aviso } from '@/shared/ui/Aviso'
import { SubmenuDelCentro } from '../components/centro/SubmenuDelCentro'
import { CardEventosDisponibles } from '../components/centro/integraciones/CardEventosDisponibles'
import { CardFirmaHmac } from '../components/centro/integraciones/CardFirmaHmac'
import {
  DialogoEliminarWebhook,
  DialogoRotarSecreto,
} from '../components/centro/integraciones/DialogosDeWebhook'
import { FiltrosDeWebhooks } from '../components/centro/integraciones/FiltrosDeWebhooks'
import {
  ListaDeWebhooks,
  type AccionDeWebhook,
} from '../components/centro/integraciones/ListaDeWebhooks'
import { ModalProbarWebhook } from '../components/centro/integraciones/ModalProbarWebhook'
import { ModalSecretoWebhook } from '../components/centro/integraciones/ModalSecretoWebhook'
import { ModalWebhook } from '../components/centro/integraciones/ModalWebhook'
import { SaludDeIntegraciones } from '../components/centro/integraciones/SaludDeIntegraciones'
import { TablaDeEntregas } from '../components/centro/integraciones/TablaDeEntregas'
import { useAlternarEstadoDeWebhook } from '../hooks/useAlternarEstadoDeWebhook'
import { useEntregasWebhook } from '../hooks/useEntregasWebhook'
import { usePermisos } from '@/shared/auth/permissions/usePermisos'
import { useWebhooks } from '../hooks/useWebhooks'
import {
  FILTROS_DE_WEBHOOKS_INICIALES,
  elFiltradoEsDeLaPagina,
  filtrarEntregasPorEndpoint,
  filtrarWebhooks,
  hayFiltrosDeWebhooksActivos,
  saludDeIntegraciones,
  type FiltrosDeWebhooks as Filtros,
} from '../vocabulario-integraciones'
import { parseApiError, resolveApiErrorMessage } from '@/shared/errors/parse-api-error'
import { Boton } from '@/shared/ui/Boton'
import { Card } from '@/shared/ui/Card'
import { EstadoError } from '@/shared/ui/EstadoError'
import { EstadoVacio } from '@/shared/ui/EstadoVacio'
import { SinAccesoOverlay } from '@/shared/ui/SinAccesoOverlay'
import type {
  SecretoWebhookDto,
  WebhookEndpointDto,
  WebhooksPageQuery,
} from '@/services/contracts/flota'

/**
 * `/app/flota/integraciones` — webhooks salientes firmados con HMAC (`f-11`).
 *
 * Es la **unica superficie de Flota que manda datos afuera de la plataforma**, y eso cambia el
 * criterio: un copy optimista acá no confunde a un operador, **le rompe la integracion a un tercero**.
 *
 * ══ LO QUE ESTA PANTALLA NO DIBUJA, Y POR QUE ═══════════════════════════════════════════════════
 *  - **API keys** (card del rail, "Crear key", su tarjeta de la health grid y el catalogo de scopes
 *    `fleet.*`): **fase 2** (decision #5). **0 apariciones de "API key" en el DOM.**
 *  - **"Forzar" / "Reintentar ahora"** — **B-40**: `POST .../reintentar` reencola de verdad, pero
 *    **nadie drena la cola** y el cuerpo original no es reconstruible. El boton prometeria un reenvio
 *    que no va a ocurrir.
 *  - **Filtro por evento** — `eventos[]` viaja **vacio siempre** (PENDIENTE #3): toda opcion distinta
 *    de "Todos" devolveria cero resultados. Es el chip que se manda y no filtra.
 *  - **Boton global "Probar webhook"** del header — **desviacion declarada**: la accion ya existe en
 *    el kebab de cada card, con el endpoint elegido por contexto. El boton global exigiria un modal
 *    selector extra para llegar al mismo `POST`, y una segunda puerta al mismo cuarto es lo que este
 *    modulo evito al plegar "Agregar webhook" en Editar.
 *  - **Cualquier copy de "ventana de gracia"** al rotar — **B-39**: hoy es falso. Ver `CardFirmaHmac`.
 *
 * ══ LOS 2 FILTRADOS SON CLIENT-SIDE Y LA PANTALLA LO ROTULA ═════════════════════════════════════
 * El contrato **no declara query params** ni para el listado de endpoints ni para el log de entregas.
 * La ficha §5 autoriza el filtrado client-side para los webhooks (volumen chico por organizacion), y
 * "ver entregas de este endpoint" no tiene otra forma. Cuando hay **mas de una pagina**, el aviso lo
 * dice: el filtro responde "los que coinciden **y** cayeron en esta pagina".
 */

const PERMISO_LECTURA = 'flota.integraciones.leer'
const PERMISO_GESTION = 'flota.integraciones.gestionar'

/** Constantes de modulo: un objeto nuevo por render dentro de una query key es el patron a evitar. */
const QUERY_DE_ENDPOINTS: WebhooksPageQuery = { pageSize: 100 }
const QUERY_DE_ENTREGAS: WebhooksPageQuery = { pageSize: 50 }

export default function FlotaIntegracionesPage() {
  const { t } = useTranslation('flota')
  const { t: tComun } = useTranslation()
  const navigate = useNavigate()
  const { tienePermiso } = usePermisos()

  const [filtros, setFiltros] = useState<Filtros>(FILTROS_DE_WEBHOOKS_INICIALES)
  const [editando, setEditando] = useState<{ endpoint: WebhookEndpointDto | null } | null>(null)
  const [aProbar, setAProbar] = useState<WebhookEndpointDto | null>(null)
  const [aEliminar, setAEliminar] = useState<WebhookEndpointDto | null>(null)
  const [aRotar, setARotar] = useState<WebhookEndpointDto | null>(null)
  const [secreto, setSecreto] = useState<{ dto: SecretoWebhookDto; origen: 'alta' | 'rotacion' } | null>(
    null,
  )
  const [entregasDe, setEntregasDe] = useState<WebhookEndpointDto | null>(null)

  const endpoints = useWebhooks(QUERY_DE_ENDPOINTS)
  const entregas = useEntregasWebhook(QUERY_DE_ENTREGAS)
  const alternar = useAlternarEstadoDeWebhook()

  const puedeGestionar = tienePermiso(PERMISO_GESTION)

  const errorEndpoints = endpoints.error ? parseApiError(endpoints.error) : null

  if (errorEndpoints?.status === 403) {
    return (
      <div className="relative min-h-96 flex-1">
        <SinAccesoOverlay
          permiso={PERMISO_LECTURA}
          titulo={t('centro.integraciones.sinAcceso.titulo')}
          descripcion={t('centro.integraciones.sinAcceso.descripcion', { permiso: PERMISO_LECTURA })}
          onVolver={() => navigate('/app')}
          textoVolver={t('centro.integraciones.sinAcceso.volver')}
        />
      </div>
    )
  }

  const todos = endpoints.data?.items ?? []
  const paginacion = endpoints.data?.pagination ?? null
  const visibles = filtrarWebhooks(todos, filtros)
  const hayFiltros = hayFiltrosDeWebhooksActivos(filtros)

  const filasDeEntrega = filtrarEntregasPorEndpoint(
    entregas.data?.items ?? [],
    entregasDe?.id ?? null,
  )

  function manejarAccion(accion: AccionDeWebhook, endpoint: WebhookEndpointDto) {
    if (accion === 'editar') setEditando({ endpoint })
    if (accion === 'probar') setAProbar(endpoint)
    if (accion === 'verEntregas') setEntregasDe(endpoint)
    if (accion === 'eliminar') setAEliminar(endpoint)
    if (accion === 'pausar') alternar.mutate({ webhookId: endpoint.id, activo: false })
    if (accion === 'activar') alternar.mutate({ webhookId: endpoint.id, activo: true })
  }

  return (
    <section className="flex flex-col gap-4 lg:flex-row lg:items-start">
      <SubmenuDelCentro activo="integraciones" />

      <div className="flex min-w-0 flex-1 flex-col gap-4">
        <header className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="text-xl font-semibold tracking-snug text-fg-primario">
              {t('centro.integraciones.titulo')}
            </h1>
            <p className="text-sm text-fg-secundario">{t('centro.integraciones.subtitulo')}</p>
          </div>

          <BotonNuevoWebhook
            puedeGestionar={puedeGestionar}
            onAbrir={() => setEditando({ endpoint: null })}
          />
        </header>

        <SaludDeIntegraciones
          salud={saludDeIntegraciones(todos, paginacion)}
          cargando={endpoints.isPending}
        />

        {/*
          Pausar y activar mutan desde el kebab, sin diálogo: si fallan, no hay modal donde poner el
          error. Sin este aviso, el usuario toca "Pausar" y no pasa nada visible.
        */}
        {alternar.error === null ? null : (
          <Aviso
            titulo={t('centro.integraciones.error.tituloAlternar')}
            mensaje={resolveApiErrorMessage(parseApiError(alternar.error), tComun)}
            trazaId={parseApiError(alternar.error).traceId}
          />
        )}

        <div className="flex flex-col gap-4 xl:flex-row xl:items-start">
          <div className="flex min-w-0 flex-1 flex-col gap-4">
            <Card titulo={t('centro.integraciones.lista.titulo')}>
              <div className="flex flex-col gap-3">
                <FiltrosDeWebhooks
                  filtros={filtros}
                  hayFiltros={hayFiltros}
                  onCambio={setFiltros}
                  onLimpiar={() => setFiltros(FILTROS_DE_WEBHOOKS_INICIALES)}
                />

                {elFiltradoEsDeLaPagina(paginacion) ? (
                  <p className="text-xs text-fg-terciario">
                    {t('centro.integraciones.filtros.soloEstaPagina', {
                      cargados: todos.length,
                      total: paginacion?.totalItems ?? todos.length,
                    })}
                  </p>
                ) : null}

                {errorEndpoints !== null && endpoints.data === undefined ? (
                  <EstadoError
                    variante="recuperable"
                    titulo={t('centro.integraciones.error.titulo')}
                    mensaje={resolveApiErrorMessage(errorEndpoints, tComun)}
                    trazaId={errorEndpoints.traceId ?? undefined}
                    textoReintentar={t('centro.reglas.error.reintentar')}
                    onReintentar={() => void endpoints.refetch()}
                  />
                ) : (
                  <ListaDeWebhooks
                    endpoints={visibles}
                    cargando={endpoints.isPending}
                    puedeGestionar={puedeGestionar}
                    onAccion={manejarAccion}
                    vacio={
                      hayFiltros ? (
                        <EstadoVacio
                          variante="sin-resultados"
                          icono={SearchX}
                          titulo={t('centro.integraciones.vacioSinResultados.titulo')}
                          acciones={
                            <Boton
                              variante="secundaria"
                              onClick={() => setFiltros(FILTROS_DE_WEBHOOKS_INICIALES)}
                            >
                              {t('centro.integraciones.vacioSinResultados.limpiar')}
                            </Boton>
                          }
                        />
                      ) : (
                        <EstadoVacio
                          variante="sin-datos"
                          icono={Plug}
                          titulo={t('centro.integraciones.vacioSinDatos.titulo')}
                          descripcion={t('centro.integraciones.vacioSinDatos.descripcion')}
                          acciones={
                            <BotonNuevoWebhook
                              puedeGestionar={puedeGestionar}
                              onAbrir={() => setEditando({ endpoint: null })}
                            />
                          }
                        />
                      )
                    }
                  />
                )}
              </div>
            </Card>

            <Card titulo={t('centro.integraciones.entregas.titulo')}>
              <div className="flex flex-col gap-3">
                <p className="text-xs text-fg-terciario">
                  {t('centro.integraciones.entregasDeTodaLaOrganizacion')}
                </p>

                {/*
                  ⚠️ EL ALCANCE, DICHO. Esta tabla NO pagina y se sirve con `pageSize: 50`: con 300
                  entregas se ven 50. Sin esta línea, el copy de arriba ("de toda la organización")
                  se lee como "estas son todas". Es el mismo rótulo cargadas/total que la lista de
                  webhooks tiene 10 cm más arriba — faltaba acá.
                */}
                {elFiltradoEsDeLaPagina(entregas.data?.pagination ?? null) ? (
                  <p className="text-xs text-fg-terciario">
                    {t('centro.integraciones.entregas.soloEstaPagina', {
                      cargadas: entregas.data?.items.length ?? 0,
                      total: entregas.data?.pagination.totalItems ?? 0,
                    })}
                  </p>
                ) : null}

                {entregasDe === null ? null : (
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-xs text-fg-secundario">
                      {t('centro.integraciones.entregas.filtradoPor', { nombre: entregasDe.nombre })}
                    </span>
                    <Boton variante="secundaria" tamano="sm" onClick={() => setEntregasDe(null)}>
                      {t('centro.integraciones.entregas.quitarFiltro')}
                    </Boton>
                  </div>
                )}

                {/*
                  B-40. Una fila en "En reintento" NO avanza sola: nadie drena la cola. Sin esta
                  línea, `proximoIntentoUtc` se lee como una promesa de reenvío.
                */}
                <p className="text-xs text-fg-terciario">
                  {t('centroBloqueado.reintentarEntregas')}
                </p>

                <TablaDeEntregas
                  entregas={filasDeEntrega}
                  endpoints={todos}
                  cargando={entregas.isPending}
                  vacio={
                    /*
                      `empty sin datos` ≠ `empty sin resultados`, la misma distinción que respetan
                      vehículos, dispositivos y conductores. Con el filtro por endpoint puesto, "no
                      hay entregas registradas" sería falso: puede haber 50 y ninguna de ESTE
                      endpoint. Y el vacío por filtro trae su salida.
                    */
                    entregasDe !== null ? (
                      <EstadoVacio
                        variante="sin-resultados"
                        icono={SearchX}
                        titulo={t('centro.integraciones.vacioSinEntregasDelEndpoint.titulo', {
                          nombre: entregasDe.nombre,
                        })}
                        acciones={
                          <Boton
                            variante="secundaria"
                            onClick={() => setEntregasDe(null)}
                          >
                            {t('centro.integraciones.vacioSinEntregasDelEndpoint.verTodas')}
                          </Boton>
                        }
                      />
                    ) : (
                      <EstadoVacio
                        variante="sin-datos"
                        titulo={t('centro.integraciones.vacioSinEntregas.titulo')}
                        descripcion={t('centro.integraciones.vacioSinEntregas.descripcion')}
                      />
                    )
                  }
                  error={
                    entregas.error && entregas.data === undefined ? (
                      <EstadoError
                        variante="recuperable"
                        titulo={t('centro.integraciones.entregas.error')}
                        mensaje={resolveApiErrorMessage(parseApiError(entregas.error), tComun)}
                        textoReintentar={t('centro.reglas.error.reintentar')}
                        onReintentar={() => void entregas.refetch()}
                      />
                    ) : undefined
                  }
                />
              </div>
            </Card>
          </div>

          <aside className="flex w-full flex-col gap-4 xl:w-80 xl:shrink-0">
            {/*
              La card de firma cuelga del endpoint SELECCIONADO (el que se está mirando en la tabla
              de entregas) o, si no hay ninguno, del primero de la lista: la huella y la rotación son
              POR endpoint, y una card sin dueño mostraría la huella de cualquiera.
            */}
            <CardFirmaHmac
              endpoint={entregasDe ?? visibles[0] ?? null}
              puedeGestionar={puedeGestionar}
              onRotar={setARotar}
            />
            <CardEventosDisponibles />
          </aside>
        </div>
      </div>

      <ModalWebhook
        abierto={editando !== null}
        endpoint={editando?.endpoint ?? null}
        onCerrar={() => setEditando(null)}
        onCreado={(dto) => setSecreto({ dto, origen: 'alta' })}
      />

      <ModalProbarWebhook
        webhookId={aProbar?.id ?? null}
        nombre={aProbar?.nombre ?? ''}
        abierto={aProbar !== null}
        onCerrar={() => setAProbar(null)}
      />

      <DialogoEliminarWebhook endpoint={aEliminar} onCerrar={() => setAEliminar(null)} />

      <DialogoRotarSecreto
        endpoint={aRotar}
        onCerrar={() => setARotar(null)}
        onRotado={(dto) => setSecreto({ dto, origen: 'rotacion' })}
      />

      <ModalSecretoWebhook
        secreto={secreto?.dto ?? null}
        origen={secreto?.origen ?? 'alta'}
        onCerrar={() => setSecreto(null)}
      />
    </section>
  )
}

function BotonNuevoWebhook({
  puedeGestionar,
  onAbrir,
}: {
  puedeGestionar: boolean
  onAbrir: () => void
}) {
  const { t } = useTranslation('flota')

  const motivo = puedeGestionar
    ? undefined
    : t('centro.integraciones.acciones.sinPermiso', { permiso: PERMISO_GESTION })

  return (
    <AccionConMotivo motivo={motivo}>
      <Boton iconoIzq={Plus} deshabilitado={!puedeGestionar} onClick={onAbrir}>
        {t('centro.integraciones.vacioSinDatos.cta')}
      </Boton>
    </AccionConMotivo>
  )
}
