import { useLocation } from 'react-router-dom'
import { NAV_CONFIG } from '../nav-config'
import { esItemActivo, moduloDeLaRuta } from '../module-nav/registro'

export interface BreadcrumbItem {
  labelKey: string
  path?: string
}

/**
 * Migas del header: `<Módulo> / <Sección>`.
 *
 * ── POR QUÉ LEE EL REGISTRO Y NO `NAV_CONFIG` ─────────────────────────────────────────────────
 * Hasta el 2026-08-17 el segundo nivel salía del grupo desplegable del sidebar. Al pasar los
 * módulos a link único (plan de navegación lateral unificada, Task 16) ese grupo dejó de existir y
 * el breadcrumb se habría quedado en "Flota" a secas, sin la sección.
 *
 * Ahora el primer nivel sale del registro del módulo y el segundo del ítem activo de su columna —
 * la MISMA fuente que pinta la columna, así que no pueden discrepar.
 */
export function useBreadcrumb(): BreadcrumbItem[] {
  const { pathname } = useLocation()

  const modulo = moduloDeLaRuta(pathname)
  if (modulo !== null) {
    const itemActivo = modulo.grupos
      .flatMap((grupo) => grupo.items)
      .find((item) => esItemActivo(item, pathname))

    return itemActivo === undefined
      ? [{ labelKey: modulo.labelKey, path: modulo.hub }]
      : [
          { labelKey: modulo.labelKey, path: modulo.hub },
          { labelKey: itemActivo.labelKey, path: itemActivo.ruta },
        ]
  }

  // Fuera de un módulo con columna (Dashboard, Usuarios): un solo nivel.
  for (const item of NAV_CONFIG) {
    if (item.type === 'label') continue

    const esDashboard = item.key === 'dashboard' && pathname === '/app'
    const esOtro = item.key !== 'dashboard' && pathname.startsWith(item.path)
    if (esDashboard || esOtro) {
      return [{ labelKey: item.labelKey, path: item.path }]
    }
  }

  return []
}
