import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import { Plus, SlidersHorizontal } from 'lucide-react'
import { AccionConMotivo } from '../components/AccionConMotivo'
import { Aviso } from '@/shared/ui/Aviso'
import { SubmenuDelCentro } from '../components/centro/SubmenuDelCentro'
import { ModalProbarWebhook } from '../components/centro/integraciones/ModalProbarWebhook'
import { ModalRegla } from '../components/centro/reglas/ModalRegla'
import { ResumenDeReglas } from '../components/centro/reglas/ResumenDeReglas'
import { TablaDeReglas } from '../components/centro/reglas/TablaDeReglas'
import { useAlternarEstadoDeRegla } from '../hooks/useAlternarEstadoDeRegla'
import { usePermisos } from '@/shared/auth/permissions/usePermisos'
import { useReglasProblemas } from '../hooks/useReglasProblemas'
import { nombreDeLaCopia, resumenDeReglas, type AccionDeRegla } from '../vocabulario-reglas-problemas'
import { parseApiError, resolveApiErrorMessage } from '@/shared/errors/parse-api-error'
import { Boton } from '@/shared/ui/Boton'
import { EstadoError } from '@/shared/ui/EstadoError'
import { EstadoVacio } from '@/shared/ui/EstadoVacio'
import { Paginacion } from '@/shared/ui/Paginacion'
import { SinAccesoOverlay } from '@/shared/ui/SinAccesoOverlay'
import type { ReglaProblemaDto, ReglasPageQuery } from '@/services/contracts/flota'

/**
 * `/app/flota/problemas/reglas` — las reglas que convierten senales en problemas (`f-10`).
 *
 * ══ LO QUE ESTA PANTALLA NO DIBUJA, Y POR QUE ═══════════════════════════════════════════════════
 *  - **Toolbar de filtros y busqueda** (ficha §5, `f-10` paso 5) — **B-17**: `ReglasPageQuery` es
 *    `PageQuery` pelado, `api.md` dice "con filtros" y **no nombra ninguno**, y el binder descarta lo
 *    que no declara. Un chip que se manda y no filtra ya rompio 2 veces en este modulo (D-S3-33).
 *    Consecuencia declarada: el estado **"empty sin resultados"** de la ficha §9 es **inalcanzable**,
 *    porque no hay filtro que pueda vaciar la lista. Su copy queda escrito y sin consumidor.
 *  - **Exportar** — **desviacion declarada de `f-10` paso 8**, que pedia el boton deshabilitado con
 *    hint. `api.md` §Reglas declara **3 filas** y ninguna es export: no hay endpoint **ni fila de
 *    contrato**, a diferencia de los 3 `/exportar` de slice-05, que existen y estan bloqueados por
 *    un `code` faltante (**B-34**). Dibujar el boton prometeria una capacidad que el contrato nunca
 *    contrato, y ademas seria el unico Exportar visible del modulo: los otros 3 listados no lo
 *    dibujan. Se omite.
 *  - **"Ver activaciones", "Probar regla"** (sin fila en `api.md`) y **"Ver geozonas"** (DIFERIDO
 *    DA-08): ausentes del kebab, no deshabilitados.
 *  - **Eliminar**: no existe `DELETE` (DA-PR-03). La baja **es** pausar, y el kebab lo dice asi.
 *
 * ══ EL VACIO NO PUEDE DECIR "TODAVIA NO CONFIGURASTE REGLAS" A SECAS ════════════════════════════
 * Hoy el listado devuelve **0 filas en toda organizacion**, y no porque el usuario haya decidido no
 * tener reglas: las **8 reglas seed** de `motor-de-reglas.md` §7 **no se siembran** —
 * `FlotaActivacionSeedService` no existe (deuda de slice-01) y la tabla de configuracion
 * por-organizacion no la nombra ningun documento (PENDIENTE #4). El copy de la ficha §9 sigue siendo
 * cierto y **le falta esa mitad**, que es la que evita que el usuario crea que perdio su
 * configuracion. Mismo patron con que el mapa tuvo que partir su vacio (D-S5M-1).
 */

const PERMISO_LECTURA = 'flota.reglas.leer'
const PERMISO_GESTION = 'flota.reglas.gestionar'
const PERMISO_PROBAR_WEBHOOK = 'flota.integraciones.gestionar'

const OPCIONES_TAMANO_PAGINA = [10, 20, 50, 100]

interface Edicion {
  modo: 'crear' | 'editar' | 'duplicar'
  regla: ReglaProblemaDto | null
}

