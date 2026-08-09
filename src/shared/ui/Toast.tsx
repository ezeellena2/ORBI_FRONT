import { toast as sonner } from 'sonner'
import { Toaster } from '@/shared/ui/base/sonner'

/**
 * Familia D — `Toast` + `ContenedorToast`. Origen: ENVOLVER `sonner`
 * (shadcn deprecó su `toast` en favor de `sonner`).
 *
 * Lo que ya viene resuelto y NO se reimplementa: la cola, la PAUSA AL HOVER y
 * el descarte. Un mensaje de 4 segundos que no se puede retener es un mensaje
 * que no se leyó, y esa es la parte que a mano siempre queda a medias.
 *
 * Lo que aporta la envoltura:
 *  - Los 4 tipos del catálogo con nombres de ORBI (`exito` · `error` ·
 *    `advertencia` · `info`), en vez de la API en inglés de sonner.
 *  - Una API estrecha a propósito: título, mensaje, duración y UNA acción.
 *
 * ── Dos reglas de uso que el componente no puede hacer cumplir ─────────────
 * 1. El toast NO reemplaza al error de formulario. Un campo inválido se marca
 *    EN EL CAMPO. El toast es para lo que pasó fuera de la vista. Un error que
 *    se va solo no se puede corregir.
 * 2. El copy entra ya resuelto desde `message_key` (R5). Acá no se traduce.
 */

export interface OpcionesToast {
  /** Ya resuelto por i18n. */
  mensaje?: string
  duracionMs?: number
  accion?: { etiqueta: string; onSelect: () => void }
}

function despachar(
  tipo: 'success' | 'error' | 'warning' | 'info',
  titulo: string,
  opciones?: OpcionesToast
) {
  return sonner[tipo](titulo, {
    description: opciones?.mensaje,
    duration: opciones?.duracionMs,
    action: opciones?.accion
      ? { label: opciones.accion.etiqueta, onClick: opciones.accion.onSelect }
      : undefined,
  })
}

export const toast = {
  exito: (titulo: string, opciones?: OpcionesToast) => despachar('success', titulo, opciones),
  error: (titulo: string, opciones?: OpcionesToast) => despachar('error', titulo, opciones),
  advertencia: (titulo: string, opciones?: OpcionesToast) =>
    despachar('warning', titulo, opciones),
  info: (titulo: string, opciones?: OpcionesToast) => despachar('info', titulo, opciones),
  descartar: (id?: string | number) => sonner.dismiss(id),
}

/**
 * Se monta UNA sola vez, en el shell de la app. Es el destino de todos los
 * `toast.*` de cualquier módulo.
 */
export function ContenedorToast(props: React.ComponentProps<typeof Toaster>) {
  return <Toaster position="bottom-right" closeButton richColors={false} {...props} />
}
