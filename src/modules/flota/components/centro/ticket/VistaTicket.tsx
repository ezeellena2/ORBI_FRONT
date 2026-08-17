import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useLocation, useNavigate } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import { parseApiError, resolveApiErrorMessage } from '@/shared/errors/parse-api-error'
import { Boton } from '@/shared/ui/Boton'
import { EstadoError } from '@/shared/ui/EstadoError'
import { SinAccesoOverlay } from '@/shared/ui/SinAccesoOverlay'
import { Skeleton } from '@/shared/ui/Skeleton'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/shared/ui/base/tabs'
import { HeroDelTicket } from './HeroDelTicket'
import { TabIntegracionesTicket } from './TabIntegracionesTicket'
import { TabReglaTicket } from './TabReglaTicket'
import { TabResumenTicket } from './TabResumenTicket'
import { TabTimelineTicket } from './TabTimelineTicket'
import type { AccionDeMutacionProblema } from '../BarraDeAccionesProblema'
import { DesgloseDePrioridad } from '../DesgloseDePrioridad'
import { EstadoEnVivoDelVehiculo } from '../EstadoEnVivoDelVehiculo'
import { ModalResolverProblema } from '../ModalResolverProblema'
import { ModalSilenciarProblema } from '../ModalSilenciarProblema'
import { useProblemaDetalle } from '../../../hooks/useProblemaDetalle'
import {
  claveDeGuiaDeErrorCentro,
  tratamientoDeErrorCentro,
} from '../../../vocabulario-centro-problemas'
import {
  TABS_DEL_TICKET,
  claveDeTabDelTicket,
  contarTimeline,
  tabLlevaContador,
} from '../../../vocabulario-ticket-problema'

const PERMISO_LECTURA = 'flota.problemas.leer'
const RUTA_DEL_CENTRO = '/app/flota/problemas'

/**
 * `?ticket=<problemaId>` — el **caso completo** (ficha §2, zona ticket).
 *
 * Es la única vista del Centro con endpoint propio (`GET /problemas/{problemaId}`); las otras 3
 * agrupan la misma bandeja paginada. Por eso acá no hay derivados "de la página": lo que se muestra
 * es del problema.
 *
 * ══ EL `?ticket=` GANA SOBRE EL `?vista=` ══════════════════════════════════════════════════════
 * `f-06` lo había diferido (`TICKET_COMPLETO_DISPONIBLE = false`) porque esta vista no existía y un
 * deep-link a un placeholder es peor que un deep-link a la Sala. Con la vista construida, el param
 * vuelve a su significado contratado y la **selección** de la Sala pasa a estado local — que es lo
 * que la ficha §8 describe (1.er click selecciona y **no navega**).
 *
 * ══ LOS 5 ESTADOS ══════════════════════════════════════════════════════════════════════════════
 *  - **loading**: esqueleto de hero + tabs.
 *  - **forbidden**: overlay que BLOQUEA con el permiso literal, nunca redirect (B-3).
 *  - **error 404**: "este problema no existe o no pertenece a tu organización". No se distingue
 *    cross-tenant de "no existe", **a propósito**: decirlo filtraría existencia ajena.
 *  - **error otro**: recuperable con reintento, sin perder la URL.
 *  - **partial-data**: `contextoOperativo` en `null` (Telemetría caída) no rompe nada — el resto del
 *    ticket se muestra igual. Y `webhooks[]` llega vacío **siempre**, que es otra clase de
 *    partial-data y el tab lo declara.
 *  - **empty**: no aplica — un ticket siempre tiene problema; el id inexistente es el 404.
 */
