import { useTranslation } from 'react-i18next'
import { Badge } from '@/shared/ui/Badge'
import type { EstadoConductor } from '@/services/contracts/flota'
import {
  badgeDeEstadoConductor,
  claveDeBadgeEstadoConductor,
  claveDeEstadoConductor,
  varianteDeBadgeEstadoConductor,
} from './vocabulario-conductor-asignacion'

/**
 * Badge de estado del conductor.
 *
 * ── DOS LECTURAS DEL MISMO DATO, Y NO SON LA MISMA ────────────────────────────────────────────
 *  - `agrupado` (default, LISTADO): la agrupacion **5 → 3** de la ficha §4 — `Activo` / `Inactivo` /
 *    `Pendiente`. Es PRESENTACION: no se persiste, no viaja en ningun request y combina el estado
 *    operativo con el flag `activo`, que son dos ejes ortogonales (DA-CD2-19). Sirve para escanear
 *    una tabla, no para operar.
 *  - `catalogo` (FICHA): la etiqueta es-AR del codigo `snake_case` tal cual — los 5 estados. Es lo
 *    que hace falta cuando el usuario va a decidir una transicion: "Pausado" y "En servicio" caen
 *    los dos en el badge verde del listado, y desde uno se puede pausar y desde el otro no.
 *
 * El codigo que viaja al backend es SIEMPRE el `snake_case` del catalogo (D-7): acá solo se traduce.
 */
export function ConductorBadgeEstado({
  estado,
  activo,
  variante = 'agrupado',
}: {
  estado: EstadoConductor
  activo: boolean
  variante?: 'agrupado' | 'catalogo'
}) {
  const { t } = useTranslation('flota')

  const badge = badgeDeEstadoConductor(estado, activo)
  const clave =
    variante === 'agrupado' ? claveDeBadgeEstadoConductor(badge) : claveDeEstadoConductor(estado)

  return (
    <Badge punto variante={varianteDeBadgeEstadoConductor(badge)}>
      {t(clave, { defaultValue: estado })}
    </Badge>
  )
}
