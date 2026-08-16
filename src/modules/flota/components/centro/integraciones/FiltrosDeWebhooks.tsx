import { useTranslation } from 'react-i18next'
import { Search } from 'lucide-react'
import { Boton } from '@/shared/ui/Boton'
import { Campo } from '@/shared/ui/Campo'
import { Input } from '@/shared/ui/Input'
import { Select, type OpcionSelect } from '@/shared/ui/Select'
import { Toggle } from '@/shared/ui/Toggle'
import { claveDeEstadoDerivadoDeWebhook } from '../../../vocabulario-centro-problemas'
import {
  VALORES_FILTRO_ESTADO_WEBHOOK,
  type FiltrosDeWebhooks as Filtros,
} from '../../../vocabulario-integraciones'

/**
 * Toolbar de la lista de webhooks — ficha §5.
 *
 * ══ ES CLIENT-SIDE, Y LA PANTALLA LO DICE ═══════════════════════════════════════════════════════
 * El contrato **no declara query params de filtro** para este listado, y la ficha §5 lo resuelve
 * filtrando sobre el set paginado cargado (el volumen por organizacion es chico). Es la excepcion
 * que la ficha autoriza —el Centro **no** dibuja su toolbar, B-17— y por eso el aviso de alcance lo
 * pinta la pagina cuando hay mas de una pagina: ahi el filtro responde "los que coinciden **y**
 * cayeron en esta pagina".
 *
 * ══ 3 CONTROLES, NO 4: NO HAY FILTRO POR EVENTO ═════════════════════════════════════════════════
 * La ficha pide un select "Evento" por prefijo de dominio sobre `eventos[]`, y ese array llega
 * **vacio siempre** (PENDIENTE #3). Toda opcion distinta de "Todos" devolveria cero resultados en
 * toda organizacion: el chip que se manda y no filtra. No se dibuja.
 */
export function FiltrosDeWebhooks({
  filtros,
  hayFiltros,
  onCambio,
  onLimpiar,
}: {
  filtros: Filtros
  hayFiltros: boolean
  onCambio: (filtros: Filtros) => void
  onLimpiar: () => void
}) {
  const { t } = useTranslation('flota')

  const opciones: OpcionSelect[] = [
    { valor: '', etiqueta: t('centro.integraciones.filtros.estadoTodos') },
    ...VALORES_FILTRO_ESTADO_WEBHOOK.map((estado) => ({
      valor: estado,
      etiqueta: t(claveDeEstadoDerivadoDeWebhook(estado)),
    })),
  ]

  return (
    <div className="flex flex-wrap items-end gap-3">
      <Campo etiqueta={t('centro.integraciones.filtros.busqueda')} className="min-w-56 flex-1">
        {(control) => (
          <Input
            {...control}
            iconoIzq={Search}
            value={filtros.busqueda}
            onChange={(evento) => onCambio({ ...filtros, busqueda: evento.target.value })}
            placeholder={t('centro.integraciones.filtros.busquedaPlaceholder')}
          />
        )}
      </Campo>

      <Campo
        etiqueta={t('centro.integraciones.filtros.estado')}
        ayuda={
          filtros.estado === '' ? undefined : t('centro.integraciones.filtros.estadoPrevalece')
        }
        className="min-w-44"
      >
        {(control) => (
          <Select
            {...control}
            opciones={opciones}
            valor={filtros.estado}
            onCambio={(estado) => onCambio({ ...filtros, estado })}
          />
        )}
      </Campo>

      <Toggle
        etiqueta={t('centro.integraciones.filtros.soloActivos')}
        activo={filtros.soloActivos}
        onCambio={(soloActivos) => onCambio({ ...filtros, soloActivos })}
        deshabilitado={filtros.estado !== ''}
      />

      <Boton variante="secundaria" onClick={onLimpiar} deshabilitado={!hayFiltros}>
        {t('centro.integraciones.vacioSinResultados.limpiar')}
      </Boton>
    </div>
  )
}
