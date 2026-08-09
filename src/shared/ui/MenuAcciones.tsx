import type { LucideIcon } from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/shared/ui/base/dropdown-menu'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/shared/ui/base/tooltip'
import { Icono } from '@/shared/ui/Icono'
import { cn } from '@/shared/utils/cn'

/**
 * Familia A — `MenuAcciones`. Origen: ENVOLVER (02-primitivas.md).
 *
 * Lo que ya viene resuelto por Base UI y NO se reimplementa (R11): navegación
 * con flechas, `Home`/`End`, type-ahead, `Escape` cierra, foco devuelto al
 * disparador, portal con detección de colisión y bloqueo de scroll. Es el kebab
 * que cada fila de una tabla repite 20 veces por pantalla.
 *
 * Lo que aporta la envoltura:
 *  1. API declarativa por `items[]` en vez de composición manual — un menú de
 *     fila se declara con datos, no con 8 componentes anidados.
 *  2. **El MOTIVO del deshabilitado, en tooltip.** `deshabilitado` nunca va
 *     solo: un ítem muerto sin explicación se reporta como bug. Cuando un ítem
 *     se apaga por falta de permiso, el usuario tiene que poder leer por qué.
 *
 * Detalle no obvio del punto 2: un ítem deshabilitado tiene
 * `pointer-events: none`, así que el tooltip NO se dispara sobre él. Por eso el
 * disparador del tooltip es un `<span>` que envuelve al ítem — y además el
 * motivo se repite en un `sr-only`, porque un tooltip sobre un elemento
 * deshabilitado no se le anuncia a un lector de pantalla.
 */

export interface ItemMenuAcciones {
  /** Clave estable. No se muestra. */
  clave: string
  /** Texto visible. Ya resuelto por i18n antes de llegar acá (R5). */
  etiqueta: string
  icono?: LucideIcon
  onSelect?: () => void
  deshabilitado?: boolean
  /** POR QUÉ está deshabilitado. Obligatorio si `deshabilitado` es true. */
  motivo?: string
  tono?: 'normal' | 'peligro'
  /** Dibuja un separador ANTES de este ítem. */
  separadorAntes?: boolean
}

export interface MenuAccionesProps {
  /** El elemento que abre el menú. Normalmente un `BotonIcono`. */
  disparador: React.ReactElement
  items: ItemMenuAcciones[]
  alineacion?: 'start' | 'center' | 'end'
  lado?: 'top' | 'bottom' | 'left' | 'right'
}

function Contenido({ item }: { item: ItemMenuAcciones }) {
  return (
    <>
      {item.icono ? <Icono icono={item.icono} tamano="md" /> : null}
      <span>{item.etiqueta}</span>
    </>
  )
}

export function MenuAcciones({
  disparador,
  items,
  alineacion = 'end',
  lado = 'bottom',
}: MenuAccionesProps) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger render={disparador} />
      <DropdownMenuContent
        align={alineacion}
        side={lado}
        className="w-auto min-w-48 border border-borde bg-superficie-3 text-fg-primario shadow-lg"
      >
        {items.map((item) => {
          const clasesItem = cn(
            'gap-2 px-2 py-1.5 text-sm',
            item.tono === 'peligro' ? 'text-peligro' : 'text-fg-primario'
          )

          const elemento = (
            <DropdownMenuItem
              key={item.clave}
              disabled={item.deshabilitado}
              onClick={item.deshabilitado ? undefined : item.onSelect}
              className={clasesItem}
            >
              <Contenido item={item} />
              {item.deshabilitado && item.motivo ? (
                <span className="sr-only">{item.motivo}</span>
              ) : null}
            </DropdownMenuItem>
          )

          return (
            <div key={item.clave}>
              {item.separadorAntes ? (
                <DropdownMenuSeparator className="my-1 bg-borde" />
              ) : null}
              {item.deshabilitado && item.motivo ? (
                <Tooltip>
                  <TooltipTrigger render={<span className="block" />}>{elemento}</TooltipTrigger>
                  <TooltipContent className="bg-superficie-3 text-fg-primario shadow-lg">
                    {item.motivo}
                  </TooltipContent>
                </Tooltip>
              ) : (
                elemento
              )}
            </div>
          )
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
