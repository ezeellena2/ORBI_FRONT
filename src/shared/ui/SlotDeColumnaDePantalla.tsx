import { createContext, use, useState, type ReactNode } from 'react'
import { createPortal } from 'react-dom'

/**
 * El hueco donde una PANTALLA monta su propia columna lateral, al lado de la del módulo.
 *
 * ── POR QUÉ HACE FALTA UN SLOT Y NO ALCANZA CON RENDERIZARLA EN LA PANTALLA ───────────────────
 * Las columnas son CROMO: van pegadas entre sí, a toda altura, separadas por un borde. Si la
 * pantalla la renderiza dentro de su propio contenido, hereda el `p-6` del `<main>` y queda
 * **despegada** — medido: la columna del módulo terminaba en x=480 y la de la pantalla arrancaba
 * en x=504, con 24px de aire en el medio y sin llegar al alto completo.
 *
 * Con el slot, la pantalla sigue siendo la DUEÑA de su columna (es contenido suyo, no del shell)
 * pero se monta como hermana de la del módulo. Ownership sin costo visual.
 */
const ContextoDelSlot = createContext<HTMLElement | null>(null)

export function ProveedorDelSlot({ children }: { children: (slot: ReactNode) => ReactNode }) {
  const [nodo, setNodo] = useState<HTMLElement | null>(null)

  return (
    <ContextoDelSlot value={nodo}>
      {children(<div ref={setNodo} className="contents" />)}
    </ContextoDelSlot>
  )
}

/**
 * Monta `children` en el slot del shell. Si no hay slot —una pantalla renderizada fuera del
 * `AppShell`, p. ej. en Storybook— cae a renderizar en su lugar, que es lo honesto: se ve, aunque
 * sin el layout de columnas.
 */
export function ColumnaDePantalla({ children }: { children: ReactNode }) {
  const slot = use(ContextoDelSlot)
  return slot === null ? <>{children}</> : createPortal(children, slot)
}
