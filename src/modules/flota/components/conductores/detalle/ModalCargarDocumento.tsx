import { Controller, useForm, type FieldError } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useTranslation } from 'react-i18next'
import { Boton } from '@/shared/ui/Boton'
import { Campo } from '@/shared/ui/Campo'
import { Input } from '@/shared/ui/Input'
import { Modal } from '@/shared/ui/Modal'
import { Select } from '@/shared/ui/Select'
import {
  hasApiFieldErrors,
  parseApiError,
  resolveApiErrorMessage,
  resolveApiFieldErrors,
} from '@/shared/errors/parse-api-error'
import type { TipoDocumentoConductor } from '@/services/contracts/flota'
import { Aviso } from '@/shared/ui/Aviso'
import { claveDeTipoDocumento } from '../vocabulario-licencia'
import { useCargarDocumentoConductor } from '../../../hooks/useCargarDocumentoConductor'
import {
  aSubirDocumentoRequest,
  cargarDocumentoConductorSchema,
  valoresInicialesCargarDocumento,
  type CargarDocumentoConductorFormulario,
} from '../../../schemas/cargar-documento-conductor'

/** Marca los errores que puso el SERVIDOR (ya resueltos desde su `message_key`, no se retraducen). */
const TIPO_ERROR_SERVIDOR = 'servidor'

/**
 * Los 6 codigos del catalogo DB `tipos_documento_conductor_flota` (`ddl.sql` §1.1), en el orden del
 * seed.
 *
 * ⚠️ **ES UN CATALOGO DE TABLA SIN ENDPOINT**: `api.md` no expone `GET /catalogos/tipos-documento`
 * (PENDIENTE de `f-04` paso 7). Hasta que exista, se usan los 6 codigos literales — es lo que `f-06`
 * §6 manda explicitamente. Si una organizacion agrega un tipo propio, **este select no lo va a ver**
 * y el usuario no va a poder cargarlo desde acá.
 */
const TIPOS_DOCUMENTO: TipoDocumentoConductor[] = [
  'licencia',
  'dni',
  'psicofisico',
  'art',
  'defensivo',
  'contrato',
]

/**
 * Modal "Cargar documento" — `POST /api/flota/conductores/{id}/documentos`, permiso
 * `flota.conductores.gestionar-documentos`.
 *
 * ── ⚠️ FASE 1 = URL EXTERNA. NO HAY `<input type="file">` ─────────────────────────────────────
 * El request es **`application/json`** con `urlExterna` + metadatos, nunca `multipart/form-data`:
 * **Flota no recibe binarios en v1** y `Platform.Storage` **no existe** (D-C2). El formulario pide el
 * **enlace al archivo ya alojado**, y lo dice arriba de todo — un file-picker que despues no sube
 * nada es la peor forma de descubrirlo.
 *
 * `urlExterna` es **OPCIONAL** por contrato: se admite cargar los metadatos ahora y adjuntar el
 * archivo despues (`url_externa text NULL`, donde NULL = "todavia sin archivo").
 *
 * ── ACA SE CARGA LA LICENCIA ──────────────────────────────────────────────────────────────────
 * `tipoDocumento: 'licencia'` es la FUENTE del objeto `licencia` del conductor, y el motivo por el
 * que el alta rechaza ese bloque con 400 mientras **B-21** siga abierta. Escribe numero, emision y
 * vencimiento; **`categoria` no tiene destino**, asi que no se pide: perderia el dato en silencio.
 *
 * ── EL 400 NO CIERRA EL MODAL ─────────────────────────────────────────────────────────────────
 * `flota.documento.tipo_invalido` (fuera del catalogo de la organizacion) y
 * `flota.documento.url_no_permitida` (regla anti-SSRF: exige `https`, rechaza IP privada / loopback
 * / link-local y hostname que resuelva a rango privado) se muestran con lo tipeado intacto.
 */
export function ModalCargarDocumento({
  conductorId,
  tipoInicial,
  abierto,
  onCerrar,
}: {
  conductorId: string
  /** Preselecciona el tipo — lo usa "Renovar licencia" / el boton "Subir" de una fila obligatoria. */
  tipoInicial?: string
  abierto: boolean
  onCerrar: () => void
}) {
  // Montado solo mientras esta abierto: arranca limpio en cada apertura (y con el tipo preseleccionado
  // que corresponda), y el error del intento anterior no reaparece.
  if (!abierto) return null

  return <Formulario conductorId={conductorId} tipoInicial={tipoInicial} onCerrar={onCerrar} />
}