export function VistaTicket({ problemaId }: { problemaId: string }) {
  const { t } = useTranslation('flota')
  const navigate = useNavigate()
  const ubicacion = useLocation()

  /** Un modal por vez. Opera siempre sobre este problema. */
  const [modal, setModal] = useState<'ninguno' | 'silenciar' | 'resolver'>('ninguno')

  const consulta = useProblemaDetalle(problemaId)
  const apiError = consulta.error ? parseApiError(consulta.error) : null

  /*
    Volver a la última vista de lista usada (`f-09` paso 2), conservando su query.

    `location.key === 'default'` significa que esta URL es la PRIMERA entrada del historial de la
    app: el usuario llegó por un link compartido o por un F5. Ahí `navigate(-1)` lo sacaría del sitio
    —o lo devolvería a la pestaña anterior—, así que se cae al Centro. Con historial propio sí se usa
    el `-1`, que es lo único que preserva el `?vista=` y la página en la que estaba.
  */
  function volver() {
    if (ubicacion.key === 'default') navigate(RUTA_DEL_CENTRO)
    else navigate(-1)
  }

  if (apiError?.status === 403) {
    return (
      <div className="relative min-h-96 flex-1">
        <SinAccesoOverlay
          permiso={PERMISO_LECTURA}
          titulo={t('centro.problemas.sinAcceso.titulo')}
          descripcion={t('centro.problemas.sinAcceso.descripcion', { permiso: PERMISO_LECTURA })}
          onVolver={() => navigate('/app')}
          textoVolver={t('centro.problemas.sinAcceso.volver')}
        />
      </div>
    )
  }

  const detalle = consulta.data

  return (
    <section className="flex flex-col gap-3">
      <BarraDeRetorno onVolver={volver} />

      {consulta.isPending && detalle === undefined ? <Cargando /> : null}

      {/*
        Un error CON datos en mano es partial-data y no pantalla de error: en React Query v5 `status`
        pasa a `'error'` aunque `data` esté cargada, así que un refetch fallado después de una
        mutación exitosa borraría el ticket entero sobre algo que SÍ se hizo (defecto D-S4F-1).
      */}
      {apiError !== null && detalle === undefined ? (
        <PanelDeError apiError={apiError} onReintentar={() => void consulta.refetch()} />
      ) : null}

      {detalle === undefined ? null : (
        <>
          <HeroDelTicket
            detalle={detalle}
            onAccion={(accion: AccionDeMutacionProblema) => {
              if (accion === 'silenciar' || accion === 'resolver') setModal(accion)
            }}
          />

          <div className="flex flex-col gap-3 xl:flex-row">
            <div className="min-w-0 flex-1 rounded-xl border border-borde bg-superficie-1 p-4">
              <Tabs defaultValue="resumen">
                <TabsList variant="line" className="flex-wrap">
                  {TABS_DEL_TICKET.map((tab) => (
                    <TabsTrigger key={tab} value={tab}>
                      {t(claveDeTabDelTicket(tab))}
                      {tabLlevaContador(tab) ? ` (${contarTimeline(detalle)})` : ''}
                    </TabsTrigger>
                  ))}
                </TabsList>

                <TabsContent value="resumen" className="pt-4">
                  <TabResumenTicket detalle={detalle} />
                </TabsContent>
                <TabsContent value="timeline" className="pt-4">
                  <TabTimelineTicket detalle={detalle} />
                </TabsContent>
                <TabsContent value="regla" className="pt-4">
                  <TabReglaTicket />
                </TabsContent>
                <TabsContent value="integraciones" className="pt-4">
                  <TabIntegracionesTicket detalle={detalle} />
                </TabsContent>
              </Tabs>
            </div>

            {/*
              Aside de contexto. Son los mismos 2 bloques que el panel derecho de la Sala, y a
              propósito: es el mismo dato del mismo problema.

              "Otros problemas de este vehículo" NO se dibuja acá: se deriva de la página de la
              bandeja, que el ticket no carga. Pedir `GET /problemas` entero para responder eso
              sería un request de más para una respuesta que igual sería parcial (no hay
              `?vehiculoId=`, B-17).
            */}
            <aside
              aria-label={t('centro.sala.contexto.titulo')}
              className="flex flex-col gap-4 rounded-xl border border-borde bg-superficie-1 p-4 xl:w-72 xl:shrink-0"
            >
              <EstadoEnVivoDelVehiculo detalle={detalle} />
              <DesgloseDePrioridad prioridad={detalle.prioridadDetalle} />
            </aside>
          </div>

          <ModalSilenciarProblema
            problemaId={detalle.id}
            titulo={detalle.titulo}
            abierto={modal === 'silenciar'}
            onCerrar={() => setModal('ninguno')}
          />

          <ModalResolverProblema
            problemaId={detalle.id}
            titulo={detalle.titulo}
            abierto={modal === 'resolver'}
            onCerrar={() => setModal('ninguno')}
          />
        </>
      )}
    </section>
  )
}

function BarraDeRetorno({ onVolver }: { onVolver: () => void }) {
  const { t } = useTranslation('flota')

  return (
    <Boton variante="fantasma" tamano="sm" iconoIzq={ArrowLeft} onClick={onVolver} className="self-start">
      {t('centro.ticket.volver')}
    </Boton>
  )
}

function Cargando() {
  return (
    <div className="flex flex-col gap-3">
      <Skeleton variante="bloque" />
      <Skeleton variante="linea" repetir={6} />
    </div>
  )
}

/**
 * El 404 se presenta como **bloqueante** y sin reintento: el problema no existe (o es de otra
 * organización, que la UI no distingue a propósito), así que reintentar el mismo `GET` da lo mismo.
 * Cualquier otro error sí es recuperable.
 */
function PanelDeError({
  apiError,
  onReintentar,
}: {
  apiError: ReturnType<typeof parseApiError>
  onReintentar: () => void
}) {
  const { t } = useTranslation('flota')
  const { t: tComun } = useTranslation()

  const noExiste = apiError.status === 404
  const tratamiento = tratamientoDeErrorCentro(apiError.code, apiError.args ?? {})

  return (
    <EstadoError
      variante={noExiste ? 'bloqueante' : 'recuperable'}
      titulo={noExiste ? t('centro.ticket.noExiste') : t('centro.sala.detalle.errorTitulo')}
      // Dos textos y hacen falta los 2: el backend dice QUÉ pasó (localizado, con sus args) y la
      // guía dice QUÉ HACER, que el backend no sabe porque depende de la pantalla.
      mensaje={`${resolveApiErrorMessage(apiError, tComun)} ${t(claveDeGuiaDeErrorCentro(tratamiento))}`}
      trazaId={apiError.traceId ?? undefined}
      textoReintentar={t('centro.problemas.error.reintentar')}
      onReintentar={noExiste ? undefined : onReintentar}
    />
  )
}
