import { useState } from 'react'
import { Controller, useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import { useQueryClient } from '@tanstack/react-query'
import { Check, UserRound } from 'lucide-react'
import { Badge } from '@/shared/ui/Badge'
import { Boton } from '@/shared/ui/Boton'
import { Campo } from '@/shared/ui/Campo'
import { GrupoRadio } from '@/shared/ui/GrupoRadio'
import { Icono } from '@/shared/ui/Icono'
import type {
  AsignacionVehiculoConductorDto,
  VehiculoDetalleDto,
} from '@/services/contracts/flota'
import { AccionConMotivo } from '../AccionConMotivo'
import { AvisoErrorAsignacionConductor } from '../conductores/AvisoErrorAsignacionConductor'
import { SelectorConductor } from '../conductores/SelectorConductor'
import { QUERY_CONDUCTORES_SIN_VEHICULO } from '../conductores/vocabulario-conductor-asignacion'
import { flotaKeysAfectadasPorAsignacionConductor } from '../../query-keys'
import { useAsignarConductor } from '../../hooks/useAsignarConductor'
import { useConductores } from '../../hooks/useConductores'
import { usePermisos } from '../../hooks/usePermisos'
import {
  aAsignarConductorVehiculoRequest,
  asignarConductorVehiculoSchema,
  valoresInicialesAsignarConductor,
  type AsignarConductorVehiculoFormulario,
} from '../../schemas/asignar-conductor-vehiculo'

/**
 * Paso 3 del wizard de alta — Conductor (`f-07` §3).
 *
 * ── "SALTAR" ES UN CAMINO DE PRIMERA CLASE, NO UNA SALIDA DE EMERGENCIA ───────────────────────
 * Saltar **no emite ninguna request** (verificable en Network: cero llamadas) y no deshace nada: el
 * vehículo del paso 1 ya existe y ya es consultable. Por eso el botón está siempre disponible —
 * incluso sin el permiso de asignar y sin conductores cargados.
 *
 * ── ES EL MISMO SELECTOR QUE EL MODAL DE LA FICHA ─────────────────────────────────────────────
 * `SelectorConductor`, en modo embebido (sin `Modal` alrededor) y con la MISMA query key, así que
 * React Query sirve la misma entrada de caché: montar los dos no dispara dos requests. Una segunda
 * lista propia sería una segunda definición de "quién es elegible".
 *
 * ── ACÁ NO SE CREA UN CONDUCTOR ───────────────────────────────────────────────────────────────
 * El paso **asigna conductores existentes**. La razón ya NO es que el alta esté bloqueada (lo estuvo
 * por DA-CAN-FOC y esa decisión quedó corregida el 2026-08-11: el alta por documento funciona): es de
 * alcance — el wizard es de VEHÍCULO, y el alta de conductor tiene su propia superficie con sus
 * propias validaciones. Sin conductores en la organización, el paso muestra su vacío con CTA al
 * listado, no un formulario de alta.
 *
 * ── ES UN SOLO `POST`, Y NO CIERRA NADA ───────────────────────────────────────────────────────
 * El vehículo se acaba de crear, así que no hay asignación vigente que cerrar: nunca corresponde el
 * `DELETE` que sí puede hacer el modal de la ficha. Un `POST` y listo.
 */
export function PasoConductor({
  vehiculo,
  asignacion,
  onAsignado,
  onFinalizar,
  onSaltar,
}: {
  /** El vehículo YA CREADO en el paso 1. Su id es el que recibe la asignación (A-4). */
  vehiculo: VehiculoDetalleDto
  /** La asignación ya hecha en este paso, o `null`. Con ella el paso pasa a su estado "listo". */
  asignacion: AsignacionVehiculoConductorDto | null
  /**
   * Recibe la asignación creada Y la identidad elegida, NO un aviso vacío: el `asignacionId` es la
   * única fuente del id que el `DELETE` pide en la URL (B-19), y la identidad no viaja en la
   * respuesta del `POST`. Sin los dos, quien termina el wizard queda sin forma de deshacer lo que
   * acaba de hacer y con una tarjeta sin nombre en la ficha.
   */
  onAsignado: (asignacion: AsignacionVehiculoConductorDto, identidad: string | null) => void
  onFinalizar: () => void
  onSaltar: () => void
}) {
  const { t } = useTranslation(['flota', 'common'])
  const queryClient = useQueryClient()
  const { tienePermiso } = usePermisos()
  const mutacion = useAsignarConductor(vehiculo.id)
  const candidatos = useConductores(QUERY_CONDUCTORES_SIN_VEHICULO)

  const [identidadElegida, setIdentidadElegida] = useState<string | null>(null)

  const puedeAsignar = tienePermiso('flota.vehiculos.asignar-conductor')
  const motivoSinPermiso = puedeAsignar
    ? undefined
    : t('flota:asignacionConductor.sinPermiso', { permiso: 'flota.vehiculos.asignar-conductor' })

  // `?? 0` sobre un número: no construye ningún objeto nuevo por render (la regla de estabilidad
  // aplica a lo que entra en una query key y a los selectores de store, y esto no es ninguno).
  const hayCandidatos = (candidatos.data?.items.length ?? 0) > 0

  const form = useForm<AsignarConductorVehiculoFormulario>({
    resolver: zodResolver(asignarConductorVehiculoSchema),
    defaultValues: valoresInicialesAsignarConductor(),
  })

  const enviar = form.handleSubmit((valores) => {
    mutacion.mutate(aAsignarConductorVehiculoRequest(valores), {
      onSuccess: (creada) => {
        mutacion.reset()
        onAsignado(creada, identidadElegida)
      },
    })
  })

  const actualizar = () => {
    for (const key of flotaKeysAfectadasPorAsignacionConductor()) {
      void queryClient.invalidateQueries({ queryKey: key })
    }
    mutacion.reset()
  }

  const errorSeleccion = form.formState.errors.conductorFlotaId?.message

  return (
    <section className="flex flex-col gap-4 rounded-xl border border-borde bg-superficie-1 p-6">
      <header className="flex items-center gap-3">
        <span className="flex size-10 items-center justify-center rounded-full bg-superficie-2 text-fg-terciario">
          <Icono icono={UserRound} tamano="md" />
        </span>
        <div className="flex flex-col">
          <h2 className="text-base font-semibold text-fg-primario">
            {t('flota:onboarding.pasos.conductor.titulo')}
          </h2>
          <p className="text-sm text-fg-secundario">
            {t('flota:onboarding.pasos.conductor.descripcion')}
          </p>
        </div>
      </header>

      {/*
        Estado "listo": la asignación ya se hizo. NO se navega solo al confirmar, y es a propósito —
        el enlace "Ver ficha" de abajo lleva el `asignacionId` en el `state`, y navegar de inmediato
        lo tiraría, dejando al usuario sin forma de quitar al conductor que acaba de poner (B-19).
      */}
      {asignacion === null ? (
        <form
          className="flex flex-col gap-4"
          onSubmit={(evento) => {
            evento.preventDefault()
            void enviar()
          }}
        >
          {mutacion.error ? (
            <AvisoErrorAsignacionConductor error={mutacion.error} onActualizar={actualizar} />
          ) : null}

          <Controller
            control={form.control}
            name="conductorFlotaId"
            render={({ field }) => (
              <Campo
                etiqueta={t('flota:asignacionConductor.conductor')}
                error={
                  errorSeleccion === undefined
                    ? undefined
                    : t(errorSeleccion, { defaultValue: errorSeleccion })
                }
              >
                {(control) => (
                  <SelectorConductor
                    control={control}
                    valor={field.value}
                    onCambio={(id, identidad) => {
                      field.onChange(id)
                      setIdentidadElegida(identidad)
                    }}
                    deshabilitado={mutacion.isPending || !puedeAsignar}
                    textoSinConductores={t('flota:onboarding.pasos.conductor.vacio')}
                    accionSinConductores={
                      <Boton
                        variante="secundaria"
                        tamano="sm"
                        render={<Link to="/app/flota/conductores" />}
                      >
                        {t('flota:onboarding.pasos.conductor.vacioCta')}
                      </Boton>
                    }
                  />
                )}
              </Campo>
            )}
          />

          {hayCandidatos ? (
            <Controller
              control={form.control}
              name="rol"
              render={({ field }) => (
                <Campo
                  etiqueta={t('flota:asignacionConductor.rol')}
                  ayuda={t('flota:asignacionConductor.rolAyuda')}
                >
                  {(control) => (
                    <GrupoRadio
                      {...control}
                      orientacion="horizontal"
                      valor={field.value}
                      onCambio={field.onChange}
                      opciones={[
                        {
                          valor: 'principal',
                          etiqueta: t('flota:asignacionConductor.rolPrincipal'),
                        },
                        {
                          valor: 'secundario',
                          etiqueta: t('flota:asignacionConductor.rolSecundario'),
                        },
                      ]}
                    />
                  )}
                </Campo>
              )}
            />
          ) : null}

          <div className="flex flex-wrap items-center gap-2">
            {/*
              Sin candidatos no se dibuja "Continuar": no hay nada que elegir y el único camino real
              es saltar. Sin permiso SÍ se dibuja, deshabilitado con su motivo — es el comportamiento
              del verbo `asignar-*`, y esconderlo dejaría al usuario sin saber qué le falta.
            */}
            {hayCandidatos ? (
              <AccionConMotivo motivo={motivoSinPermiso}>
                <Boton type="submit" cargando={mutacion.isPending} deshabilitado={!puedeAsignar}>
                  {mutacion.isPending
                    ? t('flota:onboarding.pasos.conductor.asignando')
                    : t('flota:onboarding.pasos.conductor.continuar')}
                </Boton>
              </AccionConMotivo>
            ) : null}

            {/* Saltar NO emite ninguna request: solo navega. */}
            <Boton
              type="button"
              variante="fantasma"
              onClick={onSaltar}
              deshabilitado={mutacion.isPending}
            >
              {t('flota:onboarding.pasos.finalizar')}
            </Boton>
          </div>

          <p className="rounded-lg border border-dashed border-borde bg-superficie-2 px-3 py-2 text-xs text-fg-secundario">
            {t('flota:asignacionConductor.noAvisaAlConductor')}
          </p>
        </form>
      ) : (
        <div className="flex flex-col gap-4">
          <p className="flex flex-wrap items-center gap-2 text-sm text-fg-secundario">
            <Badge variante="exito" icono={Check}>
              {t(`flota:rolConductor.${asignacion.rol}`)}
            </Badge>
            {t('flota:onboarding.pasos.conductor.asignado', {
              nombre:
                identidadElegida ?? t('flota:asignacionConductor.identidadNoDisponible'),
            })}
          </p>

          <div className="flex flex-wrap items-center gap-2">
            <Boton type="button" onClick={onFinalizar}>
              {t('flota:onboarding.pasos.finalizar')}
            </Boton>
          </div>
        </div>
      )}
    </section>
  )
}
