import type { ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import {
  CeldaAcciones,
  CeldaAliasImei,
  CeldaModelo,
  CeldaStock,
  CeldaUltimaSenal,
  CeldaVehiculo,
} from './DispositivoRow'
import type { DispositivoListItemDto } from '@/services/contracts/flota'
import type { Columna, EstadoOrden } from '@/shared/ui/Columna'
import { Tabla } from '@/shared/ui/Tabla'

/**
 * Tabla del listado de dispositivos GPS.
 *
 * ORDEN: la `clave` de la columna ordenable ES el valor que viaja como `sortBy` al backend
 * (`DispositivoSortBy` = `Imei` | `FechaCreacion`). Si la clave no coincide, el header se pinta
 * ordenado y el backend devuelve otro orden.
 *
 * **Alias/IMEI es la UNICA columna ordenable** (`sortBy=Imei`, ficha §4). "Ultima senal" dejo de
 * serlo en B-17: no esta en el enum `sortBy`, asi que un header clickeable ahi seria una promesa
 * que el backend no puede cumplir.
 *
 * No hay columna de seleccion: la bulk bar no tiene endpoints bulk en el contrato (ficha §12), y un
 * checkbox que no habilita nada es ruido.
 */

export interface TablaDispositivosProps {
  dispositivos: DispositivoListItemDto[]
  cargando: boolean
  orden: EstadoOrden
  onOrden: (orden: EstadoOrden) => void
  /** `EstadoVacio` ya elegido por la pagina: sin-datos y sin-resultados NO son el mismo vacio. */
  vacio: ReactNode
  /** `EstadoError` recuperable. La tabla conserva el encabezado y no desaparece. */
  error?: ReactNode
  puedeEditar: boolean
  puedeGestionarStock: boolean
  puedeEliminar: boolean
  puedeAsignarVehiculo: boolean
  onVerDetalle: (dispositivo: DispositivoListItemDto) => void
  onEditar: (dispositivo: DispositivoListItemDto) => void
  onCambiarEstadoStock: (dispositivo: DispositivoListItemDto) => void
  onEliminar: (dispositivo: DispositivoListItemDto) => void
  onAsignarVehiculo?: (dispositivo: DispositivoListItemDto) => void
}

export function TablaDispositivos({
  dispositivos,
  cargando,
  orden,
  onOrden,
  vacio,
  error,
  puedeEditar,
  puedeGestionarStock,
  puedeEliminar,
  puedeAsignarVehiculo,
  onVerDetalle,
  onEditar,
  onCambiarEstadoStock,
  onEliminar,
  onAsignarVehiculo,
}: TablaDispositivosProps) {
  const { t } = useTranslation('flota')

  const columnas: Columna<DispositivoListItemDto>[] = [
    {
      clave: 'Imei',
      titulo: t('dispositivosListado.columnas.aliasImei'),
      tipo: 'mono',
      ordenable: true,
      ancho: 224,
      render: (dispositivo) => <CeldaAliasImei dispositivo={dispositivo} />,
    },
    {
      clave: 'modelo',
      titulo: t('dispositivosListado.columnas.modelo'),
      tipo: 'texto',
      ancho: 176,
      render: (dispositivo) => <CeldaModelo dispositivo={dispositivo} />,
    },
    {
      clave: 'vehiculo',
      titulo: t('dispositivosListado.columnas.vehiculo'),
      tipo: 'nodo',
      ancho: 136,
      render: (dispositivo) => <CeldaVehiculo dispositivo={dispositivo} />,
    },
    {
      clave: 'stock',
      titulo: t('dispositivosListado.columnas.stock'),
      tipo: 'nodo',
      ancho: 152,
      render: (dispositivo) => <CeldaStock dispositivo={dispositivo} />,
    },
    {
      clave: 'ultimaSenal',
      titulo: t('dispositivosListado.columnas.ultimaSenal'),
      tipo: 'nodo',
      ancho: 136,
      render: (dispositivo) => <CeldaUltimaSenal dispositivo={dispositivo} />,
    },
    {
      clave: 'acciones',
      titulo: t('dispositivosListado.columnas.acciones'),
      tipo: 'acciones',
      alineacion: 'derecha',
      ancho: 64,
      render: (dispositivo) => (
        <CeldaAcciones
          dispositivo={dispositivo}
          puedeEditar={puedeEditar}
          puedeGestionarStock={puedeGestionarStock}
          puedeEliminar={puedeEliminar}
          puedeAsignarVehiculo={puedeAsignarVehiculo}
          onVerDetalle={onVerDetalle}
          onEditar={onEditar}
          onCambiarEstadoStock={onCambiarEstadoStock}
          onEliminar={onEliminar}
          onAsignarVehiculo={onAsignarVehiculo}
        />
      ),
    },
  ]

  return (
    <Tabla
      columnas={columnas}
      filas={dispositivos}
      claveFila={(dispositivo) => dispositivo.id}
      orden={orden}
      onOrden={onOrden}
      cargando={cargando}
      filasSkeleton={8}
      vacio={vacio}
      error={error}
    />
  )
}
