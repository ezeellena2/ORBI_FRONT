import { useTranslation } from 'react-i18next'
import {
  claveDeSeveridadAlerta,
} from '../../vocabulario-centro-problemas'
import { varianteDeSeveridadAlerta } from '../../vocabulario-senales'
import type { SeveridadAlerta } from '@/services/contracts/flota'
import { Badge } from '@/shared/ui/Badge'

/**
 * Badge de severidad de una SEÑAL. Read-only, sin acciones: la gestion vive en el Centro de
 * Problemas (`f-12` §Objetivo — "todo read-only").
 *
 * ⚠️ **Este badge solo se dibuja cuando HAY señales.** No existe una variante "en cero": `f-12` paso 3
 * lo pide explicito ("sin señales ⇒ texto compacto y no alarmista, **no un badge en cero**") y el
 * motivo es el de siempre — un `0` verde afirma "revisado y limpio", que hoy no se puede afirmar.
 * Quien decide si corresponde badge o texto es `lecturaDeSenales`, no este componente.
 *
 * Los codigos van en `snake_case` tal como los sirve el backend (D-7) y son **3**, no 4: el
 * vocabulario de la señal (`severidades_alerta_flota`) no tiene `critica`. Ver `PESO_DE_SEVERIDAD`.
 *
 * El texto viaja SIEMPRE: el color no es el unico portador de significado (regla de la primitiva
 * `Badge`). El `punto` se agrega porque en una celda de tabla el badge compite con 7 columnas mas.
 */

export interface SenalBadgeSeveridadProps {
  severidad: SeveridadAlerta
  /** Cuantas señales activas hay. Con mas de una se muestra el conteo al lado de la severidad. */
  cantidad?: number
}

export function SenalBadgeSeveridad({ severidad, cantidad }: SenalBadgeSeveridadProps) {
  const { t } = useTranslation('flota')

  const etiqueta = t(claveDeSeveridadAlerta(severidad), { defaultValue: severidad })

  return (
    <Badge variante={varianteDeSeveridadAlerta(severidad)} punto>
      {cantidad !== undefined && cantidad > 1
        ? t('senales.badge.conConteo', { severidad: etiqueta, count: cantidad })
        : etiqueta}
    </Badge>
  )
}
