import { Cog, CreditCard, Bell, Plug, ShieldCheck, Palette, KeyRound, Building2, Blocks } from 'lucide-react'
import { NAVEGACION_DE_MODULOS } from '@/app/registry'
import type { ItemDeModulo, RegistroDeModulo } from '@/shared/types/modulo'

export type { ItemDeModulo, GrupoDeModulo, RegistroDeModulo } from '@/shared/types/modulo'

/**
 * Fuente ÚNICA de la navegación de módulo. Port del `docs/mockupsv2/_shared/module-nav.js`.
 *
 * ── QUÉ PROBLEMA RESUELVE ─────────────────────────────────────────────────────────────────────
 * El **sidebar primario** muestra el módulo como **link único a su hub** —nunca como acordeón
 * desplegable (`2026-06-13-navegacion-lateral-unificada.md`, Task 16 Step 2 manda borrar ese
 * branch)— y los items del módulo viven en una **columna secundaria colapsable**. Este registro es
 * lo que alimenta a las dos.
 *
 * ── QUÉ CAMBIÓ EN F-03: ESTE ARCHIVO YA NO DECLARA MÓDULOS ────────────────────────────────────
 * Antes tenía la constante `FLOTA` escrita a mano, y agregar un módulo era editar acá. Ahora los
 * módulos llegan de `app/registry/`, que los junta de los `modulo.manifest.ts` de cada uno
 * (`DA-FE-25`, cerrada por el PO: gana el manifiesto por módulo).
 *
 * **La API de este archivo NO cambió**: sus 3 consumidores —`useBreadcrumb`, `ColumnaDeModulo` y
 * `nav-config`— siguen leyendo `REGISTRO_DE_MODULOS`, `moduloDeLaRuta` y `esItemActivo` igual que
 * antes. Cambió de dónde salen los datos, no cómo se leen.
 *
 * ⚠️ **Por qué importa de `app/`, que parece al revés.** El agregador tiene que importar de
 * `modules/`, y la regla **F9** se lo prohíbe a `features/` (*"el shell tiene que compilar con CERO
 * módulos instalados"*). `app/` es la raíz de composición y es la única capa que puede ver las dos.
 * El lint lo permite (no hay bloque para `src/app/**`, y `AppRouter` ya importaba de `modules/`),
 * pero la alternativa sin esta inversión sería inyectar el registro por contexto — y eso cambiaría
 * la firma de los 5 componentes que hoy lo leen. Se eligió no tocarlos.
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

/**
 * Configuración es el módulo `panel` del mockup: link único en el sidebar y sus secciones en la
 * columna. No lleva `modulo` porque es superficie de sistema — no la gatea `[RequiereModulo]`.
 *
 * ── POR QUÉ SE QUEDA ACÁ Y NO TIENE MANIFIESTO (decidido en F-03) ─────────────────────────────
 * **No es un módulo de negocio**: no vive en `src/modules/`, no se contrata, y el shell la tiene
 * siempre —con cero módulos instalados, Configuración sigue estando—. Además no cumple el contrato
 * del manifiesto ni podría sin inventar código: §3 exige `basePath` + `routes: ComponentType`, y
 * Configuración **no tiene un componente de rutas**: sus 8 secciones son placeholders sueltos en
 * `AppRouter`, no un splat delegado. Darle un manifiesto obligaría a fabricar un
 * `ConfiguracionRoutes` que hoy no existe.
 *
 * Es la entrada del SHELL en el registro, y por eso vive en el shell.
 */
const CONFIGURACION: RegistroDeModulo = {
  key: 'configuracion',
  labelKey: 'shell.nav.configuracion',
  subtituloKey: 'shell.nav.configuracionBajada',
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

/**
 * Los módulos instalados **más** la superficie de sistema del shell, en ese orden.
 *
 * El orden importa: `moduloDeLaRuta` devuelve el PRIMERO que matchea. Los módulos ya vienen
 * ordenados de forma determinista por el agregador (por `orden`, y a igualdad por `key`), así que
 * no depende del orden de importación.
 */
export const REGISTRO_DE_MODULOS: RegistroDeModulo[] = [...NAVEGACION_DE_MODULOS, CONFIGURACION]

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
