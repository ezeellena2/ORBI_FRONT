import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import { ExternalLink, Lightbulb } from 'lucide-react'
import type { ProblemaOperativoDetalleDto } from '@/services/contracts/flota'
import { parseApiError, resolveApiErrorMessage } from '@/shared/errors/parse-api-error'
import { Boton } from '@/shared/ui/Boton'
import { EstadoError } from '@/shared/ui/EstadoError'
import { Skeleton } from '@/shared/ui/Skeleton'
import {
  BarraDeAccionesProblema,
  type AccionDeMutacionProblema,
} from '../BarraDeAccionesProblema'
import { BadgeEstadoProblema, BadgeSeveridadProblema, BadgeSlaProblema } from '../BadgesDelCentro'
import { BloqueDelCentro } from '../BloqueDelCentro'
import { SenalesDelProblema } from '../SenalesDelProblema'
import { formatearFechaHora } from '../../detalle/formato'
import {
  claveDeGuiaDeErrorCentro,
  tratamientoDeErrorCentro,
} from '../../../vocabulario-centro-problemas'
import {
  descripcionDelVehiculo,
  patenteDelProblema,
} from '../../../vocabulario-sala-problemas'

/**
 * Panel central de la Sala: el detalle del problema seleccionado (ficha §2, "Detalle preview").
 *
 * Lee `GET /problemas/{id}`, que es lo que trae `descripcion` ("qué pasó"), las señales agrupadas y
 * `accionesDisponibles`. El listado no los tiene: por eso el panel hace su propio request y no se
 * arma con la fila de la cola.
 *
 * ── ES UN PREVIEW, Y EL TICKET COMPLETO YA EXISTE ─────────────────────────────────────────────
 * Desde `f-09`, "Abrir ticket completo" lleva a `?ticket=<problemaId>`, que es la vista con los 4
 * tabs, la línea de tiempo y el aside. Acá se muestra lo que alcanza para **decidir sin cambiar de
 * pantalla**; lo que hace falta para trabajar el caso está en el ticket.
 *
 * ── LO QUE EL HERO NO DIBUJA, Y NO ES UN OLVIDO ───────────────────────────────────────────────
 *  - **El código de la regla que abrió el problema** (`DTC-CRIT-01` en el mockup): el vínculo
 *    problema → regla **no existe como columna** (PENDIENTE #8), así que ningún campo del DTO lo
 *    trae. Inventar un código a partir del `tipo` sería fabricar una trazabilidad que no hay.
 *  - **"Contactar conductor"** (ficha §7.8): registraría un ítem en el timeline, y los 2 endpoints
 *    que podrían hacerlo —`/comentarios` y `/estado`— **no están enrutados**. Un botón que no puede
 *    dejar rastro de lo que el operador hizo es peor que no tenerlo.
 */
