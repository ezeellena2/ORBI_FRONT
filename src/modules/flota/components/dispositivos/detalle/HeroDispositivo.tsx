import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import { Cpu, Fingerprint } from 'lucide-react'
import { Badge } from '@/shared/ui/Badge'
import { Icono } from '@/shared/ui/Icono'
import type { DispositivoDetalleDto } from '@/services/contracts/flota'
import { SIN_DATO } from '../../detalle/formato'
import { AccionesDispositivo } from './AccionesDispositivo'
import { claveDeStock, varianteDeStock } from './vocabulario-stock'

/**
 * Encabezado de la ficha: alias (mono) + badge de STOCK + subtitulo con modelo y vehiculo asociado +
 * meta-linea tecnica, y las acciones.
 *
 * ── LO QUE NO SE PINTA ACA, Y NO ES UN OLVIDO ─────────────────────────────────────────────────
 * **No hay badge de CONEXION.** El estado de conexion se deriva de Telemetria y esa composicion
 * llega en slice-05. `f-06` es explicito: no se pinta un badge gris "Sin dato" que insinue una
 * composicion que todavia no existe — el elemento simplemente no esta. Un badge permanentemente
 * gris no informa, entrena al usuario a ignorar el lugar donde despues va a aparecer el dato real.
 *
 * **No hay mini-stats tecnicas** (uptime, bateria interna, ultima senal): son
 * `DispositivoTelemetriaSnapshotDto`, tambien slice-05. Y la 4.a tarjeta del mockup, "Senal GSM",
 * no se porta NUNCA: Telemetria no captura intensidad de senal (B-6).
 *
 * ── STOCK != CONEXION ─────────────────────────────────────────────────────────────────────────
 * El unico badge del hero es el de stock (`en_stock` / `instalado` / `en_reparacion` /
 * `dado_de_baja`), que es dato PROPIO de Flota y siempre esta disponible. Son ejes independientes:
 * un dispositivo `instalado` puede estar desconectado.
 * ─────────────────────────────────────────────────────────────────────────────────────────────
 *
 * SIM y firmware van en la meta-linea SOLO si tienen valor. El contrato (`dtos.ts` §5) ya los expone
 * en `DispositivoDetalleDto` —la nota de la ficha §4.0 que decia lo contrario quedo vieja— pero son
 * nullable: una meta-linea llena de guiones es ruido, no informacion. Cuando faltan, el dato sigue
 * visible en el tab Info general, que es donde un campo vacio SI comunica algo ("no esta cargado").
 */
export function HeroDispositivo({
  dispositivo,
  onEditar,
  onCambiarEstadoStock,
  onDarDeBaja,
  onReactivar,
}: {
  dispositivo: DispositivoDetalleDto
  onEditar: () => void
  onCambiarEstadoStock: () => void
  onDarDeBaja: () => void
  onReactivar: () => void
}) {
  const { t } = useTranslation(['flota', 'common'])

  return (
    <section className="flex flex-wrap items-start justify-between gap-4 rounded-xl border border-borde bg-superficie-1 p-5">
      <div className="flex min-w-0 flex-col gap-2">
        <div className="flex flex-wrap items-center gap-3">
          {/*
            `alias` es NULLABLE (D-S3-12: la columna es `alias text NULL`). Sin el, el titulo cae al
            IMEI, que es la identidad real del equipo — nunca a un string vacio, que dejaria el hero
            sin encabezado y la pagina sin nombre accesible.
          */}
          <h1 className="font-mono text-2xl font-semibold tracking-wide text-fg-primario">
            {dispositivo.alias ?? dispositivo.imei}
          </h1>
          <Badge punto variante={varianteDeStock(dispositivo.estadoOperativo)}>
            {t(`flota:${claveDeStock(dispositivo.estadoOperativo)}`)}
          </Badge>
        </div>

        <Subtitulo dispositivo={dispositivo} />

        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-fg-terciario">
          <span className="inline-flex items-center gap-1.5">
            <Icono icono={Fingerprint} tamano="xs" />
            <span className="font-mono tracking-wide">
              {t('flota:dispositivoDetalle.hero.imei', { valor: dispositivo.imei })}
            </span>
          </span>
          {dispositivo.numeroSim === null ? null : (
            <span className="font-mono tracking-wide">
              {t('flota:dispositivoDetalle.hero.sim', { valor: dispositivo.numeroSim })}
            </span>
          )}
          {dispositivo.firmwareVersion === null ? null : (
            <span className="font-mono tracking-wide">
              {t('flota:dispositivoDetalle.hero.firmware', { valor: dispositivo.firmwareVersion })}
            </span>
          )}
        </div>
      </div>

      <AccionesDispositivo
        dispositivo={dispositivo}
        onEditar={onEditar}
        onCambiarEstadoStock={onCambiarEstadoStock}
        onDarDeBaja={onDarDeBaja}
        onReactivar={onReactivar}
      />
    </section>
  )
}

/**
 * "Queclink GV75W · Asociado a AB 123 CD".
 *
 * El vehiculo es un LINK al detalle del vehiculo, no texto: es el salto que el usuario hace todo el
 * tiempo desde el inventario de GPS hacia la unidad donde esta puesto. `modeloNombre` es nullable
 * (el alta admite dispositivo sin modelo de catalogo), asi que cae al marcador de dato ausente en
 * vez de dejar la linea a medio armar.
 */
function Subtitulo({ dispositivo }: { dispositivo: DispositivoDetalleDto }) {
  const { t } = useTranslation(['flota', 'common'])

  return (
    <p className="flex flex-wrap items-center gap-1.5 text-sm text-fg-secundario">
      <Icono icono={Cpu} tamano="xs" />
      <span>{dispositivo.modeloNombre ?? SIN_DATO}</span>
      {dispositivo.vehiculoInstalado === null ? (
        <span className="text-fg-terciario">
          · {t('flota:dispositivoDetalle.hero.sinVehiculo')}
        </span>
      ) : (
        <span>
          ·{' '}
          {t('flota:dispositivoDetalle.hero.asociadoA')}{' '}
          <Link
            to={`/app/flota/vehiculos/${dispositivo.vehiculoInstalado.vehiculoFlotaId}`}
            className="font-mono tracking-wide text-accion underline-offset-2 hover:underline"
          >
            {dispositivo.vehiculoInstalado.patente}
          </Link>
        </span>
      )}
    </p>
  )
}
