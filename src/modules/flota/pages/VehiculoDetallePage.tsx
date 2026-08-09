import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, CarFront } from 'lucide-react'
import { Badge } from '@/shared/ui/Badge'
import { Boton } from '@/shared/ui/Boton'
import { EstadoError } from '@/shared/ui/EstadoError'
import { EstadoVacio } from '@/shared/ui/EstadoVacio'
import { SinAccesoOverlay } from '@/shared/ui/SinAccesoOverlay'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/shared/ui/base/tabs'
import { parseApiError } from '@/shared/errors/parse-api-error'
import type { VehiculoDetalleDto } from '@/services/contracts/flota'
import { useVehiculo } from '../hooks/useVehiculo'
import { DetalleCargando } from '../components/detalle/DetalleCargando'
import { HeroVehiculo } from '../components/detalle/HeroVehiculo'
import { MiniStatsVehiculo } from '../components/detalle/MiniStatsVehiculo'
import { ModalBajaVehiculo } from '../components/detalle/ModalBajaVehiculo'
import { ModalEditarVehiculo } from '../components/detalle/ModalEditarVehiculo'
import { TabConductor } from '../components/detalle/TabConductor'
import { TabDispositivo } from '../components/detalle/TabDispositivo'
import { TabHistorial } from '../components/detalle/TabHistorial'
import { TabInfoGeneral } from '../components/detalle/TabInfoGeneral'

/**
 * `/app/flota/vehiculos/:vehiculoFlotaId` — la ficha del vehículo.
 *
 * Es una COMPOSICIÓN DE CAPAS: identidad canónica proyectada (read-only, Flota no la posee) +
 * datos operativos propios de Flota. Las capas de Telemetría (vivo) y Taller (OTs) todavía no
 * tienen fuente, y esta pantalla lo DICE en vez de dibujar un placeholder que parezca dato.
 *
 * LOS 5 ESTADOS OBLIGATORIOS viven acá arriba, antes de cualquier render de contenido:
 *  - loading      → esqueleto de hero + tira + panel (`DetalleCargando`).
 *  - forbidden    → `SinAccesoOverlay` que BLOQUEA la página. Nunca un redirect (B-3): un redirect
 *                   silencioso le hace creer al usuario que la pantalla no existe.
 *  - error 404    → "Vehículo no encontrado". Un id de OTRA organización responde 404, no 403, y la
 *                   UI tampoco intenta distinguirlos: es la regla de cross-tenant uniforme.
 *  - error otro   → recuperable con "Reintentar", sin perder la URL.
 *  - partial-data → NO tiene rama propia acá, y es a propósito: los campos que compone Telemetría
 *                   llegan en `null` dentro de una respuesta 200 exitosa, así que cada bloque
 *                   muestra su fallback y TODO lo propio de Flota se sigue viendo. Convertirlo en
 *                   una pantalla de error sería romper la ficha por una dependencia externa.
 *  - empty        → no aplica a nivel página (un detalle siempre tiene vehículo); vive POR TAB.
 *
 * El tab activo es estado local, no ruta: la ficha se comparte por su URL, y esa URL apunta al
 * vehículo, no a la pestaña que alguien tenía abierta.
 */
export default function VehiculoDetallePage() {
  const { vehiculoFlotaId } = useParams<{ vehiculoFlotaId: string }>()
  const { t } = useTranslation(['flota', 'common'])
  const navigate = useNavigate()
  const consulta = useVehiculo(vehiculoFlotaId)

  // Sin id la consulta queda deshabilitada y `isPending` no baja nunca: mostrar el esqueleto para
  // siempre sería un spinner infinito. La ruta siempre trae el param, pero el caso se cierra igual.
  if (vehiculoFlotaId === undefined) {
    return <VehiculoNoEncontrado />
  }

  if (consulta.isPending) {
    return <DetalleCargando />
  }

  if (consulta.isError) {
    const apiError = parseApiError(consulta.error)

    if (apiError.status === 403) {
      return (
        // `SinAccesoOverlay` es `absolute inset-0`: necesita un contenedor posicionado con alto
        // propio, o se colapsa a cero y el bloqueo no se ve.
        <div className="relative min-h-96 flex-1">
          {/*
            `permiso` es SIEMPRE el permiso literal, nunca `apiError.code`. El overlay lo renderiza
            en un <code> para que el usuario se lo pase a su admin, y el 403 del gate de módulo trae
            `code: flota.modulo.no_activo` — que no existe en el catálogo de 44 permisos. Mostrarlo
            ahí mandaba al admin a buscar un permiso inexistente.
          */}
          <SinAccesoOverlay
            permiso="flota.vehiculos.leer"
            titulo={t('flota:forbidden.titulo')}
            descripcion={t('flota:vehiculosListado.sinAcceso.descripcion', {
              permiso: 'flota.vehiculos.leer',
            })}
            textoVolver={t('flota:forbidden.volver')}
            onVolver={() => navigate('/app')}
          />
        </div>
      )
    }

    if (apiError.status === 404) {
      return <VehiculoNoEncontrado />
    }

    return (
      <EstadoError
        titulo={t('flota:detalle.error.titulo')}
        mensaje={t('flota:detalle.error.descripcion')}
        trazaId={apiError.traceId ?? undefined}
        textoReintentar={t('flota:comun.reintentar')}
        onReintentar={() => void consulta.refetch()}
      />
    )
  }

  return <FichaVehiculo vehiculo={consulta.data} />
}

