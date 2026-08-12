import { useTranslation } from 'react-i18next'
import { Badge } from '@/shared/ui/Badge'
import type { EstadoDocumento, LicenciaConductorDto } from '@/services/contracts/flota'
import {
  claveDeEstadoDocumento,
  estadoLicenciaVisible,
  varianteDeEstadoDocumento,
  varianteDeLicenciaVisible,
} from './vocabulario-licencia'

/**
 * Badge de la licencia de conducir.
 *
 * `estadoDerivado` es OPCIONAL y cambia la semantica del componente:
 *  - **Con** `estadoDerivado` (ficha: sale de `documentosObligatorios` / `DocumentoDto`) se pinta el
 *    catalogo real de 4 estados, umbral incluido, porque **lo calculo el backend**.
 *  - **Sin** el (listado: `ConductorListItemDto.licencia` no lo trae) se cae al vocabulario
 *    degradado de `vocabulario-licencia.ts`, que NO inventa el corte de "por vencer".
 *
 * Los dos casos estan explicados a fondo en `vocabulario-licencia.ts`; acá solo se renderiza.
 */
export function ConductorBadgeLicencia({
  licencia,
  estadoDerivado,
}: {
  licencia: LicenciaConductorDto | null
  /** Estado ya derivado por el backend. Si llega, gana. */
  estadoDerivado?: EstadoDocumento
}) {
  const { t } = useTranslation('flota')

  if (estadoDerivado !== undefined) {
    return (
      <Badge variante={varianteDeEstadoDocumento(estadoDerivado)}>
        {t(claveDeEstadoDocumento(estadoDerivado), { defaultValue: estadoDerivado })}
      </Badge>
    )
  }

  const estado = estadoLicenciaVisible(licencia)

  return (
    <Badge variante={varianteDeLicenciaVisible(estado)}>
      {t(`licenciaVisible.${estado}`, { defaultValue: estado })}
    </Badge>
  )
}
