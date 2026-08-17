import {
  Car,
  Cog,
  CreditCard,
  Bell,
  Plug,
  ShieldCheck,
  Palette,
  KeyRound,
  Building2,
  Blocks,
  Map,
  MapPin,
  RadioTower,
  TriangleAlert,
  UserRound,
  type LucideIcon,
} from 'lucide-react'

/**
 * Fuente ÚNICA de la navegación de módulo. Port del `docs/mockupsv2/_shared/module-nav.js`.
 *
 * ── QUÉ PROBLEMA RESUELVE ─────────────────────────────────────────────────────────────────────
 * Antes cada módulo iba a inventar su propio menú. El plan normativo
 * `docs/superpowers/plans/2026-06-13-navegacion-lateral-unificada.md` cierra eso con un modelo:
 * el **sidebar primario** muestra el módulo como **link único a su hub** —nunca como acordeón
 * desplegable (Task 16 Step 2 manda borrar ese branch)— y los items del módulo viven en una
 * **columna secundaria colapsable**. Este registro es lo que alimenta a las dos.
 *
 * Agregar un módulo = agregar una entrada acá. No se toca ni el sidebar ni la columna.
 *
 * ── LO QUE NO SE PORTÓ, A PROPÓSITO ───────────────────────────────────────────────────────────
 * - **`mode: 'rail'`**: figura en el docblock del mockup y en el plan, pero el motor no tiene ni
 *   una rama que lo implemente, `components.css` no tiene ninguna regla, y **ninguno de los 12
 *   módulos lo usa** (0 hits). Es vestigial. Quedan `nav` (default) y `panel`.
 * - **`data-shell-mode`**: el mockup lo escribe en el DOM y no lo lee nadie.
 * - Los **defectos de accesibilidad** del mockup: `aria-expanded` hardcodeado en `true` aunque el
 *   grupo arranque colapsado, botón de colapso sin `aria-expanded`, e items inactivos focuseables
 *   sin `aria-disabled`. Acá se hace bien.
 */

/** Un ítem de la columna. `panel` conmuta sin navegar; `ruta` navega. */
export interface ItemDeModulo {
  key: string
  labelKey: string
  icono: LucideIcon
  ruta: string
  /**
   * Permiso que habilita el ítem. Sin él NO se oculta: se muestra **deshabilitado con el motivo**
   * (`permisos.md` §Comportamiento UX por verbo). Ocultarlo dejaría al usuario sin saber que la
   * sección existe y sin nada que pedirle a su admin.
   */
  permiso?: string
  /**
   * Rutas hijas que marcan activo a este ítem. Es el port de los `aliases` del mockup, que allá
   * mapeaban `vehiculo-detalle.html → vehiculos.html`; acá una ficha de detalle deja resaltado su
   * listado. Se comparan con `startsWith`.
   */
  rutasHijas?: string[]
}

export interface GrupoDeModulo {
  /** Sin título, el grupo se renderiza sin encabezado (el mockup lo permite). */
  tituloKey?: string
  items: ItemDeModulo[]
}

export interface RegistroDeModulo {
  key: string
  labelKey: string
  icono: LucideIcon
  /** Código de módulo para el gate de módulo activo. Ausente = superficie de sistema, sin gate. */
  modulo?: string
  /** A dónde va el link único del sidebar primario. Es la primera pantalla real del módulo. */
  hub: string
  grupos: GrupoDeModulo[]
}

/**
 * Orden y etiquetas tomados **literalmente** de `module-nav.js` `registry['flota']`.
 * Vehículos va primero porque es el hub — coherente con que `/app/flota` redirija ahí.
 */
