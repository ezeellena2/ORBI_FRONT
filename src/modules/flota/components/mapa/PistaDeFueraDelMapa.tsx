import { useTranslation } from 'react-i18next'

/**
 * "Busque una patente y no aparece" es el uso mas probable de esta pantalla — y la respuesta
 * "ningun vehiculo coincide con tus filtros" se lee como **"esa patente no existe"**.
 *
 * Casi siempre existe: esta activa y no tiene posicion conocida, o sea que el endpoint del mapa
 * directamente **no la devuelve** (un vehiculo sin coordenadas sale del array en vez de dibujarse en
 * `0,0`). El dato que lo explica ya lo tiene la pantalla —el conteo de "fuera del mapa"— pero vivia
 * arriba, **sin ningun vinculo con la busqueda**. Esta linea lo ata, y remite al listado, que es la
 * unica superficie donde ese vehiculo si se encuentra.
 *
 * Solo aparece con texto tipeado y con un conteo **conocido y mayor que cero**: sin eso no hay nada
 * que afirmar, y el silencio es preferible a una hipotesis.
 */
export function PistaDeFueraDelMapa({
  busqueda,
  fueraDelMapa,
}: {
  busqueda: string
  fueraDelMapa: number | null
}) {
  const { t } = useTranslation('flota')

  if (busqueda.trim() === '') return null
  if (fueraDelMapa === null || fueraDelMapa === 0) return null

  return (
    <p className="text-xs text-fg-terciario">
      {t('mapa.panel.quizaFueraDelMapa', { count: fueraDelMapa })}
    </p>
  )
}
