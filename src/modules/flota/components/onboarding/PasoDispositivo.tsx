import { Controller, useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import { useQueryClient } from '@tanstack/react-query'
import { Smartphone } from 'lucide-react'
import { Boton } from '@/shared/ui/Boton'
import { Campo } from '@/shared/ui/Campo'
import { Icono } from '@/shared/ui/Icono'
import type {
  AsignacionVehiculoDispositivoDto,
  VehiculoDetalleDto,
} from '@/services/contracts/flota'
import { AccionConMotivo } from '../AccionConMotivo'
import { AvisoErrorAsignacion } from '../dispositivos/AvisoErrorAsignacion'
import { SelectorDispositivoEnStock } from '../dispositivos/SelectorDispositivoEnStock'
import { QUERY_DISPOSITIVOS_EN_STOCK } from '../dispositivos/vocabulario-asignacion'
import { flotaKeysAfectadasPorAsignacion } from '../../query-keys'
import { useAsignarDispositivo } from '../../hooks/useAsignarDispositivo'
import { useDispositivos } from '../../hooks/useDispositivos'
import { usePermisos } from '../../hooks/usePermisos'
import {
  aAsignarDispositivoRequest,
  asignarDispositivoSchema,
  VALORES_INICIALES_ASIGNAR,
  type AsignarDispositivoFormulario,
} from '../../schemas/asignar-dispositivo'

/**
 * Paso 2 del wizard de alta — Dispositivo GPS (`f-08`).
 *
 * ── "SALTAR" ES UN CAMINO DE PRIMERA CLASE, NO UNA SALIDA DE EMERGENCIA ───────────────────────
 * La mayoría de los vehículos se cargan ANTES de tener el GPS instalado. Saltar **no emite ninguna
 * request** (verificable en Network: cero llamadas de asignación) y no deshace nada: el vehículo del
 * paso 1 ya existe y ya es consultable. Por eso el botón está siempre disponible — incluso sin el
 * permiso de asignar y con el inventario vacío.
 *
 * ── ES EL MISMO SELECTOR QUE EL MODAL DE `f-07` ───────────────────────────────────────────────
 * `SelectorDispositivoEnStock`, en modo embebido (sin `Modal` alrededor). Una segunda lista propia
 * acá sería una segunda definición de "qué equipo es elegible", y las dos se desincronizan.
 *
 * ── LA LISTA NO SE PIDE DOS VECES ─────────────────────────────────────────────────────────────
 * Este componente consulta `useDispositivos(QUERY_DISPOSITIVOS_EN_STOCK)` con la MISMA query key que
 * el selector, así que React Query sirve la misma entrada de caché: no hay request extra. Se hace
 * para saber si hay stock, que es lo que decide si el paso puede continuar o solo saltar.
 *
 * ── EL ERROR NO AVANZA EL PASO NI PIERDE EL VEHICULO ──────────────────────────────────────────
 * Solo `onSuccess` llama a `onAsignado`. Un fallo de coordinación canónica
 * (`flota.dispositivo.canonico_no_coordinable`) deja el paso donde está, dice que no se guardó nada
 * y ofrece reintentar: avanzar ahí dejaría al usuario creyendo que el GPS quedó instalado.
 */
export function PasoDispositivo({
  vehiculo,
  onAsignado,
  onSaltar,
}: {
  /** El vehículo YA CREADO en el paso 1. Su id es el que recibe la asignación (A-4). */
  vehiculo: VehiculoDetalleDto
  /**
   * Recibe la asignación creada, NO un aviso vacío: su `asignacionId` es la única fuente del id que
   * el `DELETE` pide en la URL (D-S3-16). Un caller que la tire deja al usuario sin forma de
   * desasociar el GPS que acaba de poner.
   */
  onAsignado: (asignacion: AsignacionVehiculoDispositivoDto) => void
  onSaltar: () => void
}) {
  const { t } = useTranslation(['flota', 'common'])
  const queryClient = useQueryClient()
  const { tienePermiso } = usePermisos()
  const mutacion = useAsignarDispositivo(vehiculo.id)
  const candidatos = useDispositivos(QUERY_DISPOSITIVOS_EN_STOCK)

  const puedeAsignar = tienePermiso('flota.vehiculos.asignar-dispositivo')
  const motivoSinPermiso = puedeAsignar
    ? undefined
    : t('flota:asignacionDispositivo.sinPermiso', { permiso: 'flota.vehiculos.asignar-dispositivo' })

  // `?? 0` sobre un número: no construye ningún objeto nuevo por render (la regla de estabilidad
  // aplica a lo que entra en una query key y a los selectores de store, y esto no es ninguno).
  const hayStock = (candidatos.data?.items.length ?? 0) > 0

  const form = useForm<AsignarDispositivoFormulario>({
    resolver: zodResolver(asignarDispositivoSchema),
    defaultValues: VALORES_INICIALES_ASIGNAR,
  })

  const enviar = form.handleSubmit((valores) => {
    mutacion.mutate(aAsignarDispositivoRequest(valores), {
      onSuccess: (asignacion) => {
        mutacion.reset()
        // La respuesta NO se descarta: su `asignacionId` es la unica fuente del id que pide el
        // `DELETE` (D-S3-16), y `vehiculos-service.ts` avisa explicitamente de no tirarla. Tirandola
        // acá, quien terminaba el wizard quedaba sin ninguna forma de deshacer la asignacion que
        // acababa de hacer.
        onAsignado(asignacion)
      },
    })
  })

  const actualizar = () => {
    for (const key of flotaKeysAfectadasPorAsignacion()) {
      void queryClient.invalidateQueries({ queryKey: key })
    }
    mutacion.reset()
  }

  const errorSeleccion = form.formState.errors.dispositivoFlotaId?.message

  return (
    <section className="flex flex-col gap-4 rounded-xl border border-borde bg-superficie-1 p-6">
      <header className="flex items-center gap-3">
        <span className="flex size-10 items-center justify-center rounded-full bg-superficie-2 text-fg-terciario">
          <Icono icono={Smartphone} tamano="md" />
        </span>
        <div className="flex flex-col">
          <h2 className="text-base font-semibold text-fg-primario">
            {t('flota:onboarding.pasos.dispositivo.titulo')}
          </h2>
          <p className="text-sm text-fg-secundario">
            {t('flota:onboarding.pasos.dispositivo.descripcion')}
          </p>
        </div>
      </header>

      <form
        className="flex flex-col gap-4"
        onSubmit={(evento) => {
          evento.preventDefault()
          void enviar()
        }}
      >
        {mutacion.error ? (
          <AvisoErrorAsignacion
            error={mutacion.error}
            onReintentar={() => void enviar()}
            onActualizar={actualizar}
          />
        ) : null}

        <Controller
          control={form.control}
          name="dispositivoFlotaId"
          render={({ field }) => (
            <Campo
              etiqueta={t('flota:asignacionDispositivo.dispositivo')}
              error={
                errorSeleccion === undefined
                  ? undefined
                  : t(errorSeleccion, { defaultValue: errorSeleccion })
              }
            >
              {(control) => (
                <SelectorDispositivoEnStock
                  control={control}
                  valor={field.value}
                  onCambio={field.onChange}
                  deshabilitado={mutacion.isPending || !puedeAsignar}
                  textoSinStock={t('flota:onboarding.pasos.dispositivo.vacio')}
                  accionSinStock={
                    <Boton
                      variante="secundaria"
                      tamano="sm"
                      render={<Link to="/app/flota/dispositivos" />}
                    >
                      {t('flota:onboarding.pasos.dispositivo.vacioCta')}
                    </Boton>
                  }
                />
              )}
            </Campo>
          )}
        />

        <div className="flex flex-wrap items-center gap-2">
          {/*
            Sin stock no se dibuja "Continuar": no hay nada que elegir y el único camino real es
            saltar. Sin permiso SÍ se dibuja, deshabilitado con su motivo — es el comportamiento del
            verbo `asignar-*`, y esconderlo dejaría al usuario sin saber qué le falta.
          */}
          {hayStock ? (
            <AccionConMotivo motivo={motivoSinPermiso}>
              <Boton
                type="submit"
                cargando={mutacion.isPending}
                deshabilitado={!puedeAsignar}
              >
                {mutacion.isPending
                  ? t('flota:onboarding.pasos.dispositivo.asignando')
                  : t('flota:onboarding.pasos.dispositivo.continuar')}
              </Boton>
            </AccionConMotivo>
          ) : null}

          {/* Saltar NO emite ninguna request: solo mueve el estado local del wizard. */}
          <Boton
            type="button"
            variante="fantasma"
            onClick={onSaltar}
            deshabilitado={mutacion.isPending}
          >
            {t('flota:onboarding.pasos.saltarAlSiguiente')}
          </Boton>
        </div>
      </form>
    </section>
  )
}
