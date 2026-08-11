import { useTranslation } from 'react-i18next'
import { Skeleton } from '@/shared/ui/Skeleton'

/**
 * LOADING de la ficha del dispositivo: esqueleto del hero + esqueleto del panel del tab activo.
 *
 * Sin spinner de pagina completa, por el mismo motivo que en la ficha del vehiculo: el esqueleto
 * reserva el espacio real de cada bloque, asi que al llegar la respuesta el contenido no salta.
 *
 * La diferencia con `DetalleCargando` de vehiculos es deliberada: aca NO hay tira de 4 mini-stats.
 * Los 3 KPIs tecnicos del hero (uptime, bateria interna, ultima senal) son snapshot de Telemetria y
 * llegan en slice-05; dibujar su esqueleto prometeria una fila de datos que despues no aparece.
 */
export function DispositivoCargando() {
  const { t } = useTranslation(['flota', 'common'])

  return (
    <div aria-busy className="flex flex-col gap-6">
      <span role="status" className="sr-only">
        {t('flota:dispositivoDetalle.cargando')}
      </span>

      <div className="flex flex-col gap-3 rounded-xl border border-borde bg-superficie-1 p-5">
        <Skeleton variante="linea" className="h-7 w-56" />
        <Skeleton variante="linea" className="w-72" />
        <Skeleton variante="linea" className="w-96" />
      </div>

      <Skeleton variante="bloque" className="h-72" />
    </div>
  )
}
