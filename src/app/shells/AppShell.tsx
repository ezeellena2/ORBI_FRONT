import { Outlet } from 'react-router-dom'
import { Sidebar } from '@/features/shell/components/sidebar/Sidebar'
import { AppHeader } from '@/features/shell/components/AppHeader'
import { ColumnaDeModulo } from '@/features/shell/module-nav/ColumnaDeModulo'
import { useSidebarState } from '@/features/shell/hooks/useSidebarState'

/**
 * Layout de la app autenticada: **tres niveles de navegación**, no dos.
 *
 *   1. `Sidebar`          — módulos, como link único a su hub. Colapso global.
 *   2. `ColumnaDeModulo`  — las secciones del módulo en el que estás. Colapso por módulo.
 *                            Se renderiza sola desde la ruta; si la ruta no pertenece a ningún
 *                            módulo con registro (Dashboard, Usuarios) devuelve `null` y el
 *                            contenido ocupa todo el ancho.
 *   3. Dentro de `<Outlet>` — lo que cada pantalla arme por su cuenta (p. ej. el conmutador de
 *                            vistas del Centro de Problemas). Ése es el tercer nivel y NO usurpa
 *                            el segundo.
 *
 * Abajo de `lg` la columna se apila arriba del contenido en vez de quedar al costado.
 */
export function AppShell() {
  const { collapsed, toggle } = useSidebarState()

  return (
    <div className="flex h-screen overflow-hidden bg-bg-canvas">
      <Sidebar collapsed={collapsed} onToggle={toggle} />
      <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
        <AppHeader />
        <div className="flex min-h-0 flex-1 flex-col overflow-hidden lg:flex-row">
          <ColumnaDeModulo />
          <main className="min-w-0 flex-1 overflow-y-auto p-6">
            <Outlet />
          </main>
        </div>
      </div>
    </div>
  )
}
