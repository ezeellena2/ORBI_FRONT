import { useEffect } from 'react'
import { usePreferencesStore } from '@/stores/preferences-store'

/**
 * Sincroniza el tema activo del store con el atributo `data-theme` en <html>.
 *
 * Este hook es el UNICO lugar del frontend que escribe `data-theme`. Ningun
 * componente pregunta cual es el tema: el tema lo resuelve la cascada CSS
 * (regla F7 de `06-capa-0-frontend.md`, R7 de `02-primitivas.md`).
 *
 * Escribe el atributo SIEMPRE, `dark` incluido. Antes lo BORRABA para dark,
 * heredando el bug del mockup: si el oscuro vive en `:root` sin atributo,
 * `[data-theme="dark"]` no existe y un selector que escriba el atributo en los
 * 4 casos rompe justo en el tema por defecto (01-sistema-de-diseno.md §5.1).
 * En el sistema nuevo los 4 temas son un `[data-theme]` nombrado.
 */
export function useThemeSync() {
  const theme = usePreferencesStore((s) => s.theme)

  useEffect(
    function syncThemeAttribute() {
      document.documentElement.setAttribute('data-theme', theme)
    },
    [theme]
  )
}
