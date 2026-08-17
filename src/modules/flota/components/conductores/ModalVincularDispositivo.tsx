import { Controller, useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { AreaTexto } from '@/shared/ui/AreaTexto'
import { Boton } from '@/shared/ui/Boton'
import { Campo } from '@/shared/ui/Campo'
import { Modal } from '@/shared/ui/Modal'
import { parseApiError, resolveApiErrorMessage } from '@/shared/errors/parse-api-error'
import type { ConductorListItemDto } from '@/services/contracts/flota'
import { AvisoOperacion } from '../AvisoOperacion'
import { SelectorDispositivoEnStock } from '../dispositivos/SelectorDispositivoEnStock'
import { useAsignarDispositivoAConductor } from '../../hooks/useAsignarDispositivoAConductor'
import {
  aAsignarDispositivoConductorRequest,
  VALORES_INICIALES_VINCULAR_DISPOSITIVO,
  vincularDispositivoConductorSchema,
  type VincularDispositivoConductorFormulario,
} from '../../schemas/vincular-dispositivo-conductor'

/**
 * Modal "Vincular dispositivo" del conductor — `POST /api/flota/conductores/{id}/dispositivos`,
 * permiso `flota.conductores.asignar-dispositivo`.
 *
 * ── ⚠️ NO ES INSTALAR EL GPS EN UN VEHICULO ───────────────────────────────────────────────────
 * Ese otro vinculo es 1:1, cuelga del vehiculo y tiene otro permiso
 * (`flota.vehiculos.asignar-dispositivo`). Este es **N:N de ATRIBUCION** (espeja el driver↔device de
 * Traccar): **no** mueve el estado de stock del equipo, **no** lo pone `instalado` y **no** hace que
 * Telemetria acepte posiciones. La ubicacion del conductor sale SIEMPRE del vehiculo que maneja (D1).
 * El aviso del modal lo dice antes de confirmar, no despues.
 *
 * ── EL SELECTOR ES EL DE `en_stock`, Y ES UNA ELECCION DE LA FICHA, NO DEL BACKEND ────────────
 * Se reusa `SelectorDispositivoEnStock` — un solo componente para elegir dispositivo en todo el
 * modulo (`f-07` §1). La ficha (`f-06` §7) pide explicitamente equipos **`en_stock`**, coherente con
 * que este vinculo modela la ENTREGA de un equipo personal al conductor.
 *
 * ⚠️ **Observacion reportada**: `ConductorDispositivoService` **no valida el estado de stock** — solo
 * que el dispositivo exista en la organizacion. O sea que el backend aceptaria vincular un equipo ya
 * `instalado`, y el unico obstaculo es este filtro de UI. Si el PO quiere atribuir un equipo
 * instalado (el caso "el GPS del auto que maneja"), lo unico que hay que cambiar es la query del
 * selector. No se amplio por cuenta propia: la ficha manda en UX.
 *
 * ── LO QUE NO SE DIBUJA ───────────────────────────────────────────────────────────────────────
 * **"Fecha de entrega"**: el mockup y `dtos.ts` la declaran, el backend **no la implementa**.
 * Aceptar un inicio elegido por el cliente permitiria abrir un periodo en el futuro o anterior a otro
 * que se cierra, y `errores.md` no tiene `code` con el que rechazar esos casos (mismo criterio que
 * `fechaInicio` en la asignacion de dispositivo, D-S3-16). Un campo cuyo valor se descarta en
 * silencio no se dibuja.
 */
export function ModalVincularDispositivo({
  conductor,
  abierto,
  onCerrar,
}: {
  conductor: ConductorListItemDto | null
  abierto: boolean
  onCerrar: () => void
}) {
  // Montado solo mientras esta abierto: arranca limpio y el error del intento anterior no reaparece.
  if (!abierto || conductor === null) return null

  return <Formulario conductor={conductor} onCerrar={onCerrar} />
}

function Formulario({
  conductor,
  onCerrar,
}: {
  conductor: ConductorListItemDto
  onCerrar: () => void
}) {
  const { t } = useTranslation(['flota', 'common'])
  const mutacion = useAsignarDispositivoAConductor(conductor.id)

  const form = useForm<VincularDispositivoConductorFormulario>({
    resolver: zodResolver(vincularDispositivoConductorSchema),
    defaultValues: VALORES_INICIALES_VINCULAR_DISPOSITIVO,
  })

  const errorGeneral = mutacion.error
    ? resolveApiErrorMessage(parseApiError(mutacion.error), t)
    : null

  const enviar = form.handleSubmit((valores) => {
    mutacion.mutate(aAsignarDispositivoConductorRequest(valores), {
      onSuccess: () => {
        mutacion.reset()
        onCerrar()
      },
    })
  })

  const errorDispositivo = form.formState.errors.dispositivoFlotaId?.message
  const errorNotas = form.formState.errors.notas?.message

  return (
    <Modal
      abierto
      onCerrar={onCerrar}
      cierrePorFuera={false}
      tamano="lg"
      titulo={t('flota:vinculoDispositivoConductor.titulo')}
      descripcion={t('flota:vinculoDispositivoConductor.descripcion')}
      pie={
        <>
          <Boton variante="secundaria" onClick={onCerrar} deshabilitado={mutacion.isPending}>
            {t('flota:comun.cancelar')}
          </Boton>
          <Boton onClick={() => void enviar()} cargando={mutacion.isPending}>
            {t('flota:vinculoDispositivoConductor.asignar')}
          </Boton>
        </>
      }
    >
      <form
        className="flex flex-col gap-4"
        onSubmit={(evento) => {
          evento.preventDefault()
          void enviar()
        }}
      >
        {errorGeneral ? <AvisoOperacion titulo={errorGeneral} /> : null}

        <p className="rounded-lg border border-dashed border-borde bg-superficie-2 px-3 py-2 text-xs text-fg-secundario">
          {t('flota:vinculoDispositivoConductor.atribucionAviso')}
        </p>

        <Controller
          control={form.control}
          name="dispositivoFlotaId"
          render={({ field }) => (
            <Campo
              etiqueta={t('flota:vinculoDispositivoConductor.dispositivo')}
              error={
                errorDispositivo === undefined
                  ? undefined
                  : t(errorDispositivo, { defaultValue: errorDispositivo })
              }
              requerido
            >
              {(control) => (
                <SelectorDispositivoEnStock
                  control={control}
                  valor={field.value}
                  onCambio={field.onChange}
                  deshabilitado={mutacion.isPending}
                  textoSinStock={t('flota:vinculoDispositivoConductor.sinDisponibles')}
                  accionSinStock={
                    <Boton
                      variante="secundaria"
                      tamano="sm"
                      render={<Link to="/app/flota/dispositivos" />}
                    >
                      {t('flota:vinculoDispositivoConductor.sinDisponiblesCta')}
                    </Boton>
                  }
                />
              )}
            </Campo>
          )}
        />

        <Campo
          etiqueta={t('flota:vinculoDispositivoConductor.notas')}
          error={errorNotas === undefined ? undefined : t(errorNotas, { defaultValue: errorNotas })}
        >
          {(control) => (
            <AreaTexto
              {...control}
              {...form.register('notas')}
              filas={3}
              invalido={form.formState.errors.notas !== undefined}
            />
          )}
        </Campo>
      </form>
    </Modal>
  )
}