export default function ReglasProblemasPage() {
  const { t } = useTranslation('flota')
  const { t: tComun } = useTranslation()
  const navigate = useNavigate()
  const { tienePermiso } = usePermisos()

  const [pagina, setPagina] = useState(1)
  const [tamanoPagina, setTamanoPagina] = useState(20)
  const [edicion, setEdicion] = useState<Edicion | null>(null)
  const [aProbar, setAProbar] = useState<ReglaProblemaDto | null>(null)

  const query: ReglasPageQuery = { page: pagina, pageSize: tamanoPagina }
  const consulta = useReglasProblemas(query)
  const alternar = useAlternarEstadoDeRegla()

  const puedeGestionar = tienePermiso(PERMISO_GESTION)
  const puedeProbarWebhook = tienePermiso(PERMISO_PROBAR_WEBHOOK)

  const errorApi = consulta.error ? parseApiError(consulta.error) : null

  if (errorApi?.status === 403) {
    return (
      <div className="relative min-h-96 flex-1">
        <SinAccesoOverlay
          permiso={PERMISO_LECTURA}
          titulo={t('centro.reglas.sinAcceso.titulo')}
          descripcion={t('centro.reglas.sinAcceso.descripcion', { permiso: PERMISO_LECTURA })}
          onVolver={() => navigate('/app')}
          textoVolver={t('centro.reglas.sinAcceso.volver')}
        />
      </div>
    )
  }

  const reglas = consulta.data?.items ?? []
  const paginacion = consulta.data?.pagination ?? null
  const hayDatosEnMano = consulta.data !== undefined

  return (
    <section className="flex flex-col gap-4 lg:flex-row lg:items-start">
      {/* Sin `onVista`: desde acá las 3 vistas NAVEGAN al Centro, no conmutan nada de esta página. */}
      <SubmenuDelCentro activo="reglas" />

      <div className="flex min-w-0 flex-1 flex-col gap-4">
        <header className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="text-xl font-semibold tracking-snug text-fg-primario">
              {t('centro.reglas.titulo')}
            </h1>
            <p className="text-sm text-fg-secundario">{t('centro.reglas.subtitulo')}</p>
          </div>

          <BotonNuevaRegla
            puedeGestionar={puedeGestionar}
            onAbrir={() => setEdicion({ modo: 'crear', regla: null })}
          />
        </header>

        <ResumenDeReglas
          resumen={resumenDeReglas(reglas, paginacion)}
          cargando={consulta.isPending}
        />

        {errorApi && hayDatosEnMano ? (
          <Aviso
            titulo={t('centro.reglas.error.tituloRefresco')}
            mensaje={resolveApiErrorMessage(errorApi, tComun)}
            trazaId={errorApi.traceId}
            accion={
              <Boton variante="secundaria" tamano="sm" onClick={() => void consulta.refetch()}>
                {t('centro.reglas.error.reintentar')}
              </Boton>
            }
          />
        ) : null}

        {/*
          Pausar y activar mutan desde el kebab, sin modal: si fallan, no hay diálogo abierto donde
          poner el error. Sin este aviso, el usuario toca "Pausar", la fila no cambia y no pasa nada
          visible — el modo de falla que este módulo corrigió 3 veces.
        */}
        {alternar.error === null ? null : (
          <Aviso
            titulo={t('centro.reglas.error.tituloAlternar')}
            mensaje={resolveApiErrorMessage(parseApiError(alternar.error), tComun)}
            trazaId={parseApiError(alternar.error).traceId}
          />
        )}

        <p className="text-xs text-fg-terciario">{t('centro.reglas.ordenFijo')}</p>

        <TablaDeReglas
          reglas={reglas}
          cargando={consulta.isPending}
          puedeGestionar={puedeGestionar}
          puedeProbarWebhook={puedeProbarWebhook}
          onAccion={(accion, regla) =>
            manejarAccion({
              accion,
              regla,
              setEdicion,
              setAProbar,
              alternar: (reglaId, activa) => alternar.mutate({ reglaId, activa }),
              navigate,
              t,
            })
          }
          vacio={
            <EstadoVacio
              variante="sin-datos"
              icono={SlidersHorizontal}
              titulo={t('centro.reglas.vacioSinDatos.titulo')}
              descripcion={t('centro.reglas.vacioSinDatos.descripcion')}
              acciones={
                <>
                  <BotonNuevaRegla
                    puedeGestionar={puedeGestionar}
                    onAbrir={() => setEdicion({ modo: 'crear', regla: null })}
                  />
                  {/*
                    La segunda mitad del vacio: hoy NADIE tiene reglas porque el seed no corre. Sin
                    esta linea, el titulo "Aun no configuraste reglas" le echa la culpa al usuario.
                  */}
                  <p className="max-w-prose text-xs text-fg-terciario">
                    {t('centro.reglas.vacioSinSeed')}
                  </p>
                </>
              }
            />
          }
          error={
            errorApi && !hayDatosEnMano ? (
              <EstadoError
                variante="recuperable"
                titulo={t('centro.reglas.error.titulo')}
                mensaje={resolveApiErrorMessage(errorApi, tComun)}
                trazaId={errorApi.traceId ?? undefined}
                textoReintentar={t('centro.reglas.error.reintentar')}
                onReintentar={() => void consulta.refetch()}
              />
            ) : undefined
          }
        />

        {paginacion !== null && paginacion.totalItems > 0 ? (
          <Paginacion
            pagina={paginacion.page}
            tamanoPagina={paginacion.pageSize}
            total={paginacion.totalItems}
            opcionesTamano={OPCIONES_TAMANO_PAGINA}
            deshabilitada={consulta.isFetching}
            onCambio={(cambio) => {
              if (cambio.tamanoPagina !== paginacion.pageSize) {
                setTamanoPagina(cambio.tamanoPagina)
                return
              }
              setPagina(cambio.pagina)
            }}
            textos={{
              anterior: t('centro.reglas.paginacion.anterior'),
              siguiente: t('centro.reglas.paginacion.siguiente'),
              porPagina: t('centro.reglas.paginacion.porPagina'),
              rango: (desde, hasta, total) =>
                t('centro.reglas.paginacion.rango', { desde, hasta, total, count: total }),
            }}
          />
        ) : null}
      </div>

      <ModalRegla
        abierto={edicion !== null}
        regla={edicion?.regla ?? null}
        modo={edicion?.modo ?? 'crear'}
        onCerrar={() => setEdicion(null)}
      />

      <ModalProbarWebhook
        webhookId={aProbar?.webhookEndpointId ?? null}
        nombre={aProbar?.nombre ?? ''}
        abierto={aProbar !== null}
        onCerrar={() => setAProbar(null)}
      />
    </section>
  )
}

