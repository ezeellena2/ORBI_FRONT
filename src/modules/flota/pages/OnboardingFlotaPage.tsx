import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Link, useNavigate } from 'react-router-dom'
import { Check, Smartphone, UserRound } from 'lucide-react'
import { Badge } from '@/shared/ui/Badge'
import { SinAccesoOverlay } from '@/shared/ui/SinAccesoOverlay'
import { Stepper, type PasoStepper } from '@/shared/ui/Stepper'
import { useSessionStore } from '@/stores/session-store'
import type { VehiculoDetalleDto } from '@/services/contracts/flota'
import { AltCtaImportarCsv } from '../components/onboarding/AltCtaImportarCsv'
import { PasoPendiente } from '../components/onboarding/PasoPendiente'
import { PasoVehiculo } from '../components/onboarding/PasoVehiculo'
import { usePermisos } from '../hooks/usePermisos'

/**
 * `/app/flota/vehiculos/onboarding` — wizard de alta del primer vehículo.
 *
 * EL FLUJO ESTÁ CERRADO (A-14 / DA-ON-01) y no es negociable:
 *  1. EXACTAMENTE 3 pasos. NO existe un paso "Revisar".
 *  2. El paso 1 CREA el vehículo con un solo `POST` y el vehículo YA ES USABLE. No se "persiste al
 *     final": abandonar el wizard después del paso 1 no deshace nada.
 *  3. Los pasos 2 (dispositivo) y 3 (conductor) son de los slices 03 y 04: se renderizan
 *     deshabilitados con hint, y "Saltar" NO EMITE NINGÚN REQUEST.
 *
 * ESTADOS DE PANTALLA (ficha §9):
 *  - loading      → del botón de submit y de los selects de catálogo, no de la página: es un
 *                   formulario vacío, no hay nada que esqueletear.
 *  - empty        → NO APLICA. Esta pantalla ES la respuesta al empty del listado.
 *  - error        → los tres del submit, cada uno con su tratamiento (ver `PasoVehiculo`).
 *  - forbidden    → `SinAccesoOverlay` que bloquea la página. Nunca un redirect (B-3).
 *  - partial-data → NO APLICA. Acá no se compone Telemetría. El riesgo equivalente es que el
 *                   Canónico no responda al crear, y en ese caso el alta se RECHAZA COMPLETA
 *                   (recuperable, con reintento) — nunca a medias, nunca con fila fantasma.
 *
 * Encuadre: single-column centrada, sin el shell de tabla/sidebar del resto de Flota (DA-ON-08).
 *
 * PENDIENTE (DA-FE-nueva): la ficha pide además "logo Orbi → dashboard" y una página realmente
 * full-screen. La ruta vive dentro de `/app`, así que el `AppShell` ya aporta su cabecera y su
 * marca: dibujar un segundo logo duplicaría el branding. Escapar del shell exige mover la ruta o
 * agregarle una variante, y ambos archivos son de otro paso. El "Saltar — ir al dashboard" del pie
 * cubre la navegación que ofrecía el logo.
 */

type NumeroPaso = 1 | 2 | 3