export function PanelDetalleProblema({
  problemaId,
  detalle,
  cargando,
  error,
  onReintentar,
  onAccion,
}: {
  problemaId: string | null
  detalle: ProblemaOperativoDetalleDto | undefined
  cargando: boolean
  error: unknown
  onReintentar: () => void
  /** Solo las que mutan: la navegación la resuelve la barra de acciones. */
  onAccion: (accion: AccionDeMutacionProblema) => void
}) {
  const { t, i18n } = useTranslation('flota')
  const { t: tComun } = useTranslation()

  if (problemaId === null) {
    return (
      <Marco>
        <p className="py-12 text-center text-sm text-fg-secundario">
          {t('centro.sala.detalle.vacio')}
        </p>
      </Marco>
    )
  }

  if (cargando && detalle === undefined) {
    return (
      <Marco>
        <Skeleton variante="bloque" />
        <Skeleton variante="linea" repetir={4} />
      </Marco>
    )
  }

  /*
    Un error CON datos en mano es partial-data, no pantalla de error: en React Query v5 `status` pasa
    a `'error'` aunque `data` esté cargada, así que un refetch fallado después de una mutación
    exitosa borraría el panel entero sobre algo que SÍ se hizo (defecto D-S4F-1). Solo se reemplaza
    el panel cuando no hay nada que preservar.
  */
  if (error !== null && error !== undefined && detalle === undefined) {
    const apiError = parseApiError(error)
    const tratamiento = tratamientoDeErrorCentro(apiError.code, apiError.args ?? {})

    return (
      <Marco>
        <EstadoError
          variante="recuperable"
          titulo={t('centro.sala.detalle.errorTitulo')}
          // Dos textos y hacen falta los 2: el backend dice QUÉ pasó (localizado, con sus args) y
          // la guía dice QUÉ HACER, que el backend no sabe porque depende de la pantalla.
          mensaje={`${resolveApiErrorMessage(apiError, tComun)} ${t(claveDeGuiaDeErrorCentro(tratamiento))}`}
          trazaId={apiError.traceId ?? undefined}
          textoReintentar={t('centro.problemas.error.reintentar')}
          onReintentar={onReintentar}
        />
      </Marco>
    )
  }

  if (detalle === undefined) return <Marco />

  return (
    <Marco>
      <Hero detalle={detalle} idioma={i18n.language} />

      <BloqueDelCentro titulo={t('centro.sala.detalle.quePaso')}>
        <p className="text-sm text-fg-secundario">
          {detalle.descripcion.trim() === ''
            ? t('centro.sala.detalle.sinDescripcion')
            : detalle.descripcion}
        </p>
      </BloqueDelCentro>

      {detalle.accionSugerida.trim() === '' ? null : (
        <div className="flex items-start gap-2 rounded-lg border border-dashed border-borde bg-superficie-2 px-3 py-2">
          <Lightbulb className="mt-0.5 size-4 shrink-0 text-accion" aria-hidden />
          <div className="flex flex-col gap-0.5">
            <p className="text-xs font-medium text-fg-primario">
              {t('centro.sala.detalle.accionSugerida')}
            </p>
            <p className="text-sm text-fg-secundario">{detalle.accionSugerida}</p>
          </div>
        </div>
      )}

      <SenalesDelProblema senales={detalle.senales} idioma={i18n.language} />

      <footer className="mt-auto flex flex-wrap items-center gap-2 border-t border-borde pt-3">
        <BarraDeAccionesProblema detalle={detalle} onAccion={onAccion} />

        {/*
          Va al final y como link (no como botón con `navigate`): es navegación real a otra vista, y
          un `<a>` deja abrir el ticket en otra pestaña, que es lo que un operador hace cuando quiere
          conservar la cola.
        */}
        <Boton
          variante="fantasma"
          tamano="sm"
          className="ml-auto"
          iconoDer={ExternalLink}
          render={<Link to={`?ticket=${detalle.id}`} />}
        >
          {t('centro.sala.detalle.abrirTicket')}
        </Boton>
      </footer>
    </Marco>
  )
}

function Marco({ children }: { children?: React.ReactNode }) {
  const { t } = useTranslation('flota')

  return (
    <section
      aria-label={t('centro.sala.detalle.titulo')}
      className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto rounded-xl border border-borde bg-superficie-1 p-4"
    >
      {children}
    </section>
  )
}

function Hero({ detalle, idioma }: { detalle: ProblemaOperativoDetalleDto; idioma: string }) {
  const { t } = useTranslation('flota')

  const patente = patenteDelProblema(detalle.vehiculo)
  const descripcion = descripcionDelVehiculo(detalle.vehiculo)

  return (
    <header className="flex flex-col gap-2">
      <div className="flex flex-wrap items-center gap-2">
        <BadgeSeveridadProblema severidad={detalle.severidad} />
        <BadgeEstadoProblema estado={detalle.estado} />
        <BadgeSlaProblema sla={detalle.sla} />
      </div>

      <h2 className="text-lg font-semibold tracking-snug text-fg-primario">{detalle.titulo}</h2>

      <dl className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-fg-secundario">
        {detalle.vehiculo === null ? null : (
          <Dato etiqueta={t('centro.sala.detalle.vehiculo')}>
            <Link
              to={`/app/flota/vehiculos/${detalle.vehiculo.vehiculoFlotaId}`}
              className="font-mono text-marca hover:underline"
            >
              {patente ?? t('centro.sala.cola.sinPatente')}
            </Link>
            {descripcion === null ? null : <span> · {descripcion}</span>}
          </Dato>
        )}

        {detalle.conductor === null ? null : (
          <Dato etiqueta={t('centro.sala.detalle.conductor')}>
            <Link
              to={`/app/flota/conductores/${detalle.conductor.conductorFlotaId}`}
              className="text-marca hover:underline"
            >
              {detalle.conductor.nombreCompleto}
            </Link>
          </Dato>
        )}

        <Dato etiqueta={t('centro.sala.detalle.responsable')}>
          {detalle.responsable?.nombre ?? t('centro.sala.cola.sinResponsable')}
        </Dato>

        <Dato etiqueta={t('centro.sala.detalle.detectado')}>
          {formatearFechaHora(detalle.fechaDeteccionUtc, idioma)}
        </Dato>
      </dl>
    </header>
  )
}

function Dato({ etiqueta, children }: { etiqueta: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-1">
      <dt className="text-fg-terciario">{etiqueta}:</dt>
      <dd>{children}</dd>
    </div>
  )
}
