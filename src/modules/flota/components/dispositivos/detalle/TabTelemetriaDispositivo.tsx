import { useTranslation } from 'react-i18next'
import { RefreshCw } from 'lucide-react'
import { BadgeConexion } from '../../BadgeConexion'
import { claveDeAyudaDeConexionDeEquipo } from '../../../vocabulario-conexion'
import { useTelemetriaDispositivo } from '../../../hooks/useTelemetriaDispositivo'
import { ParDato } from '../../detalle/ParDato'
import { formatearFechaHora, formatearNumero } from '../../detalle/formato'
import type { DispositivoDetalleDto } from '@/services/contracts/flota'
import { parseApiError, resolveApiErrorMessage } from '@/shared/errors/parse-api-error'
import { Boton } from '@/shared/ui/Boton'
import { EstadoError } from '@/shared/ui/EstadoError'
import { Skeleton } from '@/shared/ui/Skeleton'

/**
 * Tab "Telemetria" de la ficha del dispositivo: el snapshot tecnico en vivo.
 *
 * ── POR QUE ESTE TAB DEJO DE SER UN "SIN FUENTE" ──────────────────────────────────────────────
 * Dibujaba un panel que decia *"esa integracion todavia no esta conectada"*. Era cierto cuando se
 * escribio y dejo de serlo el 2026-08-12: `GET /dispositivos/{id}/telemetria` esta implementado
 * (slice-05 `f-04`) y responde **200 partial-data**. Un panel que declara "no hay fuente" sobre un
 * endpoint que contesta es la clase de mentira que este modulo corrige siempre — y ademas escondia
 * el unico dato tecnico que hoy existe del equipo.
 *
 * ── LO QUE NO SE DIBUJA, Y NO ES UN OLVIDO ────────────────────────────────────────────────────
 *  - **Uptime**: el contrato lo declara y viene `null` SIEMPRE (D-S3-28) — el % de disponibilidad en
 *    30 dias exige historico de posiciones, que Telemetria no persiste (B-9). Un par "Uptime — "
 *    permanente no informa nada y se lee como un dato que fallo. Aparece solo si algun dia llega.
 *  - **Senal GSM, satelites, hdop, red movil**: NO EXISTEN en ninguna capa de Telemetria (B-6),
 *    aunque el mockup los dibuje. No estan en el DTO y no se piden.
 *  - **Posicion / mapa**: el snapshot no la trae; el mapa en vivo es su propia superficie.
 *
 * ── LOS `null` NO SON ERRORES ─────────────────────────────────────────────────────────────────
 * Las 2 baterias salen de `resumen-tecnico`, que es POR VEHICULO: un equipo **sin vehiculo** no
 * tiene de donde sacarlas y el backend ni siquiera las pide. Por eso, cuando el equipo no esta
 * instalado, el panel lo DICE en vez de dejar dos guiones que parecen una falla.
 */

export function TabTelemetriaDispositivo({ dispositivo }: { dispositivo: DispositivoDetalleDto }) {
  const { t, i18n } = useTranslation(['flota', 'common'])
  const consulta = useTelemetriaDispositivo(dispositivo.id)

  if (consulta.isPending) {
    return <Skeleton variante="linea" repetir={5} className="h-10" />
  }

  // 404 y 403 incluidos: el snapshot NO degrada a 500, asi que un error acá es un error de verdad
  // (el equipo dejo de existir, o falta el permiso) y corresponde el panel con su reintento.
  if (consulta.isError) {
    const apiError = parseApiError(consulta.error)

    return (
      <EstadoError
        variante="recuperable"
        titulo={t('flota:dispositivoDetalle.telemetria.errorTitulo')}
        mensaje={resolveApiErrorMessage(apiError, t)}
        trazaId={apiError.traceId ?? undefined}
        textoReintentar={t('flota:comun.reintentar')}
        onReintentar={() => void consulta.refetch()}
      />
    )
  }

  const snapshot = consulta.data
  const instalado = dispositivo.vehiculoInstalado !== null

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <BadgeConexion
          estado={dispositivo.conexion}
          claveAyuda={claveDeAyudaDeConexionDeEquipo(dispositivo.conexion, instalado)}
        />

        <Boton
          variante="secundaria"
          tamano="sm"
          iconoIzq={RefreshCw}
          cargando={consulta.isFetching}
          onClick={() => void consulta.refetch()}
        >
          {t('flota:dispositivoDetalle.telemetria.actualizar')}
        </Boton>
      </div>

      <dl className="rounded-lg border border-borde bg-superficie-1 px-4 py-2">
        <ParDato
          etiqueta={t('flota:dispositivoDetalle.telemetria.ultimaSenal')}
          valor={
            snapshot.ultimaSenalUtc === null
              ? null
              : formatearFechaHora(snapshot.ultimaSenalUtc, i18n.language)
          }
        />
        <ParDato
          etiqueta={t('flota:dispositivoDetalle.telemetria.velocidad')}
          valor={
            snapshot.velocidadKmh === null
              ? null
              : t('flota:dispositivoDetalle.telemetria.velocidadValor', {
                  velocidad: formatearNumero(snapshot.velocidadKmh, i18n.language),
                })
          }
          mono
        />
        <ParDato
          etiqueta={t('flota:dispositivoDetalle.telemetria.bateriaInterna')}
          valor={
            snapshot.bateriaInterna === null
              ? null
              : t('flota:dispositivoDetalle.telemetria.porcentaje', {
                  valor: formatearNumero(snapshot.bateriaInterna, i18n.language),
                })
          }
          mono
        />
        <ParDato
          etiqueta={t('flota:dispositivoDetalle.telemetria.bateriaVehiculo')}
          valor={
            snapshot.bateriaVehiculo === null
              ? null
              : formatearNumero(snapshot.bateriaVehiculo, i18n.language)
          }
          mono
        />
      </dl>

      {/*
        Por que faltan los datos, dicho una sola vez y sin afirmar de mas. Con el equipo sin vehiculo
        la causa se SABE (las baterias son por vehiculo); instalado y sin fila upstream, no se sabe
        cual de las dos es, y el copy no elige.
      */}
      <p className="text-xs text-fg-terciario">
        {instalado
          ? t('flota:dispositivoDetalle.telemetria.notaInstalado')
          : t('flota:dispositivoDetalle.telemetria.notaSinVehiculo')}
      </p>

      <p className="text-xs text-fg-terciario">
        {t('flota:dispositivoDetalle.telemetria.compuestoEn', {
          fecha: formatearFechaHora(snapshot.fechaSnapshotUtc, i18n.language),
        })}
      </p>
    </div>
  )
}