function Formulario({
  conductorId,
  tipoInicial,
  onCerrar,
}: {
  conductorId: string
  tipoInicial?: string
  onCerrar: () => void
}) {
  const { t } = useTranslation(['flota', 'common'])
  const mutacion = useCargarDocumentoConductor(conductorId)

  const form = useForm<CargarDocumentoConductorFormulario>({
    resolver: zodResolver(cargarDocumentoConductorSchema),
    defaultValues: valoresInicialesCargarDocumento(tipoInicial ?? ''),
  })

  const mensajeDe = (error: FieldError | undefined) => {
    if (!error?.message) return undefined
    return error.type === TIPO_ERROR_SERVIDOR
      ? error.message
      : t(error.message, { defaultValue: error.message })
  }

  const errorGeneral = (() => {
    if (!mutacion.error) return null
    const apiError = parseApiError(mutacion.error)
    if (hasApiFieldErrors(apiError)) return null
    return resolveApiErrorMessage(apiError, t)
  })()

  const opcionesTipo = [
    { valor: '', etiqueta: t('flota:documentoConductor.tipoPlaceholder') },
    ...TIPOS_DOCUMENTO.map((tipo) => ({
      valor: tipo,
      etiqueta: t(`flota:${claveDeTipoDocumento(tipo)}`, { defaultValue: tipo }),
    })),
  ]

  const enviar = form.handleSubmit((valores) => {
    mutacion.mutate(aSubirDocumentoRequest(valores), {
      onSuccess: () => {
        mutacion.reset()
        onCerrar()
      },
      onError: (error) => {
        const errores = resolveApiFieldErrors(parseApiError(error), t)
        for (const [campo, mensaje] of Object.entries(errores)) {
          form.setError(campo as keyof CargarDocumentoConductorFormulario, {
            type: TIPO_ERROR_SERVIDOR,
            message: mensaje,
          })
        }
      },
    })
  })

  return (
    <Modal
      abierto
      onCerrar={onCerrar}
      cierrePorFuera={false}
      tamano="lg"
      titulo={t('flota:documentoConductor.titulo')}
      pie={
        <>
          <Boton variante="secundaria" onClick={onCerrar} deshabilitado={mutacion.isPending}>
            {t('flota:documentoConductor.cancelar')}
          </Boton>
          <Boton onClick={() => void enviar()} cargando={mutacion.isPending}>
            {t('flota:documentoConductor.guardar')}
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
        {errorGeneral ? <Aviso titulo={errorGeneral} /> : null}

        <p className="rounded-lg border border-dashed border-borde bg-superficie-2 px-3 py-2 text-xs text-fg-secundario">
          {t('flota:documentoConductor.sinBinariosAviso')}
        </p>

        <Controller
          control={form.control}
          name="tipoDocumento"
          render={({ field }) => (
            <Campo
              etiqueta={t('flota:documentoConductor.tipo')}
              error={mensajeDe(form.formState.errors.tipoDocumento)}
              requerido
            >
              {(control) => (
                <Select
                  {...control}
                  opciones={opcionesTipo}
                  valor={field.value}
                  onCambio={field.onChange}
                />
              )}
            </Campo>
          )}
        />

        <div className="grid gap-4 sm:grid-cols-3">
          <Campo
            etiqueta={t('flota:documentoConductor.numero')}
            error={mensajeDe(form.formState.errors.numero)}
          >
            {(control) => <Input {...control} {...form.register('numero')} mono />}
          </Campo>

          <Campo
            etiqueta={t('flota:documentoConductor.fechaEmision')}
            error={mensajeDe(form.formState.errors.fechaEmision)}
          >
            {(control) => <Input {...control} {...form.register('fechaEmision')} type="date" />}
          </Campo>

          <Campo
            etiqueta={t('flota:documentoConductor.fechaVencimiento')}
            error={mensajeDe(form.formState.errors.fechaVencimiento)}
          >
            {(control) => <Input {...control} {...form.register('fechaVencimiento')} type="date" />}
          </Campo>
        </div>

        <Campo
          etiqueta={t('flota:documentoConductor.urlExterna')}
          ayuda={t('flota:documentoConductor.urlExternaAyuda')}
          error={mensajeDe(form.formState.errors.urlExterna)}
        >
          {(control) => (
            <Input
              {...control}
              {...form.register('urlExterna')}
              type="url"
              inputMode="url"
              autoComplete="off"
              invalido={form.formState.errors.urlExterna !== undefined}
            />
          )}
        </Campo>
      </form>
    </Modal>
  )
}
