import { useTranslation } from 'react-i18next'
import { claveDeConexion, VALORES_FILTRO_CONEXION } from '../../vocabulario-conexion'
import { claveDeSituacion, VALORES_SITUACION_VEHICULO } from '../../vocabulario-situacion'
import { BarraDeFiltros, FiltroSelect } from '@/shared/ui/BarraDeFiltros'
import type { FiltroConexion, FiltroSituacion } from '@/stores/flota-filters-store'

/**
 * Barra de filtros del listado de vehiculos (ficha §5).
 *
 * Los CUATRO controles corresponden uno a uno con filtros que el server DECLARA y que **filtran de
 * verdad** (tabla de estado de `api.md` §Vehiculos, verificada contra `VehiculosPageQuery` del C#).
 * Ni uno mas: este listado ya tuvo un filtro que se mandaba y el binder descartaba en silencio, y el
 * usuario recibia la lista entera creyendo que estaba filtrada.
 *
 *  - **Busqueda** → `patente`, parcial y case-insensitive. El texto lo gobierna la pagina (tiene el
 *    debounce); aca solo se dibuja.
 *  - **Conexion** → `estado`. Compuesto desde Telemetria: el server trae candidatos, compone,
 *    filtra y recien ahi pagina, asi que `totalItems` no miente.
 *  - **Situacion** → `situacion`. `EXISTS` intra-schema: **no depende de Telemetria** y sigue siendo
 *    exacto cuando la conexion no tiene datos (ver `vocabulario-situacion.ts`).
 *  - **Solo activos** → `soloActivos`, default **on**.
 *
 * ── LO QUE NO SE DIBUJA, Y NO ES UN OLVIDO ────────────────────────────────────────────────────
 *  - **Tipo**: el server SI declara el parametro, pero su unica fuente de opciones
 *    (`GET /api/flota/catalogos/tipos-vehiculo`) **no existe en `Flota.Api`** y el catalogo canonico
 *    esta vacio. Un select sin opciones no es un filtro, y la ficha prohibe la lista hardcodeada.
 *  - **`estado = incompleto`**: `VALORES_FILTRO_CONEXION` lo deja afuera porque matchea **0 filas**
 *    (ninguna capa emite ese codigo mientras B-31 siga abierta). Un chip que siempre devuelve cero
 *    sobre una flota que si tiene vehiculos sin GPS es peor que un chip ausente: el usuario concluye
 *    que no tiene ninguno. Para eso esta el chip de Situacion, que si los encuentra.
 *  - **Busqueda multi-campo**: el contrato define busqueda parcial **solo por `patente`**. El
 *    placeholder "patente, marca o modelo" del mockup no se implementa (PENDIENTE de la ficha §5).
 */

export interface VehiculoFiltrosProps {
  /** Texto tipeado, ANTES del debounce. Lo gobierna la pagina. */
  busqueda: string
  estado: FiltroConexion
  situacion: FiltroSituacion
  soloActivos: boolean
  /** ¿Hay algo que limpiar? Decide tambien cual de los 2 vacios muestra la pantalla. */
  hayFiltros: boolean
  onBusqueda: (busqueda: string) => void
  onEstado: (estado: FiltroConexion) => void
  onSituacion: (situacion: FiltroSituacion) => void
  onSoloActivos: (soloActivos: boolean) => void
  onLimpiar: () => void
}

export function VehiculoFiltros({
  busqueda,
  estado,
  situacion,
  soloActivos,
  hayFiltros,
  onBusqueda,
  onEstado,
  onSituacion,
  onSoloActivos,
  onLimpiar,
}: VehiculoFiltrosProps) {
  const { t } = useTranslation('flota')

  const opcionesEstado = [
    { valor: '', etiqueta: t('conexion.filtro.todos') },
    ...VALORES_FILTRO_CONEXION.map((valor) => ({
      valor,
      etiqueta: t(claveDeConexion(valor), { defaultValue: valor }),
    })),
  ]

  const opcionesSituacion = [
    { valor: '', etiqueta: t('vehiculosListado.filtros.situacionTodos') },
    ...VALORES_SITUACION_VEHICULO.map((valor) => ({
      valor,
      etiqueta: t(claveDeSituacion(valor), { defaultValue: valor }),
    })),
  ]

  return (
    <BarraDeFiltros
      busqueda={{
        valor: busqueda,
        onCambio: onBusqueda,
        placeholder: t('vehiculosListado.buscar.placeholder'),
        etiqueta: t('vehiculosListado.buscar.etiqueta'),
      }}
      soloActivos={{
        valor: soloActivos,
        onCambio: onSoloActivos,
        etiqueta: t('vehiculosListado.soloActivos'),
      }}
      hayFiltros={hayFiltros}
      onLimpiar={onLimpiar}
      etiquetaLimpiar={t('vehiculosListado.limpiar')}
    >
      <FiltroSelect
        etiqueta={t('conexion.filtro.etiqueta')}
        opciones={opcionesEstado}
        valor={estado}
        onCambio={(valor) => onEstado(valor as FiltroConexion)}
      />
      <FiltroSelect
        etiqueta={t('vehiculosListado.filtros.situacion')}
        opciones={opcionesSituacion}
        valor={situacion}
        onCambio={(valor) => onSituacion(valor as FiltroSituacion)}
      />
    </BarraDeFiltros>
  )
}
