import { LayoutDashboard, Truck, Settings, Users, type LucideIcon } from 'lucide-react'

export interface NavSubItem {
  key: string
  labelKey: string
  path: string
  permiso?: string
}

export interface NavLinkItem {
  type: 'link'
  key: string
  labelKey: string
  icon: LucideIcon
  path: string
  module?: string
}

export interface NavGroupItem {
  type: 'group'
  key: string
  labelKey: string
  icon: LucideIcon
  module?: string
  items: NavSubItem[]
}

export interface NavLabelItem {
  type: 'label'
  labelKey: string
  topMargin?: boolean
}

export type NavItem = NavLinkItem | NavGroupItem | NavLabelItem

export const NAV_CONFIG: NavItem[] = [
  { type: 'label', labelKey: 'shell.nav.modulos' },
  {
    type: 'link',
    key: 'dashboard',
    labelKey: 'shell.nav.dashboard',
    icon: LayoutDashboard,
    path: '/app',
  },
  {
    type: 'group',
    key: 'flota',
    labelKey: 'shell.nav.flota',
    icon: Truck,
    module: 'flota',
    items: [
      { key: 'flota.mapa', labelKey: 'shell.nav.flotaMapa', path: '/app/flota/mapa', permiso: 'flota.vehiculos.leer' },
      { key: 'flota.vehiculos', labelKey: 'shell.nav.flotaVehiculos', path: '/app/flota/vehiculos', permiso: 'flota.vehiculos.leer' },
      { key: 'flota.dispositivos', labelKey: 'shell.nav.flotaDispositivos', path: '/app/flota/dispositivos', permiso: 'flota.dispositivos.leer' },
      { key: 'flota.conductores', labelKey: 'shell.nav.flotaConductores', path: '/app/flota/conductores', permiso: 'flota.conductores.leer' },
      // Centro de Problemas. Entra al menú con la pantalla construida: antes la ruta servía un
      // andamio, y un link a un andamio es peor que ninguno.
      // `Reglas` e `Integraciones` **están construidas** (f-10 / f-11) y aun así NO entran acá, por
      // otro motivo: son configuración del Centro, se llega por su submenú, y sus permisos son de
      // otros grupos (`flota.reglas.*` / `flota.integraciones.*`) que supervisor no tiene — el menú
      // lateral mostraría 2 entradas grises a la mitad de los roles-plantilla.
      { key: 'flota.problemas', labelKey: 'shell.nav.flotaProblemas', path: '/app/flota/problemas', permiso: 'flota.problemas.leer' },
      { key: 'flota.geozonas', labelKey: 'shell.nav.flotaGeozonas', path: '/app/flota/geozonas', permiso: 'flota.geozonas.leer' },
    ],
  },
  { type: 'label', labelKey: 'shell.nav.sistema', topMargin: true },
  {
    type: 'group',
    key: 'sistema.configuracion',
    labelKey: 'shell.nav.configuracion',
    icon: Settings,
    items: [
      { key: 'sistema.configuracion.empresa', labelKey: 'shell.nav.confEmpresa', path: '/app/configuracion/empresa' },
      { key: 'sistema.configuracion.modulos', labelKey: 'shell.nav.confModulos', path: '/app/configuracion/modulos' },
      { key: 'sistema.configuracion.facturacion', labelKey: 'shell.nav.confFacturacion', path: '/app/configuracion/facturacion' },
      { key: 'sistema.configuracion.notificaciones', labelKey: 'shell.nav.confNotificaciones', path: '/app/configuracion/notificaciones' },
      { key: 'sistema.configuracion.integraciones', labelKey: 'shell.nav.confIntegraciones', path: '/app/configuracion/integraciones', permiso: 'sistema.integraciones.leer' },
      { key: 'sistema.configuracion.seguridad', labelKey: 'shell.nav.confSeguridad', path: '/app/configuracion/seguridad' },
      { key: 'sistema.configuracion.apariencia', labelKey: 'shell.nav.confApariencia', path: '/app/configuracion/apariencia' },
      { key: 'sistema.configuracion.roles', labelKey: 'shell.nav.confRoles', path: '/app/configuracion/roles' },
    ],
  },
  {
    type: 'link',
    key: 'sistema.usuarios',
    labelKey: 'shell.nav.usuarios',
    icon: Users,
    path: '/app/usuarios',
  },
]
