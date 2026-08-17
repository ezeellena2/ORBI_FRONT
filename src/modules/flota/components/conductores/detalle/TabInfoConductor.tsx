import { useTranslation } from 'react-i18next'
import { Lock, MapPin } from 'lucide-react'
import { Card } from '@/shared/ui/Card'
import { EstadoVacio } from '@/shared/ui/EstadoVacio'
import { Icono } from '@/shared/ui/Icono'
import type { ConductorDetalleDto } from '@/services/contracts/flota'
import { ConductorBadgeEstado } from '../ConductorBadgeEstado'
import { ParDato } from '../../detalle/ParDato'
import { formatearFecha, formatearFechaHora } from '../../detalle/formato'

/**
 * Tab "Info general" de la ficha del conductor (`f-06` §4).
 *
 * ── LA IDENTIDAD ES CANONICA Y READ-ONLY ──────────────────────────────────────────────────────
 * Nombre, DNI y telefono son **proyeccion de Persona** (P-A): se editan en la superficie canonica,
 * no en Flota. Se muestran con la leyenda que lo dice, en vez de esconderlos o dibujarlos editables
 * como el mockup.
 *
 * Pueden llegar `null` dentro de un 200 exitoso: el `find-or-create` del Canonico **gatea la PII** y
 * solo devuelve identidad si la organizacion ya tenia relacion con esa Persona. **Eso es
 * partial-data, no un error**: cada `ParDato` muestra su fallback y todo lo propio de Flota
 * (estado, legajo, notas, auditoria) se sigue viendo.
 *
 * ── LOS 4 CAMPOS QUE EL DTO NO TRAE, Y POR QUE NO SE DIBUJAN ──────────────────────────────────
 * `dtos.ts` §4 declara `cuil`, `fechaNacimiento`, `direccion` y `contactoEmergencia`, y el backend
 * **no los serializa**: no tienen columna ni fuente canonica accesible. Pintarlos seria contratar un
 * `null` permanente disfrazado de dato. Lo mismo con **email**, que la proyeccion no tiene.
 *
 * ── LO QUE NO SE RENDERIZA ────────────────────────────────────────────────────────────────────
 *  - **"Rendimiento · ultimos 30 dias"** (4 barras): **PENDIENTE DA-CD2-05 viva** — esas metricas no
 *    existen en NINGUN contrato.
 *  - **Ubicacion actual (mini-mapa)**: la posicion del conductor deriva del vehiculo que conduce, y
 *    esa composicion es del **mapa en vivo**, que todavia no tiene superficie en el frontend. Se
 *    declara sin fuente y **no se emite ningun request**: un spinner infinito o un mapa vacio se leen
 *    como "este conductor no se mueve", que es una afirmacion falsa.
 *  - **`creadoPorNombre` / `modificadoPorNombre`**: vienen SIEMPRE `null` (Flota no tiene proyeccion
 *    usuario→persona). La auditoria muestra la FECHA, que si es dato real, y omite el "por quien"
 *    en vez de imprimir un hueco con etiqueta.
 */
export function TabInfoConductor({ conductor }: { conductor: ConductorDetalleDto }) {
  const { t, i18n } = useTranslation(['flota', 'common'])

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <Card titulo={t('flota:conductorDetalle.info.titulo')}>
        <p className="mb-2 flex items-start gap-2 text-xs text-fg-secundario">
          <Icono icono={Lock} tamano="sm" />
          {t('flota:conductorDetalle.info.identidadCanonica')}
        </p>

        <dl className="grid gap-x-8 sm:grid-cols-2">
          <ParDato
            etiqueta={t('flota:conductorDetalle.info.nombre')}
            valor={conductor.nombreCompleto}
          />
          <ParDato etiqueta={t('flota:conductorDetalle.info.dni')} valor={conductor.dni} mono />
          <ParDato
            etiqueta={t('flota:conductorDetalle.info.telefono')}
            valor={conductor.telefonoPrincipal}
            mono
          />
          <ParDato
            etiqueta={t('flota:conductorDetalle.info.legajo')}
            valor={conductor.numeroLegajo}
          />
          <ParDato
            etiqueta={t('flota:conductorDetalle.info.estado')}
            valor={
              <ConductorBadgeEstado
                estado={conductor.estado}
                activo={conductor.activo}
                variante="catalogo"
              />
            }
          />
          <ParDato
            etiqueta={t('flota:conductorDetalle.info.alta')}
            valor={formatearFecha(conductor.fechaAltaOperativa, i18n.language)}
          />
        </dl>

        <div className="mt-2 border-t border-borde pt-2">
          <ParDato etiqueta={t('flota:conductorDetalle.info.notas')} valor={conductor.notas} />
        </div>

        {conductor.nombreCompleto === null ? (
          <p className="mt-2 text-xs text-fg-terciario">
            {t('flota:conductorDetalle.info.identidadNoDisponible')}
          </p>
        ) : null}

        <p className="mt-2 text-xs text-fg-terciario">
          {t('flota:conductorDetalle.info.emailSinFuente')}
        </p>
      </Card>

      <div className="flex flex-col gap-4">
        <Card titulo={t('flota:conductorDetalle.ubicacion.titulo')}>
          <EstadoVacio
            variante="sin-datos"
            icono={MapPin}
            titulo={t('flota:conductorDetalle.ubicacion.sinFuenteTitulo')}
            descripcion={t('flota:conductorDetalle.ubicacion.sinFuenteDescripcion')}
          />
        </Card>

        <Card titulo={t('flota:conductorDetalle.auditoria.titulo')}>
          <dl className="grid gap-x-8 sm:grid-cols-2">
            <ParDato
              etiqueta={t('flota:conductorDetalle.info.creado')}
              valor={formatearFechaHora(conductor.fechaCreacion, i18n.language)}
            />
            <ParDato
              etiqueta={t('flota:conductorDetalle.info.modificado')}
              valor={formatearFechaHora(conductor.fechaActualizacion, i18n.language)}
            />
          </dl>
          <p className="mt-2 text-xs text-fg-terciario">
            {t('flota:conductorDetalle.auditoria.sinNombreUsuario')}
          </p>
        </Card>
      </div>
    </div>
  )
}
