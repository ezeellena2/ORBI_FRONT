import type { ComponentType } from 'react'
import type { LucideIcon } from 'lucide-react'

/**
 * Los tipos del enchufe de módulo. Los escriben los módulos (su manifiesto), los lee el shell (la
 * columna y el sidebar) y los junta `app/registry/`: son de las **tres** capas, así que viven en
 * `shared/`, que es la única que las tres pueden importar.
 *
 * ⚠️ **El contrato §3 los ubica en `@/features/shell/module-nav/tipos` y ahí NO pueden ir**: la
 * regla **F9** prohíbe que un módulo importe de `features/` (*"Un módulo consume shared/, services/
 * y stores/, nunca features/"*, `eslint.config.js`), y el manifiesto de un módulo necesita
 * importarlos. El ejemplo del propio contrato no pasa el lint del repo. Drift reportado en F-03;
 * gana el lint, que es el que corre.
 *
 * Se conservan **los nombres del código** (`ItemDeModulo`, `GrupoDeModulo`, `RegistroDeModulo`),
 * que son los que ya usan los 7 consumidores del shell.
 */

/** Un ítem de la columna. `ruta` navega. */
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
   * Rutas que dejan activo a este ítem, además de la propia. Es el port de los `aliases` del
   * mockup y tiene **dos usos**, que conviene no confundir porque el nombre solo describe el
   * primero:
   *
   *  - **Prefijo de hijas**, siempre **con barra final**: `'/app/flota/vehiculos/'` hace que la
   *    ficha de detalle deje resaltado su listado. La barra no es cosmética — se compara con
   *    `startsWith`, así que sin ella `/vehiculos` capturaría `/vehiculos-archivados`.
   *  - **Alias de una ruta hermana**, exacta y sin barra: `'/app/flota/integraciones'` deja
   *    resaltado el Centro de Problemas, que es de donde se llega a esa pantalla.
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
  /** Bajada del encabezado de la columna. Es el `subtitle` del registro del mockup. */
  subtituloKey?: string
  icono: LucideIcon
  /** Código de módulo para el gate de módulo activo. Ausente = superficie de sistema, sin gate. */
  modulo?: string
  /** A dónde va el link único del sidebar primario. Es la primera pantalla real del módulo. */
  hub: string
  grupos: GrupoDeModulo[]
}

/**
 * Todo lo que un módulo aporta al shell, declarado en su propio archivo.
 *
 * Contrato: `TracAutoV2/docsv2/02-arquitectura/frontend/08-enchufe-de-modulo.md` §3.
 * **Agregar un módulo = crear este archivo y listarlo en `app/registry/`. Nada más.**
 */
export interface ManifiestoDeModulo {
  /** Identificador del módulo en el front. Coincide con el nombre de la carpeta. */
  key: string
  /** Prefijo de ruta bajo `/app`. El registro lo monta SIEMPRE con splat: `<basePath>/*`. */
  basePath: string
  /** El componente de rutas del módulo. Renderiza su propio `<Routes>` interno (§5, A-13). */
  routes: ComponentType
  /** Navegación: hub, grupos e ítems con su permiso. */
  navegacion: RegistroDeModulo
  /** Namespace i18n propio + sus recursos por idioma. `app/` los registra al arrancar. */
  i18n: {
    namespace: string
    recursos: Record<string, Record<string, unknown>>
  }
  /**
   * Posición en el sidebar. **Existe para que el orden no dependa del orden de importación**, que
   * nadie controla. Sin él, dos módulos podrían intercambiarse de lugar por un cambio de import.
   */
  orden: number
}