/**
 * Reparto de las 6 acciones del kebab.
 *
 * ⚠️ **Pausar y activar mutan sin modal, a proposito**: son el `PATCH { activa }` mas simple del
 * contrato y **no son destructivos** —la fila no desaparece, pasa a `Inactiva`, y su historial y sus
 * senales quedan—. Un dialogo de confirmacion ahi entrenaria al usuario a confirmar sin leer, que es
 * lo que despues hace peligroso el dialogo de una baja real.
 *
 * ⚠️ **Duplicar NO tiene endpoint** (`f-10` paso 6): clona en el modal de ALTA y guarda con el
 * `POST` normal. Por eso el modo es `duplicar` y no `editar` — con `editar`, el submit haria un
 * `PATCH` sobre la regla original y la pisaria.
 */
function manejarAccion({
  accion,
  regla,
  setEdicion,
  setAProbar,
  alternar,
  navigate,
  t,
}: {
  accion: AccionDeRegla
  regla: ReglaProblemaDto
  setEdicion: (edicion: Edicion) => void
  setAProbar: (regla: ReglaProblemaDto) => void
  alternar: (reglaId: string, activa: boolean) => void
  navigate: (ruta: string) => void
  t: (clave: string) => string
}) {
  if (accion === 'pausar' || accion === 'activar') {
    alternar(regla.id, accion === 'activar')
    return
  }

  if (accion === 'editar') {
    setEdicion({ modo: 'editar', regla })
    return
  }

  if (accion === 'duplicar') {
    setEdicion({
      modo: 'duplicar',
      regla: { ...regla, nombre: nombreDeLaCopia(regla.nombre, t('centro.reglas.duplicarSufijo')) },
    })
    return
  }

  if (accion === 'probarWebhook') {
    setAProbar(regla)
    return
  }

  if (accion === 'verConductores') {
    navigate('/app/flota/conductores')
  }
}

function BotonNuevaRegla({
  puedeGestionar,
  onAbrir,
}: {
  puedeGestionar: boolean
  onAbrir: () => void
}) {
  const { t } = useTranslation('flota')

  const motivo = puedeGestionar
    ? undefined
    : t('centro.reglas.acciones.sinPermiso', { permiso: PERMISO_GESTION })

  return (
    <AccionConMotivo motivo={motivo}>
      <Boton iconoIzq={Plus} deshabilitado={!puedeGestionar} onClick={onAbrir}>
        {t('centro.reglas.vacioSinDatos.cta')}
      </Boton>
    </AccionConMotivo>
  )
}
