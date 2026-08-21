import type { ReactNode } from 'react'
import { AlertTriangle } from 'lucide-react'
import { Icono } from '@/shared/ui/Icono'
import { cn } from '@/shared/utils/cn'

/**
 * Familia D — `Aviso`. Banner compacto de error DENTRO de un formulario o un modal.
 *
 * ── NO ES `EstadoError`, Y LA DIFERENCIA ES LA REGLA ──────────────────────────────────────────
 * `EstadoError` es un bloque que ocupa la superficie entera: "esta sección no cargó". Acá el
 * formulario **sigue cargado y usable**, y el mensaje va arriba de los campos sin empujarlos fuera
 * de la vista.
 *
 * Cuál superficie usar en cada caso NO se decide componente por componente: la regla completa
 * —alcance (campo / operación / pantalla) y vida útil (persistente vs toast)— tiene un dueño, y es
 * `TracAutoV2/docsv2/02-arquitectura/frontend/04-patrones-de-pantalla.md` **§4**. Su resumen de una
 * línea: «Un `Aviso` para el fallo del guardado; `EstadoError` para la sección que no cargó.»
 * Acá se linkea, no se copia: si las dos versiones divergen, manda el §4.
 *
 * ── POR QUÉ VIVE EN `shared/` DESDE EL PRIMER DÍA ─────────────────────────────────────────────
 * Nació como `AvisoOperacion` dentro de Flota y llegó a **31 archivos importándolo**. No tiene una
 * línea de dominio —sus props son texto y un `ReactNode`—, así que era una primitiva de UI mal
 * ubicada, no un compuesto. Extraída en el slice **F-02**. De las 5 superficies de error del
 * sistema, era la única que no estaba en `shared/`: un módulo nuevo encontraba 4 y no la quinta, y
 * el lint (F8) le prohibía importarla de Flota — que es exactamente cómo nace el décimo clon.
 *
 * ── LO QUE FALTA, Y NO ES UN OLVIDO ───────────────────────────────────────────────────────────
 * **PENDIENTE (`DA-FE-35`): hoy existe SOLO la variante de peligro.** Un `tono` con `advertencia` e
 * `info` se agrega cuando aparezca el primer consumidor real que lo necesite, no antes: con cero
 * consumidores la API se diseña adivinando. Registro:
 * `TracAutoV2/docsv2/02-arquitectura/frontend/DECISIONES.md`.
 *
 * El copy entra YA RESUELTO desde `message_key` (nunca copy de negocio hardcodeado). `trazaId` se
 * muestra en mono y seleccionable: es el dato con el que soporte encuentra el request en los logs,
 * y por eso esta superficie es persistente — en un toast de 4 s no se puede copiar.
 */
export function Aviso({
  titulo,
  mensaje,
  trazaId,
  accion,
  className,
}: {
  /** Ya resuelto por i18n. */
  titulo: string
  mensaje?: string | null
  trazaId?: string | null
  /** Normalmente un botón de reintento. */
  accion?: ReactNode
  className?: string
}) {
  return (
    <div
      role="alert"
      className={cn(
        'flex flex-col gap-2 rounded-lg border border-peligro/40 bg-peligro-fondo px-4 py-3',
        className,
      )}
    >
      <p className="flex items-center gap-2 text-sm font-medium text-fg-primario">
        <Icono icono={AlertTriangle} tamano="sm" />
        {titulo}
      </p>
      {mensaje ? <p className="text-sm text-fg-secundario">{mensaje}</p> : null}
      {trazaId ? (
        <p className="font-mono text-xs tracking-wide text-fg-terciario select-all">{trazaId}</p>
      ) : null}
      {accion ? <div className="mt-1">{accion}</div> : null}
    </div>
  )
}
