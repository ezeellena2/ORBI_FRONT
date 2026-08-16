import type { ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import {
  CeldaAcciones,
  CeldaConductores,
  CeldaCreado,
  CeldaDispositivo,
  CeldaEstado,
  CeldaPatente,
  CeldaSenales,
  CeldaUltimaSenal,
  CeldaVehiculo,
} from './VehiculoRow'
import type { IndiceDeSenales } from '../../vocabulario-senales'
import type { VehiculoListItemDto } from '@/services/contracts/flota'
import type { Columna, EstadoOrden } from '@/shared/ui/Columna'
import { Tabla } from '@/shared/ui/Tabla'

/**
 * Tabla del listado de vehiculos.
 *
 * Solo tiene columnas que TIENEN campo en `VehiculoListItemDto`: una columna sin dato detras es
 * una promesa que el backend no puede cumplir.
 *
 * ORDEN: la `clave` de cada columna ordenable ES el valor que viaja como `sortBy` al backend
 * (`VehiculoSortBy` = `Patente` | `FechaCreacion`). No es un detalle cosmetico: si la clave no
 * coincide, el header se pinta ordenado y el backend devuelve otro orden.
 *
 * "Estado" NO es ordenable a proposito: es un campo compuesto desde Telemetria y no existe como
 * columna en la base, asi que no se puede ordenar server-side (`api.md` §Convenciones).
 *
 * No hay columna de seleccion: la bulk bar no entra en este slice y un checkbox que no habilita
 * nada es ruido.
 */

export interface TablaVehiculosProps {
  vehiculos: VehiculoListItemDto[]
  cargando: boolean
  orden: EstadoOrden
  onOrden: (orden: EstadoOrden) => void
  /** `EstadoVacio` ya elegido por la pagina: sin-datos y sin-resultados NO son el mismo vacio. */
  vacio: ReactNode
  /** `EstadoError` recuperable. La tabla conserva el encabezado y no desaparece. */
  error?: ReactNode
  puedeEliminar: boolean
  /**
   * Señales de la pagina, ya indexadas por vehiculo. Lo arma la pagina de **una sola** respuesta de
   * `GET /alertas` (`f-12` paso 3: "una sola llamada por pagina, no una por fila"). El endpoint no
   * acepta `?vehiculoId=`, asi que una request por fila serian N requests sin filtro.
   */
  indiceDeSenales: IndiceDeSenales
  onVerDetalle: (vehiculo: VehiculoListItemDto) => void
  onEliminar: (vehiculo: VehiculoListItemDto) => void
}

export function TablaVehiculos({
  vehiculos,
  cargando,
  orden,
  onOrden,
  vacio,
  error,
  puedeEliminar,
  indiceDeSenales,
  onVerDetalle,
  onEliminar,
}: TablaVehiculosProps) {
  const { t } = useTranslation('flota')

  const columnas: Columna<VehiculoListItemDto>[] = [
    {
      clave: 'Patente',
      titulo: t('vehiculosListado.columnas.patente'),
      tipo: 'mono',
      ordenable: true,
      ancho: 128,
      render: (vehiculo) => <CeldaPatente vehiculo={vehiculo} />,
    },
    {
      clave: 'vehiculo',
      titulo: t('vehiculosListado.columnas.vehiculo'),
      tipo: 'nodo',
      render: (vehiculo) => <CeldaVehiculo vehiculo={vehiculo} />,
    },
    {
      clave: 'dispositivo',
      titulo: t('vehiculosListado.columnas.dispositivo'),
      tipo: 'mono',
      ancho: 136,
      render: (vehiculo) => <CeldaDispositivo vehiculo={vehiculo} />,
    },
    {
      clave: 'conductores',
      titulo: t('vehiculosListado.columnas.conductores'),
      tipo: 'nodo',
      ancho: 168,
      render: (vehiculo) => <CeldaConductores vehiculo={vehiculo} />,
    },
    {
      clave: 'estado',
      titulo: t('vehiculosListado.columnas.estado'),
      tipo: 'nodo',
      ancho: 168,
      render: (vehiculo) => <CeldaEstado vehiculo={vehiculo} />,
    },
    {
      clave: 'ultimaSenal',
      titulo: t('vehiculosListado.columnas.ultimaSenal'),
      tipo: 'nodo',
      ancho: 136,
      render: (vehiculo) => <CeldaUltimaSenal vehiculo={vehiculo} />,
    },
    /*
      SEÑALES — columna nueva de `f-12`.

      ⚠️ NO la declara la ficha (`01-spec/pantallas/vehiculos-listado.md` §Columnas lista 8 y esta no
      esta): la agrega `f-12` paso 3, que es 03-build. Queda reportado como drift ficha × paso.

      No es ordenable, por el mismo motivo que "Estado": se compone en cliente desde OTRA respuesta,
      asi que no existe como columna en la base y `sortBy` no la acepta (`api.md` §Convenciones).
    */
    {
      clave: 'senales',
      titulo: t('vehiculosListado.columnas.senales'),
      tipo: 'nodo',
      ancho: 132,
      render: (vehiculo) => (
        <CeldaSenales vehiculo={vehiculo} indiceDeSenales={indiceDeSenales} />
      ),
    },
    {
      clave: 'FechaCreacion',
      titulo: t('vehiculosListado.columnas.creado'),
      tipo: 'fecha',
      ordenable: true,
      ancho: 136,
      render: (vehiculo) => <CeldaCreado vehiculo={vehiculo} />,
    },
    {
      clave: 'acciones',
      titulo: t('vehiculosListado.columnas.acciones'),
      tipo: 'acciones',
      alineacion: 'derecha',
      ancho: 64,
      render: (vehiculo) => (
        <CeldaAcciones
          vehiculo={vehiculo}
          puedeEliminar={puedeEliminar}
          onVerDetalle={onVerDetalle}
          onEliminar={onEliminar}
        />
      ),
    },
  ]

  return (
    <Tabla
      columnas={columnas}
      filas={vehiculos}
      claveFila={(vehiculo) => vehiculo.id}
      orden={orden}
      onOrden={onOrden}
      cargando={cargando}
      filasSkeleton={8}
      vacio={vacio}
      error={error}
    />
  )
}
