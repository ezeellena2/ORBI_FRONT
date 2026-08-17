import type { ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import {
  CeldaAccionesConductor,
  CeldaAsignaciones,
  CeldaConductor,
  CeldaDni,
  CeldaEstado,
  CeldaLicencia,
  CeldaTelefono,
  type CeldaAccionesConductorProps,
} from './ConductorRow'
import type { ConductorListItemDto } from '@/services/contracts/flota'
import type { Columna, EstadoOrden } from '@/shared/ui/Columna'
import { Tabla } from '@/shared/ui/Tabla'

/**
 * Tabla del listado de conductores.
 *
 * ORDEN: la `clave` de la columna ordenable ES el valor que viaja como `sortBy` al backend
 * (`ConductorSortBy` = `Nombre` | `FechaCreacion`). Si la clave no coincide, el header se pinta
 * ordenado y el backend devuelve otro orden.
 *
 * **Nombre es la UNICA columna ordenable** y ademas es el default (`Nombre` **asc** — el unico
 * listado del modulo que no arranca en Desc). `FechaCreacion` esta en el enum pero **no tiene
 * columna** en la tabla de la ficha: no se inventa un header para ordenar por algo que no se ve.
 *
 * No hay columna de seleccion: la bulk bar no tiene endpoints bulk en el contrato (ficha §6).
 */

type AccionesProps = Omit<CeldaAccionesConductorProps, 'conductor'>

export interface TablaConductoresProps extends AccionesProps {
  conductores: ConductorListItemDto[]
  cargando: boolean
  orden: EstadoOrden
  onOrden: (orden: EstadoOrden) => void
  /** `EstadoVacio` ya elegido por la pagina: sin-datos y sin-resultados NO son el mismo vacio. */
  vacio: ReactNode
  /** `EstadoError` recuperable. La tabla conserva el encabezado y no desaparece. */
  error?: ReactNode
}

export function TablaConductores({
  conductores,
  cargando,
  orden,
  onOrden,
  vacio,
  error,
  ...acciones
}: TablaConductoresProps) {
  const { t } = useTranslation('flota')

  const columnas: Columna<ConductorListItemDto>[] = [
    {
      clave: 'Nombre',
      titulo: t('conductoresListado.columnas.conductor'),
      tipo: 'nodo',
      ordenable: true,
      ancho: 260,
      render: (conductor) => <CeldaConductor conductor={conductor} />,
    },
    {
      clave: 'dni',
      titulo: t('conductoresListado.columnas.dni'),
      tipo: 'mono',
      ancho: 128,
      render: (conductor) => <CeldaDni conductor={conductor} />,
    },
    {
      clave: 'telefono',
      titulo: t('conductoresListado.columnas.telefono'),
      tipo: 'mono',
      ancho: 144,
      render: (conductor) => <CeldaTelefono conductor={conductor} />,
    },
    {
      clave: 'asignaciones',
      titulo: t('conductoresListado.columnas.asignaciones'),
      tipo: 'nodo',
      ancho: 144,
      render: (conductor) => <CeldaAsignaciones conductor={conductor} />,
    },
    {
      clave: 'licencia',
      titulo: t('conductoresListado.columnas.licencia'),
      tipo: 'nodo',
      ancho: 160,
      render: (conductor) => <CeldaLicencia conductor={conductor} />,
    },
    {
      clave: 'estado',
      titulo: t('conductoresListado.columnas.estado'),
      tipo: 'nodo',
      ancho: 128,
      render: (conductor) => <CeldaEstado conductor={conductor} />,
    },
    {
      clave: 'acciones',
      titulo: t('conductoresListado.columnas.acciones'),
      tipo: 'acciones',
      alineacion: 'derecha',
      ancho: 64,
      render: (conductor) => <CeldaAccionesConductor conductor={conductor} {...acciones} />,
    },
  ]

  return (
    <Tabla
      columnas={columnas}
      filas={conductores}
      claveFila={(conductor) => conductor.id}
      orden={orden}
      onOrden={onOrden}
      cargando={cargando}
      filasSkeleton={8}
      vacio={vacio}
      error={error}
    />
  )
}
