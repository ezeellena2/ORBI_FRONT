import { useTranslation } from 'react-i18next'
import { UserRound } from 'lucide-react'
import { Avatar } from '@/shared/ui/Avatar'
import { Badge } from '@/shared/ui/Badge'
import { Card } from '@/shared/ui/Card'
import { EstadoVacio } from '@/shared/ui/EstadoVacio'
import type { VehiculoConductorAsignadoDto, VehiculoDetalleDto } from '@/services/contracts/flota'
import { ParDato } from './ParDato'
import { formatearFecha } from './formato'

/**
 * Conductores asignados. TODO sale del propio `VehiculoDetalleDto`: este tab NO emite ningún request
 * extra, porque los endpoints de asignación llegan en slice-04 y llamar a una ruta que no existe
 * produciría un 404 que la pantalla tendría que disfrazar.
 *
 * EMPTY POR TAB. El copy exacto sigue PENDIENTE (DA-VD-06, sin mockup): se usa el genérico de la
 * ficha más el hint honesto de que la asignación llega en el próximo slice. No hay CTA "Asignar
 * conductor" todavía — un botón que no puede hacer nada es peor que su ausencia.
 *
 * El historial de asignaciones (timeline de altas/bajas) tampoco entra: lo sirve el endpoint de
 * asignaciones, que es de slice-04.
 */
export function TabConductor({ vehiculo }: { vehiculo: VehiculoDetalleDto }) {
  const { t } = useTranslation(['flota', 'common'])

  if (vehiculo.conductoresAsignados.length === 0) {
    return (
      <EstadoVacio
        variante="sin-datos"
        icono={UserRound}
        titulo={t('flota:detalle.conductor.vacioTitulo')}
        descripcion={t('flota:detalle.conductor.vacioDescripcion')}
      />
    )
  }

  return (
    <Card titulo={t('flota:detalle.conductor.titulo')}>
      <ul className="flex flex-col gap-4">
        {vehiculo.conductoresAsignados.map((conductor) => (
          <li key={conductor.conductorFlotaId}>
            <FichaConductor conductor={conductor} />
          </li>
        ))}
      </ul>
    </Card>
  )
}

/**
 * Proyección READ-ONLY de Persona canónica: se edita en la superficie canónica, nunca desde Flota.
 *
 * El "vence {fecha}" de la licencia que muestra el mockup NO se renderiza: `categoriaLicencia` viene
 * sin vencimiento en el DTO — PENDIENTE (DA-nueva), lo decide el PO.
 */
function FichaConductor({ conductor }: { conductor: VehiculoConductorAsignadoDto }) {
  const { t, i18n } = useTranslation(['flota', 'common'])

  return (
    <div className="flex flex-col gap-3 rounded-lg border border-borde bg-superficie-2 p-4">
      <div className="flex items-center gap-3">
        <Avatar nombre={conductor.nombreCompleto} soloAvatar />
        <div className="flex min-w-0 flex-col">
          <span className="text-sm font-medium text-fg-primario">{conductor.nombreCompleto}</span>
          <span className="text-xs text-fg-secundario">{conductor.email ?? conductor.dni}</span>
        </div>
        <Badge variante={conductor.rol === 'principal' ? 'accion' : 'neutro'} className="ml-auto">
          {t(`flota:rolConductor.${conductor.rol}`)}
        </Badge>
      </div>

      <dl className="grid gap-x-8 sm:grid-cols-2">
        <ParDato etiqueta={t('flota:detalle.conductor.dni')} valor={conductor.dni} mono />
        <ParDato
          etiqueta={t('flota:detalle.conductor.licencia')}
          valor={conductor.categoriaLicencia?.toUpperCase()}
        />
        <ParDato etiqueta={t('flota:detalle.conductor.telefono')} valor={conductor.telefono} />
        <ParDato
          etiqueta={t('flota:detalle.conductor.asignadoDesde')}
          valor={formatearFecha(conductor.fechaAsignacion, i18n.language)}
        />
      </dl>
    </div>
  )
}
