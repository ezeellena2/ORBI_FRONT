/* ─────────────────────────────────────────────────────────────────────────────
 * EDITADO RESPECTO DEL UPSTREAM DE shadcn/ui — declarado acá para que la
 * próxima re-copia (`shadcn add sonner --overwrite`) sea un diff legible y no
 * una arqueología (02-primitivas.md §1.6 y §13).
 *
 * Qué se cambió, y por qué — un solo cambio:
 *   Se quitó `useTheme` de `next-themes`. En ORBI el tema NO viaja por
 *   `next-themes` ni por `prefers-color-scheme`: viaja por el atributo
 *   `data-theme` en `<html>` (01-sistema-de-diseno.md §5.1 y §5.5), y el color
 *   del toast ya llega por los `--normal-*` de abajo, que apuntan a nuestros
 *   alias. Mantener la dependencia habría metido un segundo dueño del tema —
 *   exactamente lo que la regla F7 de `06-capa-0-frontend.md` prohíbe— a cambio
 *   de nada. `next-themes` se desinstaló del `package.json`.
 *
 * Todo lo demás (íconos, estructura, `toastOptions`) es upstream sin tocar.
 * ───────────────────────────────────────────────────────────────────────────── */

import type * as React from 'react'
import { Toaster as Sonner, type ToasterProps } from 'sonner'
import {
  CircleCheckIcon,
  InfoIcon,
  TriangleAlertIcon,
  OctagonXIcon,
  Loader2Icon,
} from 'lucide-react'

const Toaster = ({ ...props }: ToasterProps) => {
  return (
    <Sonner
      className="toaster group"
      icons={{
        success: <CircleCheckIcon className="size-4" />,
        info: <InfoIcon className="size-4" />,
        warning: <TriangleAlertIcon className="size-4" />,
        error: <OctagonXIcon className="size-4" />,
        loading: <Loader2Icon className="size-4 animate-spin" />,
      }}
      style={
        {
          '--normal-bg': 'var(--popover)',
          '--normal-text': 'var(--popover-foreground)',
          '--normal-border': 'var(--border)',
          '--border-radius': 'var(--radius)',
        } as React.CSSProperties
      }
      toastOptions={{
        classNames: {
          toast: 'cn-toast',
        },
      }}
      {...props}
    />
  )
}

export { Toaster }
