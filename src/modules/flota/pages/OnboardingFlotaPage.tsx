import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Link, useNavigate } from 'react-router-dom'
import { Check } from 'lucide-react'
import { Badge } from '@/shared/ui/Badge'
import { SinAccesoOverlay } from '@/shared/ui/SinAccesoOverlay'
import { Stepper, type PasoStepper } from '@/shared/ui/Stepper'
import { useSessionStore } from '@/stores/session-store'
import type {
  AsignacionVehiculoConductorDto,
  AsignacionVehiculoDispositivoDto,
  VehiculoDetalleDto,
} from '@/services/contracts/flota'
import { AltCtaImportarCsv } from '../components/onboarding/AltCtaImportarCsv'
import { PasoConductor } from '../components/onboarding/PasoConductor'
import { PasoDispositivo } from '../components/onboarding/PasoDispositivo'
import { PasoVehiculo } from '../components/onboarding/PasoVehiculo'
import { usePermisos } from '../hooks/usePermisos'

/**
 * `/app/flota/vehiculos/onboarding` — wizard de alta del primer vehículo.
 *
 * EL FLUJO ESTÁ CERRADO (A-14 / DA-ON-01) y no es negociable:
 *  1. EXACTAMENTE 3 pasos. NO existe un paso "Revisar".
 *  2. El paso 1 CREA el vehículo con un solo `POST` y el vehículo YA ES USABLE. No se "persiste al
 *     final": abandonar el wizard después del paso 1 no deshace nada.
 *  3. El paso 2 (dispositivo, `f-08`) y el paso 3 (conductor, `f-07`) son los dos REALES: asignan
 *     con un solo `POST` cada uno, o se saltan. **En los dos, "Saltar" NO EMITE NINGÚN REQUEST.**
 *  4. Saltar el paso 2 no es una salida de emergencia: la mayoría de los vehículos se cargan antes
 *     de tener el GPS instalado, así que es el camino esperado y no se penaliza en la UI. Lo mismo
 *     vale para el 3: una organización que recién empieza no tiene conductores cargados todavía.
 *  5. Terminar o saltar el paso 3 lleva al **dashboard** (`/app`), no al listado de vehículos: lo
 *     manda la ficha §Navegación. Antes iba a `/app/flota/vehiculos` — corregido en `f-07`.
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
   * La asignación que hizo el paso 2, entera. `null` = todavía no asignó (o saltó).
   *
   * No es un `boolean`: el `asignacionId` que trae es la ÚNICA fuente del id que pide el `DELETE`
   * (D-S3-16), así que se propaga hasta la ficha del vehículo por el `state` del enlace. Guardar
   * solo "sí/no" acá era tirar la respuesta un nivel más arriba que en `PasoDispositivo`, con el
   * mismo resultado: el usuario termina el wizard sin forma de deshacer lo que acaba de hacer.
   */
  const [asignacion, setAsignacion] = useState<AsignacionVehiculoDispositivoDto | null>(null)

  /**
   * Lo que dejó el paso 3, con la misma forma y por el mismo motivo que el paso 2: el `asignacionId`
   * es la única fuente del id que el `DELETE` pide en la URL (B-19), y la identidad del conductor NO
   * viaja en la respuesta del `POST`. Los dos viajan a la ficha por el `state` del enlace.
   */
  const [asignacionConductor, setAsignacionConductor] =
    useState<AsignacionVehiculoConductorDto | null>(null)
  const [identidadConductor, setIdentidadConductor] = useState<string | null>(null)

  /**
   * Los pasos 2 y 3 encadenan su asignación al `vehiculoFlotaId` que dejó el paso 1 (`f-08` §2 /
   * `f-07` §3): sin ese id el paso NO se renderiza y se vuelve al 1. Se DERIVA en vez de
   * sincronizarse con un efecto — un efecto acá sería un render extra y una segunda fuente de verdad
   * para el mismo hecho.
   */
  const pasoVisible: NumeroPaso = paso !== 1 && vehiculo === null ? 1 : paso

  /**
   * EXACTAMENTE 3 ítems. Ningún "Revisar".
   *
   * `salteado` ≠ `pendiente` ≠ `completado`: el paso al que ya se le dijo que no aplica se dibuja
   * tachado, no en gris de "todavía no", y el que efectivamente asignó un GPS se dibuja completado.
   * El paso 1 solo pasa a `completado` cuando el `POST` respondió — el stepper refleja el estado
   * real del backend, no una fantasía de la UI.
   */
  const pasos: PasoStepper[] = [
    {
      clave: 'vehiculo',
      etiqueta: t('flota:onboarding.pasos.vehiculo.etiqueta'),
      estado: pasoVisible === 1 ? 'activo' : 'completado',
    },
    {
      clave: 'dispositivo',
      etiqueta: t('flota:onboarding.pasos.dispositivo.etiqueta'),
      estado:
        pasoVisible === 2
          ? 'activo'
          : pasoVisible > 2
            ? asignacion !== null
              ? 'completado'
              : 'salteado'
            : 'pendiente',
    },
    {
      clave: 'conductor',
      // `completado` solo cuando el `POST` respondió: el stepper refleja el estado real del backend.
      // Mientras el paso está activo y todavía no se asignó, sigue `activo`, no `completado`.
      etiqueta: t('flota:onboarding.pasos.conductor.etiqueta'),
      estado:
        pasoVisible === 3
          ? asignacionConductor !== null
            ? 'completado'
            : 'activo'
          : 'pendiente',
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

      {pasoVisible === 1 ? (
        <PasoVehiculo
          onCreado={(creado) => {
            setVehiculo(creado)
            setPaso(2)
          }}
        />
      ) : null}

      {pasoVisible === 2 && vehiculo !== null ? (
        <PasoDispositivo
          vehiculo={vehiculo}
          onAsignado={(creada) => {
            setAsignacion(creada)
            setPaso(3)
          }}
          // "Saltar" solo mueve el estado local del wizard. Cero requests.
          onSaltar={() => setPaso(3)}
        />
      ) : null}

      {pasoVisible === 3 && vehiculo !== null ? (
        <PasoConductor
          vehiculo={vehiculo}
          asignacion={asignacionConductor}
          onAsignado={(creada, identidad) => {
            setAsignacionConductor(creada)
            setIdentidadConductor(identidad)
          }}
          // Finalizar y saltar van los dos al dashboard (ficha §Navegación). "Saltar" no emite
          // ninguna request: solo navega.
          onFinalizar={() => navigate('/app')}
          onSaltar={() => navigate('/app')}
        />
      ) : null}

      {vehiculo === null ? (
        <AltCtaImportarCsv />
      ) : (
        <VehiculoYaCreado
          vehiculo={vehiculo}
          asignacion={asignacion}
          asignacionConductor={asignacionConductor}
          identidadConductor={identidadConductor}
        />
      )}

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
function VehiculoYaCreado({
  vehiculo,
  asignacion,
  asignacionConductor,
  identidadConductor,
}: {
  vehiculo: VehiculoDetalleDto
  asignacion: AsignacionVehiculoDispositivoDto | null
  asignacionConductor: AsignacionVehiculoConductorDto | null
  identidadConductor: string | null
}) {
  const { t } = useTranslation(['flota', 'common'])

  /*
    Las asignaciones viajan por el `state` del enlace, no por la URL: son ids internos y la regla de
    privacidad prohíbe meterlos en la query string. La ficha los usa para poder ofrecer "Desasociar"
    y "Quitar conductor" — sin esto, lo que el wizard acaba de asignar solo se puede sacar volviendo
    a asignar otra cosa (el `asignacionId` no lo expone ningún `GET` del lado del vehículo:
    D-S3-16 para el GPS, B-19 para el conductor).

    Se construye una sola vez por render y se pasa `undefined` si no hay nada: un objeto vacío en el
    `state` haría que la ficha lea `location.state` y descarte campos que no están, que es lo mismo,
    pero deja basura en el historial del navegador.
  */
  const estado =
    asignacion === null && asignacionConductor === null
      ? undefined
      : {
          ...(asignacion === null ? {} : { asignacionDispositivo: asignacion }),
          ...(asignacionConductor === null
            ? {}
            : { asignacionConductor, identidadConductor }),
        }

  return (
    <p className="rounded-lg border border-exito/30 bg-exito-fondo px-4 py-3 text-sm text-fg-secundario">
      {t('flota:onboarding.vehiculoCreado', { patente: vehiculo.patente ?? '' })}{' '}
      <Link
        to={`/app/flota/vehiculos/${vehiculo.id}`}
        state={estado}
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
