import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'

/**
 * 404 interno de Flota. Sin esta pagina, una URL inexistente bajo `/app/flota/*` cae en el
 * catch-all de `AppRouter` y muestra "Proximamente", que le miente al usuario: le dice que la
 * seccion existe y todavia no esta, cuando en realidad escribio mal el enlace.
 */
export default function NotFoundPage() {
  const { t } = useTranslation('flota')

  return (
    <div className="flex flex-col items-center justify-center gap-2 py-24 text-center">
      <p className="text-base font-medium text-fg-primario">{t('rutaNoEncontrada.titulo')}</p>
      <p className="text-sm text-fg-secundario">{t('rutaNoEncontrada.descripcion')}</p>
      <Link to="/app/flota/vehiculos" className="text-sm text-marca hover:underline">
        {t('rutaNoEncontrada.volver')}
      </Link>
    </div>
  )
}
