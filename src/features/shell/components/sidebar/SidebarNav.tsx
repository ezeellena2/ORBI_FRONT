import { useSessionStore } from '@/stores/session-store'
import { NAV_CONFIG, type NavItem } from '../../nav-config'
import { SidebarNavLabel } from './SidebarNavLabel'
import { SidebarNavItem } from './SidebarNavItem'

interface Props {
  collapsed: boolean
}

export function SidebarNav({ collapsed }: Props) {
  // El `?? []` va AFUERA del selector, igual que en `RequierePermiso`, `RequiereModulo` y
  // `usePermisos`. Zustand 5 corre el selector dentro de `useSyncExternalStore`: con el default
  // ADENTRO, cada lectura construye un array NUEVO, React ve un snapshot distinto por render y la
  // app entera cae en "Maximum update depth exceeded" (precedido de "The result of getSnapshot
  // should be cached"). Reproducido: con `organizacionActiva.modulos` ausente, el ErrorBoundary
  // tapaba TODA la aplicacion con "Algo salio mal" — el sidebar se monta en cada pantalla de /app.
  const modulosDeLaOrg = useSessionStore(s => s.organizacionActiva?.modulos)
  const modulos = modulosDeLaOrg ?? []

  function isVisible(item: NavItem): boolean {
    if (item.type === 'label') return true
    if (!('module' in item) || !item.module) return true
    return modulos.includes(item.module)
  }

  return (
    <nav className="flex-1 space-y-0.5 overflow-y-auto py-2">
      {/*
        Solo `label` y `link`. El branch de grupo desplegable se elimino el 2026-08-17: el plan de
        navegacion lateral unificada (Task 16 Step 2) manda que todo modulo con secciones sea un
        LINK UNICO al hub, y que sus items vivan en la columna secundaria. Ver `nav-config.ts`.
      */}
      {NAV_CONFIG.filter(isVisible).map((item, i) =>
        item.type === 'label' ? (
          <SidebarNavLabel key={i} item={item} collapsed={collapsed} />
        ) : (
          <SidebarNavItem key={item.key} item={item} collapsed={collapsed} />
        )
      )}
    </nav>
  )
}