export default function OnboardingFlotaPage() {
  const { t } = useTranslation(['flota', 'common'])
  const navigate = useNavigate()
  const { tienePermiso } = usePermisos()
  const nombreOrganizacion = useSessionStore((estado) => estado.organizacionActiva?.nombre)

  const [paso, setPaso] = useState<NumeroPaso>(1)
  const [vehiculo, setVehiculo] = useState<VehiculoDetalleDto | null>(null)

  /**
   * EXACTAMENTE 3 ítems. Ningún "Revisar".
   *
   * `salteado` ≠ `pendiente`: el paso al que ya se le dijo que no aplica se dibuja tachado, no en
   * gris de "todavía no". Y el paso 1 solo pasa a `completado` cuando el `POST` respondió — el
   * stepper refleja el estado real del backend, no una fantasía de la UI.
   */
  const pasos: PasoStepper[] = [
    {
      clave: 'vehiculo',
      etiqueta: t('flota:onboarding.pasos.vehiculo.etiqueta'),
      estado: paso === 1 ? 'activo' : 'completado',
    },
    {
      clave: 'dispositivo',
      etiqueta: t('flota:onboarding.pasos.dispositivo.etiqueta'),
      estado: paso === 2 ? 'activo' : paso > 2 ? 'salteado' : 'pendiente',
    },
    {
      clave: 'conductor',
      etiqueta: t('flota:onboarding.pasos.conductor.etiqueta'),
      estado: paso === 3 ? 'activo' : 'pendiente',
    },
  ]

  // El page-gate ya lo aplica la ruta; se repite acá para que la pantalla sea correcta también si
  // alguien la monta fuera de su `<RequierePermiso>`. El overlay bloquea, no redirige.
  if (!tienePermiso('flota.vehiculos.crear')) {
    return (
      <div className="relative min-h-96 flex-1">
        <SinAccesoOverlay
          permiso="flota.vehiculos.crear"
          titulo={t('flota:forbidden.titulo')}
          descripcion={t('flota:forbidden.descripcion')}
          textoVolver={t('flota:forbidden.volver')}
          onVolver={() => navigate('/app')}
        />
      </div>
    )
  }

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-6 py-6">
      <Encabezado nombreOrganizacion={nombreOrganizacion} />

      <Stepper pasos={pasos} />

      {paso === 1 ? (
        <PasoVehiculo
          onCreado={(creado) => {
            setVehiculo(creado)
            setPaso(2)
          }}
        />
      ) : null}

      {paso === 2 ? (
        <PasoPendiente
          icono={Smartphone}
          titulo={t('flota:onboarding.pasos.dispositivo.titulo')}
          descripcion={t('flota:onboarding.pasos.dispositivo.descripcion')}
          hint={t('flota:onboarding.pasos.dispositivo.hint')}
          textoSaltar={t('flota:onboarding.pasos.saltarAlSiguiente')}
          // "Saltar" solo mueve el estado local del wizard. Cero requests.
          onSaltar={() => setPaso(3)}
        />
      ) : null}

      {paso === 3 ? (
        <PasoPendiente
          icono={UserRound}
          titulo={t('flota:onboarding.pasos.conductor.titulo')}
          descripcion={t('flota:onboarding.pasos.conductor.descripcion')}
          hint={t('flota:onboarding.pasos.conductor.hint')}
          textoSaltar={t('flota:onboarding.pasos.finalizar')}
          onSaltar={() => navigate('/app/flota/vehiculos')}
        />
      ) : null}

      {vehiculo === null ? <AltCtaImportarCsv /> : <VehiculoYaCreado vehiculo={vehiculo} />}

      <Pie />
    </div>
  )
}

function Encabezado({ nombreOrganizacion }: { nombreOrganizacion: string | undefined }) {
  const { t } = useTranslation(['flota', 'common'])

  return (
    <header className="flex flex-col gap-2">
      {nombreOrganizacion === undefined ? null : (
        <Badge variante="acento" icono={Check}>
          {t('flota:onboarding.bienvenida', { organizacion: nombreOrganizacion })}
        </Badge>
      )}
      <h1 className="text-2xl font-semibold tracking-tight text-fg-primario">
        {t('flota:onboarding.titulo')}
      </h1>
      <p className="text-sm text-fg-secundario">{t('flota:onboarding.subtitulo')}</p>
    </header>
  )
}

/**
 * El vehículo del paso 1 YA EXISTE y ya es consultable. Decirlo explícitamente es lo que hace que
 * "Saltar" no dé miedo: el usuario no está abandonando un alta a medio hacer.
 */
function VehiculoYaCreado({ vehiculo }: { vehiculo: VehiculoDetalleDto }) {
  const { t } = useTranslation(['flota', 'common'])

  return (
    <p className="rounded-lg border border-exito/30 bg-exito-fondo px-4 py-3 text-sm text-fg-secundario">
      {t('flota:onboarding.vehiculoCreado', { patente: vehiculo.patente ?? '' })}{' '}
      <Link
        to={`/app/flota/vehiculos/${vehiculo.id}`}
        className="font-medium text-accion underline-offset-4 hover:underline"
      >
        {t('flota:onboarding.verFicha')}
      </Link>
    </p>
  )
}

function Pie() {
  const { t } = useTranslation(['flota', 'common'])

  return (
    <p className="text-center text-sm">
      <Link to="/app" className="text-fg-secundario underline-offset-4 hover:text-fg-primario hover:underline">
        {t('flota:onboarding.saltarAlDashboard')}
      </Link>
    </p>
  )
}