const FLOTA: RegistroDeModulo = {
  key: 'flota',
  labelKey: 'shell.nav.flota',
  icono: Car,
  modulo: 'flota',
  hub: '/app/flota/vehiculos',
  grupos: [
    {
      tituloKey: 'shell.nav.grupoOperacion',
      items: [
        {
          key: 'flota.vehiculos',
          labelKey: 'shell.nav.flotaVehiculos',
          icono: Car,
          ruta: '/app/flota/vehiculos',
          permiso: 'flota.vehiculos.leer',
          // El wizard de alta y la ficha de detalle dejan resaltado el listado.
          rutasHijas: ['/app/flota/vehiculos/'],
        },
        {
          key: 'flota.mapa',
          labelKey: 'shell.nav.flotaMapa',
          icono: Map,
          ruta: '/app/flota/mapa',
          permiso: 'flota.vehiculos.leer',
        },
        {
          key: 'flota.dispositivos',
          labelKey: 'shell.nav.flotaDispositivos',
          icono: RadioTower,
          ruta: '/app/flota/dispositivos',
          permiso: 'flota.dispositivos.leer',
          rutasHijas: ['/app/flota/dispositivos/'],
        },
        {
          key: 'flota.conductores',
          labelKey: 'shell.nav.flotaConductores',
          icono: UserRound,
          ruta: '/app/flota/conductores',
          permiso: 'flota.conductores.leer',
          rutasHijas: ['/app/flota/conductores/'],
        },
        {
          key: 'flota.geozonas',
          labelKey: 'shell.nav.flotaGeozonas',
          icono: MapPin,
          ruta: '/app/flota/geozonas',
          permiso: 'flota.geozonas.leer',
        },
        {
          key: 'flota.problemas',
          labelKey: 'shell.nav.flotaProblemas',
          icono: TriangleAlert,
          ruta: '/app/flota/problemas',
          permiso: 'flota.problemas.leer',
          // Reglas e Integraciones son configuración del Centro: se llega por el submenú de la
          // pantalla, y desde la columna dejan resaltado el Centro.
          rutasHijas: ['/app/flota/problemas/', '/app/flota/integraciones'],
        },
      ],
    },
  ],
}

/**
 * Configuración es el módulo `panel` del mockup: link único en el sidebar y sus secciones en la
 * columna. No lleva `modulo` porque es superficie de sistema — no la gatea `[RequiereModulo]`.
 */
const CONFIGURACION: RegistroDeModulo = {
  key: 'configuracion',
  labelKey: 'shell.nav.configuracion',
  icono: Cog,
  hub: '/app/configuracion/empresa',
  grupos: [
    {
      items: [
        { key: 'cfg.empresa', labelKey: 'shell.nav.confEmpresa', icono: Building2, ruta: '/app/configuracion/empresa' },
        { key: 'cfg.modulos', labelKey: 'shell.nav.confModulos', icono: Blocks, ruta: '/app/configuracion/modulos' },
        { key: 'cfg.facturacion', labelKey: 'shell.nav.confFacturacion', icono: CreditCard, ruta: '/app/configuracion/facturacion' },
        { key: 'cfg.notificaciones', labelKey: 'shell.nav.confNotificaciones', icono: Bell, ruta: '/app/configuracion/notificaciones' },
        {
          key: 'cfg.integraciones',
          labelKey: 'shell.nav.confIntegraciones',
          icono: Plug,
          ruta: '/app/configuracion/integraciones',
          permiso: 'sistema.integraciones.leer',
        },
        { key: 'cfg.seguridad', labelKey: 'shell.nav.confSeguridad', icono: ShieldCheck, ruta: '/app/configuracion/seguridad' },
        { key: 'cfg.apariencia', labelKey: 'shell.nav.confApariencia', icono: Palette, ruta: '/app/configuracion/apariencia' },
        { key: 'cfg.roles', labelKey: 'shell.nav.confRoles', icono: KeyRound, ruta: '/app/configuracion/roles' },
      ],
    },
  ],
}

export const REGISTRO_DE_MODULOS: RegistroDeModulo[] = [FLOTA, CONFIGURACION]

/** El módulo cuya columna corresponde a esta ruta, o `null` si la ruta no pertenece a ninguno. */
export function moduloDeLaRuta(pathname: string): RegistroDeModulo | null {
  for (const registro of REGISTRO_DE_MODULOS) {
    const pertenece = registro.grupos.some((grupo) =>
      grupo.items.some((item) => esItemActivo(item, pathname)),
    )
    if (pertenece) return registro
  }
  return null
}

/**
 * Un ítem está activo si la ruta ES la suya o cuelga de una de sus `rutasHijas`.
 *
 * Ojo con el `startsWith` pelado: `/app/flota/vehiculos` sería prefijo de un futuro
 * `/app/flota/vehiculos-archivados`. Por eso la coincidencia exacta va aparte y las hijas se
 * declaran **con la barra final**.
 */
export function esItemActivo(item: ItemDeModulo, pathname: string): boolean {
  if (pathname === item.ruta) return true
  return (item.rutasHijas ?? []).some((hija) => pathname.startsWith(hija))
}
