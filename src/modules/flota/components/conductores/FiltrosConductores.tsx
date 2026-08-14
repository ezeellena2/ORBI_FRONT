import { useTranslation } from 'react-i18next'
import { Boton } from '@/shared/ui/Boton'
import { Select } from '@/shared/ui/Select'
import { Toggle } from '@/shared/ui/Toggle'
import type {
  FiltroAsignacionConductor,
  FiltroEstadoConductor,
} from '@/services/contracts/flota'
import type { FiltroAsignacion, FiltroEstado } from '@/stores/flota-conductores-filters-store'

/**
 * Barra de filtros del listado de conductores (**slice-04** `f-05` §3, revisada en **slice-05**
 * `f-06`). El slice se nombra a proposito: los dos tienen un paso `f-05` y un `f-06`, y sin el
 * prefijo la referencia manda al archivo equivocado.
 *
 * Los TRES controles corresponden uno a uno con los 3 filtros que el server DECLARA (`api.md`
 * §Conductores, tabla de estado de implementacion). Ni uno mas:
 *
 *  - **Estado** → `estado`. ⚠️ NO es el catalogo de estados operativos aunque el parametro se llame
 *    igual: `activo`/`inactivo` miran el flag de baja logica, y `licencia_*` se derivan del
 *    documento de tipo `licencia`. **Ninguno de los 5 codigos del catalogo** (`disponible`,
 *    `en_servicio`, `pausado`, `suspendido`, `pendiente_documentacion`) es un valor valido acá.
 *  - **Asignacion** → `asignacion` (`con_vehiculo` | `sin_vehiculo`). Vocabulario PROPIO: no se
 *    reusa el de dispositivos (`asignado`/`sin_asignar`) porque el valor viaja LITERAL en el query
 *    string y colapsarlos haria que el filtro no filtre.
 *  - **Solo activos** → `soloActivos`, default **on**.
 *
 * ── LO QUE NO SE DIBUJA, Y NO ES UN OLVIDO ────────────────────────────────────────────────────
 *  - **Select de Licencia** (`a`|`b1`|…|`e2`): `api.md` lo contrata y el server **NO DECLARA el
 *    parametro** — la categoria no tiene columna en ninguna tabla (**B-21**). Un query param que el
 *    binder no conoce se descarta SIN ERROR: el usuario elegiria "B1" y recibiria la lista entera,
 *    en silencio. Es peor que no tener el chip. Entra cuando la fila de `api.md` diga ✅.
 *  - **Busqueda libre**: `GET /conductores` no declara `search`. El input no se pinta "por las
 *    dudas" (el placeholder del mockup promete buscar por nombre, DNI, email y telefono).
 *  - **Opcion "Pendiente documentacion"** del select Estado: no tiene valor de filtro en el
 *    contrato. La lista cierra en 4.
 *  - **Los 4 contadores del header**: **B-35**, sigue abierta despues de slice-05. No hay endpoint
 *    agregado ni campos de conteo en el response; el `total` de `PagedResult` cuenta lo FILTRADO, no
 *    la flota, asi que ni siquiera sirve para el primero.
 *  - **Chip de Conexion**: este listado **no compone Telemetria** (`ConductorListItemDto` no tiene
 *    campo de conexion) y `ConductoresPageQuery` no declara el parametro. Es lo que hace que la
 *    pantalla no degrade cuando Telemetria se cae.
 */

/** Orden de lectura del select. Es el vocabulario completo del contrato, sin agregados. */
const ESTADOS: FiltroEstadoConductor[] = [
  'activo',
  'inactivo',
  'licencia_proxima_a_vencer',
  'licencia_vencida',
]

const ASIGNACIONES: FiltroAsignacionConductor[] = ['con_vehiculo', 'sin_vehiculo']

export interface FiltrosConductoresProps {
  estado: FiltroEstado
  asignacion: FiltroAsignacion
  soloActivos: boolean
  hayFiltros: boolean
  onEstado: (estado: FiltroEstado) => void
  onAsignacion: (asignacion: FiltroAsignacion) => void
  onSoloActivos: (soloActivos: boolean) => void
  onLimpiar: () => void
}

export function FiltrosConductores({
  estado,
  asignacion,
  soloActivos,
  hayFiltros,
  onEstado,
  onAsignacion,
  onSoloActivos,
  onLimpiar,
}: FiltrosConductoresProps) {
  const { t } = useTranslation('flota')

  const opcionesEstado = [
    { valor: '', etiqueta: t('conductoresListado.filtros.estadoTodos') },
    ...ESTADOS.map((valor) => ({ valor, etiqueta: t(`filtroEstadoConductor.${valor}`) })),
  ]

  const opcionesAsignacion = [
    { valor: '', etiqueta: t('conductoresListado.filtros.asignacionTodos') },
    ...ASIGNACIONES.map((valor) => ({ valor, etiqueta: t(`filtroAsignacionConductor.${valor}`) })),
  ]

  return (
    <div className="flex flex-wrap items-center gap-3 rounded-lg border border-borde bg-superficie-1 p-3">
      <FiltroSelect
        etiqueta={t('conductoresListado.filtros.estado')}
        opciones={opcionesEstado}
        valor={estado}
        onCambio={(valor) => onEstado(valor as FiltroEstado)}
      />

      <FiltroSelect
        etiqueta={t('conductoresListado.filtros.asignacion')}
        opciones={opcionesAsignacion}
        valor={asignacion}
        onCambio={(valor) => onAsignacion(valor as FiltroAsignacion)}
      />

      <Toggle
        etiqueta={t('conductoresListado.filtros.soloActivos')}
        activo={soloActivos}
        onCambio={onSoloActivos}
      />

      <Boton variante="fantasma" tamano="sm" deshabilitado={!hayFiltros} onClick={onLimpiar}>
        {t('conductoresListado.filtros.limpiar')}
      </Boton>
    </div>
  )
}

function FiltroSelect({
  etiqueta,
  opciones,
  valor,
  onCambio,
}: {
  /** Ya resuelto por i18n. */
  etiqueta: string
  opciones: Array<{ valor: string; etiqueta: string }>
  valor: string
  onCambio: (valor: string) => void
}) {
  return (
    <label className="flex min-w-52 flex-col gap-1 text-xs text-fg-secundario">
      {etiqueta}
      <Select opciones={opciones} valor={valor} onCambio={onCambio} />
    </label>
  )
}
