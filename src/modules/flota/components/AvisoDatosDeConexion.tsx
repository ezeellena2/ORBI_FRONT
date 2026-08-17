import { useTranslation } from 'react-i18next'
import { WifiOff } from 'lucide-react'
import type { CoberturaDeConexion } from '../vocabulario-conexion'
import { Icono } from '@/shared/ui/Icono'

/**
 * El estado PARTIAL-DATA de la pantalla, hecho visible (D-C1 a). Lo comparten los listados que
 * componen conexion (vehiculos y dispositivos): el copy no nombra al sujeto, habla de las FILAS de
 * la pagina, asi que sirve igual para una flota y para un inventario de equipos.
 *
 * Cuando Telemetria no responde, el backend NO falla: devuelve **200** con los campos tecnicos en
 * `null` y todo lo propio de Flota servido igual (patente, alias, IMEI, modelo, estado de stock). El
 * DTO no trae ningun flag —la ausencia se lee por los valores— asi que el aviso es estado de
 * PANTALLA, no campo del contrato.
 *
 * Sin este aviso, la pantalla queda tecnicamente correcta y practicamente enganosa: una tabla llena
 * con la columna Conexion entera en "Sin dato" se lee como "se me cayo la flota".
 *
 * ── LO QUE ESTE COPY NO PUEDE AFIRMAR ─────────────────────────────────────────────────────────
 * Que Telemetria este caida. Una flota sin GPS instalado —o un inventario de equipos en stock, que
 * nunca reportan— produce EXACTAMENTE el mismo resultado y el contrato no da forma de distinguirlos.
 * Por eso el texto enumera las causas posibles en vez de elegir una, y por eso el aviso no es un
 * error: no hay nada que reintentar y nada se perdio.
 *
 * ── POR QUE NO ES UN CONTADOR DE HEADER ───────────────────────────────────────────────────────
 * Cuenta las filas de la PAGINA que se esta viendo, y lo dice. Los contadores de header de los 3
 * listados siguen **sin fuente** — B-35: no hay endpoint agregado ni campos de conteo, y derivarlos
 * de la pagina actual daria un numero que cambia al paginar.
 */

export interface AvisoDatosDeConexionProps {
  cobertura: CoberturaDeConexion
}

export function AvisoDatosDeConexion({ cobertura }: AvisoDatosDeConexionProps) {
  const { t } = useTranslation('flota')

  // Ninguna fila tiene dato: es el caso que hay que explicar, porque es el que se confunde con una
  // caida. `role="status"` y NO `alert`: no es un error, no interrumpe.
  if (cobertura.ningunaConFuente) {
    return (
      <div
        role="status"
        className="flex items-start gap-2 rounded-lg border border-borde bg-superficie-2 px-4 py-3"
      >
        <span className="mt-0.5 text-fg-terciario">
          <Icono icono={WifiOff} tamano="sm" />
        </span>
        <div className="flex flex-col gap-1">
          <p className="text-sm font-medium text-fg-primario">
            {t('conexion.datosParciales.titulo')}
          </p>
          {/*
            `count` y no `total`: es el nombre que i18next usa para elegir la forma plural. Con
            `total` la frase decia "ninguna de las 1 filas", que es justo el caso mas comun cuando
            un solo vehiculo no reporta.
          */}
          <p className="text-sm text-fg-secundario">
            {t('conexion.datosParciales.descripcion', { count: cobertura.total })}
          </p>
        </div>
      </div>
    )
  }

  // Cobertura parcial: una linea al pie, sin caja. Que 3 de 20 filas no reporten es informacion
  // util, pero no es una novedad que merezca interrumpir la lectura de la tabla.
  if (cobertura.sinFuente > 0) {
    return (
      <p className="text-xs text-fg-terciario">
        {t('conexion.datosParciales.parcial', {
          sinFuente: cobertura.sinFuente,
          total: cobertura.total,
        })}
      </p>
    )
  }

  return null
}
