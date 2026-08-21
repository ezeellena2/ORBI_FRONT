import { Controller, useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useTranslation } from 'react-i18next'
import { AreaTexto } from '@/shared/ui/AreaTexto'
import { Boton } from '@/shared/ui/Boton'
import { Campo } from '@/shared/ui/Campo'
import { GrupoRadio, type OpcionRadio } from '@/shared/ui/GrupoRadio'
import { Modal } from '@/shared/ui/Modal'
import { Toggle } from '@/shared/ui/Toggle'
import { parseApiError, resolveApiErrorMessage } from '@/shared/errors/parse-api-error'
import { Aviso } from '@/shared/ui/Aviso'
import { useSilenciarProblema } from '../../hooks/useSilenciarProblema'
import { ahoraDelNavegadorMs } from '../../reloj-del-navegador'
import {
  claveDeGuiaDeErrorCentro,
  tratamientoDeErrorCentro,
} from '../../vocabulario-centro-problemas'
import {
  SILENCIO_POR_DEFECTO,
  aSilenciarProblemaRequest,
  silenciarProblemaSchema,
  type SilenciarProblemaFormulario,
} from '../../schemas/silenciar-problema'

/**
 * Modal "Silenciar problema" — `POST /problemas/{id}/silenciar`, permiso
 * `flota.problemas.silenciar` (ficha §7.2).
 *
 * ── LOS 4 CAMPOS SON OBLIGATORIOS, TAMBIÉN LOS 2 QUE EL MOCKUP NO DIBUJA ──────────────────────
 * `SilenciarProblemaRequest` exige `motivo`, `silenciarHastaUtc`, `silenciarNotificaciones` y
 * `silenciarWebhooks`: faltar uno da 400 y el service ni corre. El mockup solo muestra motivo y
 * ventana; los 2 toggles entran igual porque el contrato manda (DA-PC-08, cerrada por contrato).
 *
 * ── EL COPY TIENE QUE DECIR LO CONTRAINTUITIVO ────────────────────────────────────────────────
 * Silenciar **no pausa el reloj de SLA** (`motor-de-reglas.md` §4.2), no borra señales y no detiene
 * la detección. Sin esa línea, el operador cree que compró tiempo y el problema vence igual.
 *
 * ── EL 409 NO CIERRA EL MODAL ─────────────────────────────────────────────────────────────────
 * Sobre un problema ya terminal el backend responde 409 `flota.problema.transicion_invalida` — el
 * **mismo code** que usa para la transición bloqueada, porque el catálogo no tiene uno propio para
 * "acción sobre problema cerrado". Se distingue por `args.estadoActual`, no por el status, y el
 * modal se queda abierto mostrando qué pasó y qué hacer.
 */
export function ModalSilenciarProblema({
  problemaId,
  titulo,
  abierto,
  onCerrar,
}: {
  problemaId: string | null
  titulo: string
  abierto: boolean
  onCerrar: () => void
}) {
  // Montado solo mientras está abierto: el formulario arranca limpio en cada apertura y el error del
  // intento anterior no reaparece.
  if (!abierto || problemaId === null) return null

  return <Formulario problemaId={problemaId} titulo={titulo} onCerrar={onCerrar} />
}

