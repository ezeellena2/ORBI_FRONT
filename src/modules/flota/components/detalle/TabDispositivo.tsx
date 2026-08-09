import { useTranslation } from 'react-i18next'
import { Smartphone } from 'lucide-react'
import { Card } from '@/shared/ui/Card'
import { EstadoVacio } from '@/shared/ui/EstadoVacio'
import type { VehiculoDetalleDto } from '@/services/contracts/flota'
import { ParDato } from './ParDato'

/**
 * Dispositivo GPS asociado. Igual que el tab Conductor: TODO sale del `VehiculoDetalleDto` y este
 * tab NO emite requests — el detalle del dispositivo y su snapshot técnico son de slice-03.
 *
 * Del mockup NO se portan tres cosas, y ninguna es un olvido:
 *  - "Señal GSM": eliminada del contrato (B-6). Telemetría no captura intensidad de señal,
 *    satélites, `hdop` ni red móvil. Dibujar una barra de señal sería inventar el dato.
 *  - "Firmware": no tiene campo en ningún DTO (OTA/firmware es fase 2).
 *  - "Hacer ping" / "Reiniciar": mapean al comando unificado, que está BLOQUEADO en el contrato
 *    (Telemetría no expone comandos; el stub responde 500 `flota.telemetria.no_disponible`). Un
 *    botón que solo puede fallar no se dibuja.
 */
export function TabDispositivo({ vehiculo }: { vehiculo: VehiculoDetalleDto }) {
  const { t } = useTranslation(['flota', 'common'])

  if (vehiculo.dispositivo === null) {
    return (
      <EstadoVacio
        variante="sin-datos"
        icono={Smartphone}
        titulo={t('flota:detalle.dispositivo.vacioTitulo')}
        descripcion={t('flota:detalle.dispositivo.vacioDescripcion')}
      />
    )
  }

  return (
    <Card titulo={t('flota:detalle.dispositivo.titulo')}>
      <dl className="grid gap-x-8 sm:grid-cols-2">
        <ParDato
          etiqueta={t('flota:detalle.dispositivo.alias')}
          valor={vehiculo.dispositivo.alias}
        />
        <ParDato
          etiqueta={t('flota:detalle.dispositivo.imei')}
          valor={vehiculo.dispositivo.imei}
          mono
        />
      </dl>

      <p className="mt-4 rounded-lg border border-dashed border-borde bg-superficie-2 px-4 py-3 text-xs text-fg-secundario">
        {t('flota:detalle.dispositivo.snapshotPendiente')}
      </p>
    </Card>
  )
}
