import { useTranslation } from 'react-i18next'
import { claveDeStock, varianteDeStock } from './detalle/vocabulario-stock'
import type { EstadoStockDispositivo } from '@/services/contracts/flota'
import { Badge } from '@/shared/ui/Badge'

/**
 * Badge del estado de STOCK del dispositivo (`f-05` §3).
 *
 * Es la "capa 2" que la primitiva `Badge` deja afuera a proposito: el mapeo
 * `codigo de catalogo -> variante + etiqueta` vive en el modulo, no en la primitiva. El mapeo real
 * esta en `detalle/vocabulario-stock.ts` y se REUSA en vez de duplicarse: si el listado y el detalle
 * pintaran el mismo codigo de dos colores distintos, el badge dejaria de significar algo.
 *
 * OJO — el codigo que viaja al backend es SIEMPRE el `snake_case` del catalogo (D-7). Aca solo se
 * traduce para mostrarlo: `en_stock` se lee "Disponible" pero se manda `en_stock`.
 */
export function DispositivoBadgeStock({ estado }: { estado: EstadoStockDispositivo }) {
  const { t } = useTranslation('flota')

  return (
    <Badge variante={varianteDeStock(estado)} punto>
      {t(claveDeStock(estado), { defaultValue: estado })}
    </Badge>
  )
}