function FichaVehiculo({ vehiculo }: { vehiculo: VehiculoDetalleDto }) {
  const { t } = useTranslation(['flota', 'common'])
  const [modal, setModal] = useState<'ninguno' | 'editar' | 'baja'>('ninguno')

  return (
    <div className="flex flex-col gap-6">
      <EnlaceVolver />

      <HeroVehiculo
        vehiculo={vehiculo}
        onEditar={() => setModal('editar')}
        onDarDeBaja={() => setModal('baja')}
      />

      <MiniStatsVehiculo vehiculo={vehiculo} />

      <Tabs defaultValue="info">
        <TabsList variant="line" className="flex-wrap">
          <TabsTrigger value="info">{t('flota:detalle.tabs.info')}</TabsTrigger>
          <TabsTrigger value="conductor">
            {t('flota:detalle.tabs.conductor')}
            <Badge variante="neutro">{vehiculo.conductoresCount}</Badge>
          </TabsTrigger>
          <TabsTrigger value="dispositivo">{t('flota:detalle.tabs.dispositivo')}</TabsTrigger>
          <TabsTrigger value="historial">{t('flota:detalle.tabs.historial')}</TabsTrigger>
        </TabsList>

        <TabsContent value="info" className="pt-4">
          <TabInfoGeneral vehiculo={vehiculo} />
        </TabsContent>
        <TabsContent value="conductor" className="pt-4">
          <TabConductor vehiculo={vehiculo} />
        </TabsContent>
        <TabsContent value="dispositivo" className="pt-4">
          <TabDispositivo vehiculo={vehiculo} />
        </TabsContent>
        {/*
          El panel del Historial se monta solo cuando el tab está activo: su request es la superficie
          DEGRADADA (500 `flota.telemetria.no_disponible`), y dispararlo al abrir la ficha metería un
          error en la consola de todos los usuarios que nunca miran ese tab.
        */}
        <TabsContent value="historial" className="pt-4" keepMounted={false}>
          <TabHistorial vehiculoFlotaId={vehiculo.id} />
        </TabsContent>
      </Tabs>

      {/*
        Los modales se montan solo mientras están abiertos, y es a propósito: así el formulario de
        edición toma sus valores por defecto del vehículo ACTUAL cada vez que se abre, y el error de
        un intento anterior no reaparece en el siguiente.
      */}
      {modal === 'editar' ? (
        <ModalEditarVehiculo vehiculo={vehiculo} abierto onCerrar={() => setModal('ninguno')} />
      ) : null}
      {modal === 'baja' ? (
        <ModalBajaVehiculo vehiculo={vehiculo} abierto onCerrar={() => setModal('ninguno')} />
      ) : null}
    </div>
  )
}

function EnlaceVolver() {
  const { t } = useTranslation(['flota', 'common'])

  return (
    <Link
      to="/app/flota/vehiculos"
      className="inline-flex w-fit items-center gap-1.5 text-sm text-fg-secundario hover:text-fg-primario"
    >
      <ArrowLeft className="size-4" aria-hidden />
      {t('flota:comun.volverAVehiculos')}
    </Link>
  )
}

/**
 * 404 UNIFORME. Cubre "no existe" y "existe pero es de otra organización": el backend filtra por
 * `OrganizacionId` en el WHERE, así que los dos casos son indistinguibles — y eso es deliberado, un
 * 403 confirmaría que el id existe en otra organización.
 */
function VehiculoNoEncontrado() {
  const { t } = useTranslation(['flota', 'common'])

  return (
    <EstadoVacio
      variante="sin-resultados"
      icono={CarFront}
      titulo={t('flota:detalle.noEncontrado.titulo')}
      descripcion={t('flota:detalle.noEncontrado.descripcion')}
      acciones={
        <Boton variante="secundaria" render={<Link to="/app/flota/vehiculos" />}>
          {t('flota:comun.volverAVehiculos')}
        </Boton>
      }
    />
  )
}
