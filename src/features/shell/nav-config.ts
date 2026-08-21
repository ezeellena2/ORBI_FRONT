import { LayoutDashboard, Users, type LucideIcon } from 'lucide-react'
import { NAVEGACION_DE_MODULOS } from '@/app/registry'
import { REGISTRO_DE_MODULOS } from './module-nav/registro'
import type { RegistroDeModulo } from '@/shared/types/modulo'

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
 * se alimenta del mismo registro.
 *
 * ── QUÉ CAMBIÓ EN F-03: ESTE ARCHIVO YA NO NOMBRA NINGÚN MÓDULO ───────────────────────────────
 * Antes tenía `linkDeModulo('flota')` escrito a mano, así que **agregar un módulo obligaba a editar
 * el sidebar** — justo lo que el enchufe existe para evitar. Ahora los links de módulo salen de
 * `app/registry/` en orden determinista. Lo único que queda escrito acá es lo que es del SHELL:
 * Dashboard, Usuarios, las dos etiquetas de sección y Configuración.
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
function aLink(registro: RegistroDeModulo): NavLinkItem {
  return {
    type: 'link',
    key: registro.key,
    labelKey: registro.labelKey,
    icon: registro.icono,
    path: registro.hub,
    module: registro.modulo,
  }
}

/**
 * El link de una entrada del registro, o `null` si no está.
 *
 * ── POR QUÉ DEGRADA EN VEZ DE TIRAR (decidido en F-03) ────────────────────────────────────────
 * Antes esto hacía `throw new Error('No hay registro de módulo para …')`, y un `throw` en el
 * módulo de configuración de la navegación **corre al importar**: voltea la app entera, incluido el
 * login, antes de pintar un solo pixel. La trampa está documentada en
 * `08-enchufe-de-modulo.md` §5.3.
 *
 * Con manifiestos el riesgo crece: un módulo que no carga —un import roto, un manifiesto a medio
 * escribir— dejaba de ser un caso teórico. **Un ítem de menú que falta no puede costar la sesión
 * del usuario**: el sidebar no es carga crítica de la autenticación. Se omite el link, se grita por
 * consola con el nombre del culpable, y la app arranca.
 *
 * Lo que SÍ sigue siendo ruidoso es el choque de rutas entre dos módulos: eso lo detecta
 * `app/registry/` al arrancar y **sí** lanza, porque ahí el síntoma sería una pantalla que "a veces"
 * no aparece — imposible de diagnosticar después.
 */
function linkDelShell(key: string): NavLinkItem | null {
  const registro = REGISTRO_DE_MODULOS.find((m) => m.key === key)
  if (registro === undefined) {
    console.error(`[nav] No hay entrada de registro para "${key}": se omite su link del sidebar.`)
    return null
  }
  return aLink(registro)
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
  // Los módulos instalados, en el orden determinista del agregador.
  ...NAVEGACION_DE_MODULOS.map(aLink),

  { type: 'label', labelKey: 'shell.nav.sistema', topMargin: true },
  ...[linkDelShell('configuracion')].filter((l): l is NavLinkItem => l !== null),
  {
    type: 'link',
    key: 'sistema.usuarios',
    labelKey: 'shell.nav.usuarios',
    icon: Users,
    path: '/app/usuarios',
  },
]
