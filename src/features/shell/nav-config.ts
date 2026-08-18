import { LayoutDashboard, Users, type LucideIcon } from 'lucide-react'
import { REGISTRO_DE_MODULOS } from './module-nav/registro'

/**
 * Sidebar PRIMARIO. Solo links — **no hay grupos desplegables**.
 *
 * ── POR QUÉ NO HAY ACORDEONES (regresión corregida el 2026-08-17) ─────────────────────────────
 * La versión anterior renderizaba Flota y Configuración como acordeones inline dentro del sidebar.
 * Ese es exactamente el branch que el plan normativo manda ELIMINAR:
 *
 *   `docs/superpowers/plans/2026-06-13-navegacion-lateral-unificada.md`, Task 16 Step 2:
 *   «Eliminar el branch de "grupo inline expandible" (.sidebar-nav-group/.sidebar-nav-group-items):
 *    todos los módulos con secciones se renderizan como **link único** al hub.»
 *   Y su criterio de verificación (Step 3): «el sidebar primario muestra Flota/Operaciones/…/
 *   Configuración como link único (**sin submenú inline**)».
 *
 * Los items de cada módulo viven en la COLUMNA SECUNDARIA (`module-nav/ColumnaDeModulo.tsx`), que
 * se alimenta del mismo registro. Un módulo nuevo agrega su entrada en `module-nav/registro.ts` y
 * aparece acá y allá sin tocar ningún componente.
 */

export interface NavLinkItem {
  type: 'link'
  key: string
  labelKey: string
  icon: LucideIcon
  path: string
  /** Código de módulo para el gate de módulo activo. Ausente = superficie de sistema. */
  module?: string
}

export interface NavLabelItem {
  type: 'label'
  labelKey: string
  topMargin?: boolean
}

export type NavItem = NavLinkItem | NavLabelItem

/** El link de un módulo apunta a su hub, que es la primera pantalla real del módulo. */
function linkDeModulo(key: string): NavLinkItem {
  const registro = REGISTRO_DE_MODULOS.find((m) => m.key === key)
  if (registro === undefined) {
    throw new Error(`No hay registro de módulo para "${key}" en module-nav/registro.ts`)
  }
  return {
    type: 'link',
    key: registro.key,
    labelKey: registro.labelKey,
    icon: registro.icono,
    path: registro.hub,
    module: registro.modulo,
  }
}

export const NAV_CONFIG: NavItem[] = [
  { type: 'label', labelKey: 'shell.nav.modulos' },
  {
    type: 'link',
    key: 'dashboard',
    labelKey: 'shell.nav.dashboard',
    icon: LayoutDashboard,
    path: '/app',
  },
  linkDeModulo('flota'),

  { type: 'label', labelKey: 'shell.nav.sistema', topMargin: true },
  linkDeModulo('configuracion'),
  {
    type: 'link',
    key: 'sistema.usuarios',
    labelKey: 'shell.nav.usuarios',
    icon: Users,
    path: '/app/usuarios',
  },
]
