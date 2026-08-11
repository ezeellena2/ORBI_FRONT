import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import { MapPin, MoreVertical, Pencil, Smartphone, Trash2, Users } from 'lucide-react'
import { Boton } from '@/shared/ui/Boton'
import { BotonIcono } from '@/shared/ui/BotonIcono'
import { MenuAcciones, type ItemMenuAcciones } from '@/shared/ui/MenuAcciones'
import { AccionConMotivo } from '../AccionConMotivo'
import { usePermisos } from '../../hooks/usePermisos'

/**
 * Acciones del hero: "Ver en mapa" · "Editar" · kebab.
 *
 * Comportamiento por verbo (contrato de permisos): `editar` y `asignar-*` se DESHABILITAN con su
 * motivo; `eliminar` se OCULTA. Los dos ítems que faltan respecto del mockup no son un olvido:
 * "Compartir" no tiene endpoint declarado (en el MVP ningún elemento se gatea con `compartir`) y
 * "Exportar ficha" no tiene ni permiso ni endpoint (DA-VD-10 abierta). Dibujarlos sería prometer
 * una función que no existe.
 */
export function AccionesVehiculo({
  vehiculoFlotaId,
  onEditar,
  onDarDeBaja,
  onCambiarDispositivo,
}: {
  vehiculoFlotaId: string
  onEditar: () => void
  onDarDeBaja: () => void
  onCambiarDispositivo: () => void
}) {
  const { t } = useTranslation(['flota', 'common'])
  const { tienePermiso } = usePermisos()

  const motivoSinPermiso = (permiso: string) => t('flota:detalle.acciones.sinPermiso', { permiso })
  const motivoProximoSlice = t('flota:detalle.acciones.llegaEnOtroSlice')

  // "Cambiar dispositivo" dejó de estar apagada: abre el MISMO modal que el tab GPS (asociar y
  // cambiar son la misma operación — el `POST` cierra la anterior). Sin permiso queda deshabilitada
  // con su motivo, que es el comportamiento del verbo `asignar-*`, no oculta.
  const puedeAsignarDispositivo = tienePermiso('flota.vehiculos.asignar-dispositivo')

  const items: ItemMenuAcciones[] = [
    {
      clave: 'dispositivo',
      etiqueta: t('flota:detalle.acciones.cambiarDispositivo'),
      icono: Smartphone,
      deshabilitado: !puedeAsignarDispositivo,
      motivo: puedeAsignarDispositivo
        ? undefined
        : motivoSinPermiso('flota.vehiculos.asignar-dispositivo'),
      onSelect: onCambiarDispositivo,
    },
    {
      clave: 'conductores',
      etiqueta: t('flota:detalle.acciones.gestionarConductores'),
      icono: Users,
      deshabilitado: true,
      motivo: tienePermiso('flota.vehiculos.asignar-conductor')
        ? motivoProximoSlice
        : motivoSinPermiso('flota.vehiculos.asignar-conductor'),
    },
  ]

  if (tienePermiso('flota.vehiculos.eliminar')) {
    items.push({
      clave: 'baja',
      etiqueta: t('flota:detalle.acciones.darDeBaja'),
      icono: Trash2,
      tono: 'peligro',
      separadorAntes: true,
      onSelect: onDarDeBaja,
    })
  }

  const puedeEditar = tienePermiso('flota.vehiculos.editar')

  return (
    <div className="flex shrink-0 items-center gap-2">
      <Boton
        variante="superficie"
        tamano="sm"
        iconoIzq={MapPin}
        render={<Link to={`/app/flota/mapa?vehicle=${vehiculoFlotaId}`} />}
      >
        {t('flota:detalle.acciones.verEnMapa')}
      </Boton>

      <AccionConMotivo motivo={puedeEditar ? undefined : motivoSinPermiso('flota.vehiculos.editar')}>
        <Boton
          variante="superficie"
          tamano="sm"
          iconoIzq={Pencil}
          deshabilitado={!puedeEditar}
          onClick={onEditar}
        >
          {t('flota:detalle.acciones.editar')}
        </Boton>
      </AccionConMotivo>

      <MenuAcciones
        disparador={
          <BotonIcono
            icono={MoreVertical}
            etiqueta={t('flota:detalle.acciones.masAcciones')}
            variante="superficie"
            tamano="sm"
          />
        }
        items={items}
      />
    </div>
  )
}
