import { manifiesto as flota } from '@/modules/flota/modulo.manifest'
import type { ManifiestoDeModulo, RegistroDeModulo } from '@/shared/types/modulo'

/**
 * El agregador de módulos. **Es el único archivo que se toca para enchufar un módulo nuevo.**
 *
 * ── POR QUÉ VIVE EN `app/` Y NO EN `features/shell/` ──────────────────────────────────────────
 * Porque tiene que importar de `modules/`, y la regla **F9** se lo prohíbe a `features/`
 * (`eslint.config.js`: *"features/ NUNCA importa de modules/. El shell tiene que compilar con CERO
 * módulos instalados"*). `app/` es la raíz de composición y es la única capa que puede ver las dos:
 * ya lo hacía (`AppRouter` importaba `FlotaRoutes` directo).
 *
 * El shell sigue leyendo `features/shell/module-nav/registro.ts`, que re-exporta lo de acá. Los 7
 * consumidores no se enteraron de nada: cambió **de dónde salen los datos**, no cómo se leen.
 *
 * ── ORDEN DETERMINISTA, Y NO ES UN DETALLE ────────────────────────────────────────────────────
 * Con el registro escrito a mano, el orden del array ERA el orden del sidebar. Con manifiestos
 * cargados de N módulos, el orden de importación deja de ser algo que alguien decida — y
 * `moduloDeLaRuta` devuelve **el primero que matchea**. Por eso se ordena por `orden` explícito y,
 * a igualdad, por `key`: dos módulos nunca pueden intercambiarse de lugar por un cambio de import.
 */

/**
 * Los módulos instalados. **Esta lista es el enchufe**: agregar una línea acá alcanza para que el
 * módulo aparezca en el sidebar, en la columna y en el router.
 */
const INSTALADOS: ManifiestoDeModulo[] = [flota]

/**
 * Ordena de forma determinista: por `orden` y, a igualdad, por `key`.
 *
 * Se exporta **para poder testearla con más de un módulo**. Hoy hay uno solo instalado, así que un
 * test sobre `MANIFIESTOS` no probaría nada: con N=1 cualquier implementación pasa, incluso no
 * ordenar. La red tiene que correr contra manifiestos fabricados o no es una red.
 */
export function ordenarManifiestos(
  lista: readonly ManifiestoDeModulo[],
): readonly ManifiestoDeModulo[] {
  return [...lista].sort((a, b) => a.orden - b.orden || a.key.localeCompare(b.key))
}

/** Ordenados de forma determinista, sin depender del orden de importación. */
export const MANIFIESTOS: readonly ManifiestoDeModulo[] = ordenarManifiestos(INSTALADOS)

/**
 * Rutas declaradas por dos módulos distintos: es un choque, no una preferencia.
 *
 * Si dos manifiestos declaran el mismo `basePath` o la misma ruta de nav, quién gana pasa a
 * depender del orden — y el síntoma sería una pantalla que "a veces" no aparece. Se detecta al
 * arrancar y se lanza con los dos culpables nombrados: es barato y es la única forma de que no se
 * descubra en producción.
 *
 * Exportada por la misma razón que `ordenarManifiestos`: el choque necesita DOS módulos para
 * existir, y hoy hay uno.
 */
export function verificarQueNoSeSolapan(manifiestos: readonly ManifiestoDeModulo[]): void {
  const vistas = new Map<string, string>()

  for (const m of manifiestos) {
    const suyas = [
      m.basePath,
      ...m.navegacion.grupos.flatMap((g) => g.items.map((i) => i.ruta)),
    ]
    for (const ruta of suyas) {
      const duenio = vistas.get(ruta)
      if (duenio !== undefined && duenio !== m.key) {
        throw new Error(
          `Choque de rutas entre módulos: "${ruta}" la declaran "${duenio}" y "${m.key}". ` +
            'Con dos dueños, quién gana depende del orden de importación.',
        )
      }
      vistas.set(ruta, m.key)
    }
  }
}

verificarQueNoSeSolapan(MANIFIESTOS)

/** La navegación de los módulos instalados, en orden determinista. */
export const NAVEGACION_DE_MODULOS: readonly RegistroDeModulo[] = MANIFIESTOS.map((m) => m.navegacion)
