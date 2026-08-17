import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import type { AccionProblema, ProblemaOperativoDetalleDto } from '@/services/contracts/flota'
import { Boton } from '@/shared/ui/Boton'
import { AccionConMotivo } from '../AccionConMotivo'
import { usePermisos } from '../../hooks/usePermisos'
import { claveDeAccionProblema } from '../../vocabulario-centro-problemas'
import {
  esAccionDeNavegacion,
  motivoDeBloqueoDeAccion,
  permisoDeAccion,
} from '../../vocabulario-sala-problemas'

export type AccionDeMutacionProblema = Extract<
  AccionProblema,
  'asignar' | 'silenciar' | 'resolver'
>

/**
 * La barra de acciones de un problema. La comparten el panel de la Sala y el hero del ticket: si
 * cada una arma su propia barra, la misma acción termina habilitada en una vista y apagada en la
 * otra.
 *
 * **`accionesDisponibles` la deriva el servidor** del estado del problema (terminal ⇒ solo las 2 de
 * navegación), así que la pantalla no recalcula si un problema cerrado admite resolver: lee la
 * lista. Lo que sí resuelve acá es el gating por permiso —modo **disable con tooltip**, nunca
 * oculto (`permisos.md` §Comportamiento UX por verbo)— y el bloqueo de contrato de `asignar`.
 *
 * ⚠️ **`asignar` queda SIEMPRE deshabilitada** (DA-PC-07: no existe endpoint de catálogo de
 * asignables, así que el selector de responsable no tiene de dónde alimentarse). Se muestra igual,
 * no se oculta: la capacidad existe del lado del servidor y el usuario tiene que poder entender por
 * qué no la puede usar. Por eso **tampoco se construyó el modal Asignar** que `f-09` paso 7 pide: un
 * diálogo cuyo único control está deshabilitado y cuyo submit no puede dispararse nunca es un
 * callejón con un clic de más; el botón con el mismo motivo dice lo mismo antes.
 */
export function BarraDeAccionesProblema({
  detalle,
  onAccion,
  tamano = 'sm',
}: {
  detalle: ProblemaOperativoDetalleDto
  /** Solo las que mutan: la navegación la resuelve la propia barra. */
  onAccion: (accion: AccionDeMutacionProblema) => void
  tamano?: 'sm' | 'md'
}) {
  const vehiculoId = detalle.vehiculo?.vehiculoFlotaId ?? null

  return (
    <div className="flex flex-wrap items-center gap-2">
      {detalle.accionesDisponibles.map((accion) =>
        esAccionDeNavegacion(accion) ? (
          <AccionDeNavegacion
            key={accion}
            accion={accion}
            vehiculoId={vehiculoId}
            tamano={tamano}
          />
        ) : (
          <AccionDeMutacion key={accion} accion={accion} onAccion={onAccion} tamano={tamano} />
        ),
      )}
    </div>
  )
}

/**
 * `ver_vehiculo` y `ver_mapa`: navegación dentro de la app, con `useNavigate` y no con un
 * `window.location`, que recargaría la SPA entera y tiraría la caché de React Query.
 *
 * ⚠️ **El query param del mapa es `?vehicle=`, en inglés.** La ficha §7.8 escribe
 * `/app/flota/mapa?vehiculo=`, y la pantalla que lo lee (`MapaEnVivoPage`, slice-05) hace
 * `parametros.get('vehicle')`. Mandar el de la ficha no preselecciona nada: el usuario aterriza en
 * el mapa completo, sin marcador elegido y sin ningún aviso. Manda el código que corre; el drift
 * queda reportado.
 */
function AccionDeNavegacion({
  accion,
  vehiculoId,
  tamano,
}: {
  accion: AccionProblema
  vehiculoId: string | null
  tamano: 'sm' | 'md'
}) {
  const { t } = useTranslation('flota')
  const navigate = useNavigate()
  const { tienePermiso } = usePermisos()

  // Sin vehículo no hay a dónde ir. El servidor no ofrece estas 2 en ese caso, pero armar la URL con
  // un `null` daría una ruta rota en vez de un botón ausente.
  if (vehiculoId === null) return null

  const permiso = permisoDeAccion(accion)
  const habilitado = tienePermiso(permiso)

  const destino =
    accion === 'ver_mapa'
      ? `/app/flota/mapa?vehicle=${vehiculoId}`
      : `/app/flota/vehiculos/${vehiculoId}`

  return (
    <AccionConMotivo
      motivo={habilitado ? undefined : t('centro.sala.acciones.sinPermiso', { permiso })}
    >
      <Boton
        variante="secundaria"
        tamano={tamano}
        deshabilitado={!habilitado}
        onClick={() => navigate(destino)}
      >
        {t(claveDeAccionProblema(accion))}
      </Boton>
    </AccionConMotivo>
  )
}

function AccionDeMutacion({
  accion,
  onAccion,
  tamano,
}: {
  accion: AccionProblema
  onAccion: (accion: AccionDeMutacionProblema) => void
  tamano: 'sm' | 'md'
}) {
  const { t } = useTranslation('flota')
  const { tienePermiso } = usePermisos()

  const permiso = permisoDeAccion(accion)
  const claveDeBloqueo = motivoDeBloqueoDeAccion(accion)
  const sinPermiso = !tienePermiso(permiso)

  const motivo = motivoDeLaAccion({ claveDeBloqueo, sinPermiso, permiso, t })

  return (
    <AccionConMotivo motivo={motivo}>
      <Boton
        variante={accion === 'resolver' ? 'primaria' : 'secundaria'}
        tamano={tamano}
        deshabilitado={motivo !== undefined}
        onClick={() => {
          if (accion === 'asignar' || accion === 'silenciar' || accion === 'resolver') {
            onAccion(accion)
          }
        }}
      >
        {t(claveDeAccionProblema(accion))}
      </Boton>
    </AccionConMotivo>
  )
}

/** El bloqueo de contrato gana sobre el de permiso: es el que no se resuelve pidiéndole nada a nadie. */
function motivoDeLaAccion({
  claveDeBloqueo,
  sinPermiso,
  permiso,
  t,
}: {
  claveDeBloqueo: string | null
  sinPermiso: boolean
  permiso: string
  t: (clave: string, opciones?: Record<string, unknown>) => string
}): string | undefined {
  if (claveDeBloqueo !== null) return t(claveDeBloqueo)
  if (sinPermiso) return t('centro.sala.acciones.sinPermiso', { permiso })
  return undefined
}
