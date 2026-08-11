import { useTranslation } from 'react-i18next'
import { Boton } from '@/shared/ui/Boton'
import { Select } from '@/shared/ui/Select'
import { Toggle } from '@/shared/ui/Toggle'
import type {
  EstadoStockDispositivo,
  FiltroAsignacionDispositivo,
} from '@/services/contracts/flota'
import { useModelosDispositivo } from '../../hooks/useModelosDispositivo'
import { claveDeStock } from './detalle/vocabulario-stock'
import type {
  FiltroAsignacion,
  FiltroModelo,
  FiltroStock,
} from '@/stores/flota-dispositivos-filters-store'

/**
 * Barra de filtros del listado de dispositivos GPS (`f-05` §6).
 *
 * Los CUATRO controles corresponden uno a uno con los 4 filtros que el server DECLARA
 * (`api.md`, tabla de estado de **D-S3-33**). Ni uno mas:
 *
 *  - **Estado de stock** → `stock`, los 4 codigos del catalogo.
 *  - **Modelo** → `modelo`. Sus opciones salen del catalogo growable, **nada hardcodeado**
 *    (DA-DL-03): los 4 modelos del mockup son datos de demo. El valor que viaja es el **uuid** de
 *    la fila, no el nombre (B-18) — mandar el nombre devuelve la lista entera sin filtrar.
 *  - **Asignación** → `asignacion`. **No es lo mismo que `stock=instalado`**: el server hace un
 *    `EXISTS` sobre la asignacion con periodo abierto, asi que mira el vinculo vigente y no el
 *    badge. Es el resto vivo del viejo select de conexion, del que **D-C8** separo `sin_asignar`
 *    porque nunca fue un estado de conexion.
 *  - **Solo activos** → `soloActivos`, default **on**.
 *
 * ── LO QUE NO SE DIBUJA, Y NO ES UN OLVIDO ────────────────────────────────────────────────────
 *  - **Conexión**: el server NO DECLARA el parametro (D-S3-33). Un query param que el binder no
 *    conoce se descarta SIN ERROR: el usuario elegiria "Desconectado" y recibiria la lista entera,
 *    en silencio. Ademas no tiene fuente hasta slice-05 (B-9). El chip entra cuando la fila de
 *    `api.md` diga ✅.
 *  - **Búsqueda libre**: `GET /dispositivos` no tiene param de busqueda en el contrato. El input no
 *    se pinta "por las dudas".
 */

/** Orden de lectura del select. Es el catalogo completo: acá sí se puede FILTRAR por `dado_de_baja`. */
const ESTADOS_STOCK: EstadoStockDispositivo[] = [
  'en_stock',
  'instalado',
  'en_reparacion',
  'dado_de_baja',
]

const ASIGNACIONES: FiltroAsignacionDispositivo[] = ['asignado', 'sin_asignar']

export interface FiltrosDispositivosProps {
  stock: FiltroStock
  modelo: FiltroModelo
  asignacion: FiltroAsignacion
  soloActivos: boolean
  hayFiltros: boolean
  onStock: (stock: FiltroStock) => void
  onModelo: (modelo: FiltroModelo) => void
  onAsignacion: (asignacion: FiltroAsignacion) => void
  onSoloActivos: (soloActivos: boolean) => void
  onLimpiar: () => void
}

export function FiltrosDispositivos({
  stock,
  modelo,
  asignacion,
  soloActivos,
  hayFiltros,
  onStock,
  onModelo,
  onAsignacion,
  onSoloActivos,
  onLimpiar,
}: FiltrosDispositivosProps) {
  const { t } = useTranslation('flota')
  const modelos = useModelosDispositivo()

  const opcionesStock = [
    { valor: '', etiqueta: t('dispositivosListado.filtros.stockTodos') },
    ...ESTADOS_STOCK.map((estado) => ({
      valor: estado,
      etiqueta: t(claveDeStock(estado), { defaultValue: estado }),
    })),
  ]

  // Mismo marcado que `SelectorCatalogoGrowable`: repetir el nombre de una fila GLOBAL es legal y
  // devuelve 201 (B-14), asi que el desplegable puede traer dos entradas con el mismo nombre. Sin la
  // marca son indistinguibles y el usuario elige a ciegas. Antes solo la marcaba el selector de los
  // formularios; el filtro mostraba `item.nombre` pelado.
  const opcionesModelo = [
    { valor: '', etiqueta: t('dispositivosListado.filtros.modeloTodos') },
    ...(modelos.data ?? []).map((item) => ({
      valor: item.id,
      etiqueta: item.esGlobal
        ? item.nombre
        : t('catalogoDispositivo.etiquetaPropia', { nombre: item.nombre }),
    })),
  ]

  const opcionesAsignacion = [
    { valor: '', etiqueta: t('dispositivosListado.filtros.asignacionTodos') },
    ...ASIGNACIONES.map((valor) => ({ valor, etiqueta: t(`filtroAsignacion.${valor}`) })),
  ]

  return (
    <div className="flex flex-wrap items-center gap-3 rounded-lg border border-borde bg-superficie-1 p-3">
      <FiltroSelect
        etiqueta={t('dispositivosListado.filtros.stock')}
        opciones={opcionesStock}
        valor={stock}
        onCambio={(valor) => onStock(valor as FiltroStock)}
      />

      <FiltroSelect
        etiqueta={t('dispositivosListado.filtros.modelo')}
        opciones={opcionesModelo}
        valor={modelo}
        // El catalogo viaja aparte del listado: mientras tanto el control se bloquea en vez de
        // ofrecer una lista incompleta donde el modelo buscado "no está".
        cargando={modelos.isPending}
        onCambio={onModelo}
      />

      <FiltroSelect
        etiqueta={t('dispositivosListado.filtros.asignacion')}
        opciones={opcionesAsignacion}
        valor={asignacion}
        onCambio={(valor) => onAsignacion(valor as FiltroAsignacion)}
      />

      <Toggle
        etiqueta={t('dispositivosListado.filtros.soloActivos')}
        activo={soloActivos}
        onCambio={onSoloActivos}
      />

      <Boton variante="fantasma" tamano="sm" deshabilitado={!hayFiltros} onClick={onLimpiar}>
        {t('dispositivosListado.filtros.limpiar')}
      </Boton>
    </div>
  )
}

function FiltroSelect({
  etiqueta,
  opciones,
  valor,
  cargando,
  onCambio,
}: {
  /** Ya resuelto por i18n. */
  etiqueta: string
  opciones: Array<{ valor: string; etiqueta: string }>
  valor: string
  cargando?: boolean
  onCambio: (valor: string) => void
}) {
  return (
    <label className="flex min-w-52 flex-col gap-1 text-xs text-fg-secundario">
      {etiqueta}
      <Select opciones={opciones} valor={valor} cargando={cargando} onCambio={onCambio} />
    </label>
  )
}