function Formulario({
  problemaId,
  titulo,
  onCerrar,
}: {
  problemaId: string
  titulo: string
  onCerrar: () => void
}) {
  const { t } = useTranslation(['flota', 'common'])
  const mutacion = useSilenciarProblema(problemaId)

  const form = useForm<SilenciarProblemaFormulario>({
    resolver: zodResolver(silenciarProblemaSchema),
    defaultValues: {
      motivo: '',
      ventanaMinutos: '30',
      ...SILENCIO_POR_DEFECTO,
    },
  })

  const opciones: OpcionRadio[] = [
    { valor: '30', etiqueta: t('flota:centro.silenciar.ventana30') },
    { valor: '120', etiqueta: t('flota:centro.silenciar.ventana120') },
  ]

  const apiError = mutacion.error ? parseApiError(mutacion.error) : null

  const enviar = form.handleSubmit((valores) => {
    /*
      El reloj entra por `ahoraDelNavegadorMs` y no por un `Date.now()` escrito acá: `handleSubmit`
      se construye durante el render, así que `react-hooks/purity` no puede distinguir su cuerpo del
      cuerpo del componente — y tiene razón en frenarlo. El porqué completo, y por qué éste es el
      único llamador legítimo del reloj en el módulo, está en `reloj-del-navegador.ts`.
    */
    mutacion.mutate(aSilenciarProblemaRequest(valores, ahoraDelNavegadorMs()), {
      onSuccess: () => {
        mutacion.reset()
        onCerrar()
      },
    })
  })

  const errorMotivo = form.formState.errors.motivo?.message
  const mensajeDeMotivo =
    errorMotivo === undefined ? undefined : t(errorMotivo, { defaultValue: errorMotivo })

  return (
    <Modal
      abierto
      onCerrar={onCerrar}
      cierrePorFuera={false}
      titulo={t('flota:centro.silenciar.titulo')}
      descripcion={titulo}
      pie={
        <>
          <Boton variante="secundaria" onClick={onCerrar} deshabilitado={mutacion.isPending}>
            {t('flota:comun.cancelar')}
          </Boton>
          <Boton onClick={() => void enviar()} cargando={mutacion.isPending}>
            {t('flota:centro.silenciar.confirmar')}
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
        {apiError === null ? null : (
          <Aviso
            titulo={resolveApiErrorMessage(apiError, t)}
            mensaje={t(
              `flota:${claveDeGuiaDeErrorCentro(tratamientoDeErrorCentro(apiError.code, apiError.args))}`,
            )}
            trazaId={apiError.traceId}
          />
        )}

        <p className="text-sm text-fg-secundario">{t('flota:centro.silenciar.descripcion')}</p>

        <Campo
          etiqueta={t('flota:centro.silenciar.motivo')}
          ayuda={t('flota:centro.silenciar.motivoAyuda')}
          error={mensajeDeMotivo}
          requerido
        >
          {(control) => (
            <AreaTexto
              {...control}
              {...form.register('motivo')}
              filas={3}
              invalido={form.formState.errors.motivo !== undefined}
            />
          )}
        </Campo>

        <Controller
          control={form.control}
          name="ventanaMinutos"
          render={({ field }) => (
            <Campo etiqueta={t('flota:centro.silenciar.ventana')} requerido>
              {(control) => (
                <GrupoRadio
                  {...control}
                  orientacion="horizontal"
                  opciones={opciones}
                  valor={field.value}
                  onCambio={field.onChange}
                />
              )}
            </Campo>
          )}
        />

        {/*
          "Hasta fin de turno" (ficha §6) no se ofrece: el request lleva un instante absoluto y
          ningún documento define cuándo termina un turno. Elegir 8 h o las 18:00 sería inventar la
          jornada de la organización — se dice, no se rellena.
        */}
        <p className="text-xs text-fg-terciario">
          {t('flota:centro.silenciar.ventanaFinDeTurnoPendiente')}
        </p>

        <Controller
          control={form.control}
          name="silenciarNotificaciones"
          render={({ field }) => (
            <Toggle
              etiqueta={t('flota:centro.silenciar.notificaciones')}
              activo={field.value}
              onCambio={field.onChange}
            />
          )}
        />

        <Controller
          control={form.control}
          name="silenciarWebhooks"
          render={({ field }) => (
            <Toggle
              etiqueta={t('flota:centro.silenciar.webhooks')}
              descripcion={t('flota:centro.silenciar.webhooksAclaracion')}
              activo={field.value}
              onCambio={field.onChange}
            />
          )}
        />

        <p className="rounded-lg border border-dashed border-borde bg-superficie-2 px-3 py-2 text-xs text-fg-secundario">
          {t('flota:centro.silenciar.aclaracion')}
        </p>
      </form>
    </Modal>
  )
}
