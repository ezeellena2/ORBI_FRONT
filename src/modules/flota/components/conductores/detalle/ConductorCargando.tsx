import { useTranslation } from 'react-i18next'
import { Skeleton } from '@/shared/ui/Skeleton'

/**
 * LOADING de la ficha del conductor: esqueleto del hero + la tira de 4 mini-stats + el panel del tab
 * activo.
 *
 * Sin spinner de pagina completa: el esqueleto reserva el espacio real de cada bloque, asi que al
 * llegar la respuesta el contenido no salta.
 *
 * La tira de 4 SI se dibuja acá —a diferencia de la ficha del dispositivo, donde se omitio— porque
 * en esta pantalla las 4 tarjetas **siempre se renderizan**: llegan en fallback declarado ("Sin datos
 * de telemetria"), no desaparecen. El esqueleto promete exactamente lo que aparece despues.
 */
export function ConductorCargando() {
  const { t } = useTranslation(['flota', 'common'])

  return (
    <div aria-busy className="flex flex-col gap-6">
      <span role="status" className="sr-only">
        {t('flota:conductorDetalle.cargando')}
      </span>

      <div className="flex flex-col gap-3 rounded-xl border border-borde bg-superficie-1 p-5">
        <Skeleton variante="linea" className="h-7 w-64" />
        <Skeleton variante="linea" className="w-80" />
        <Skeleton variante="linea" className="w-96" />
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Skeleton variante="bloque" repetir={4} className="h-24" />
      </div>

      <Skeleton variante="bloque" className="h-72" />
    </div>
  )
}
