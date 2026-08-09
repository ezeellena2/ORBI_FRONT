import { useTranslation } from 'react-i18next'
import { Skeleton } from '@/shared/ui/Skeleton'

/**
 * LOADING de la ficha: esqueleto del hero, de la tira de datos y del panel del tab activo.
 *
 * Sin spinner de página completa a propósito: el esqueleto reserva el espacio real de cada bloque,
 * así que cuando llega la respuesta el contenido no salta. Un spinner centrado no reserva nada.
 *
 * El bloque va `aria-busy` y con un `role="status"` que anuncia la carga una sola vez; los
 * esqueletos en sí van `aria-hidden` (los marca la propia primitiva).
 */
export function DetalleCargando() {
  const { t } = useTranslation(['flota', 'common'])

  return (
    <div aria-busy className="flex flex-col gap-6">
      <span role="status" className="sr-only">
        {t('flota:detalle.cargando')}
      </span>

      <div className="flex flex-col gap-3 rounded-xl border border-borde bg-superficie-1 p-5">
        <Skeleton variante="linea" className="h-7 w-56" />
        <Skeleton variante="linea" className="w-72" />
        <Skeleton variante="linea" className="w-96" />
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Skeleton variante="bloque" className="h-20" />
        <Skeleton variante="bloque" className="h-20" />
        <Skeleton variante="bloque" className="h-20" />
        <Skeleton variante="bloque" className="h-20" />
      </div>

      <Skeleton variante="bloque" className="h-72" />
    </div>
  )
}
