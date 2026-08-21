import { registrarNamespaceDeModulo } from '@/shared/i18n'
import { MANIFIESTOS } from './index'

/**
 * Registra el namespace i18n de cada módulo instalado. **La llama `main.tsx`, después del init.**
 *
 * ── POR QUÉ ESTÁ EN SU PROPIO ARCHIVO, SEPARADO DE `index.ts` ─────────────────────────────────
 * Porque importar el registro tiene que poder ser **gratis**. Mientras esta línea vivía en
 * `index.ts`, cualquiera que leyera `MANIFIESTOS` —datos puros: rutas, íconos, claves— arrastraba
 * de yapa el bootstrap de i18n, que toca `document` al arrancar. Síntoma medido: el test del
 * registro, que corre en Node, tiraba `ReferenceError: document is not defined` y Vitest avisaba
 * que eso *"might cause false positive tests"*.
 *
 * Datos en `index.ts`, cableado acá. Importar datos no puede tener el efecto de encender una capa.
 *
 * ── POR QUÉ ACÁ Y NO EN `shared/i18n/` ────────────────────────────────────────────────────────
 * Ese archivo no puede importar `modules/` (**F9**), así que si nombrara los namespaces, agregar un
 * módulo lo obligaría a editarse — justo lo que el enchufe existe para evitar. `app/` es la única
 * capa que ve `shared/` y `modules/` a la vez.
 */
export function registrarI18nDeModulos(): void {
  for (const m of MANIFIESTOS) {
    registrarNamespaceDeModulo(m.i18n.namespace, m.i18n.recursos)
  }
}
