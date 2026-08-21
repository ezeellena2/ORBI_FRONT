import { useForm, useWatch, type FieldError } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useTranslation } from 'react-i18next'
import { Lock } from 'lucide-react'
import { AreaTexto } from '@/shared/ui/AreaTexto'
import { Boton } from '@/shared/ui/Boton'
import { Campo } from '@/shared/ui/Campo'
import { Icono } from '@/shared/ui/Icono'
import { Input } from '@/shared/ui/Input'
import { Modal } from '@/shared/ui/Modal'
import { Spinner } from '@/shared/ui/Spinner'
import {
  hasApiFieldErrors,
  parseApiError,
  resolveApiErrorMessage,
  resolveApiFieldErrors,
} from '@/shared/errors/parse-api-error'
import type { ConductorDetalleDto } from '@/services/contracts/flota'
import { AvisoCamposNoBorrables } from '../AvisoCamposNoBorrables'
import { Aviso } from '@/shared/ui/Aviso'
import { useConductor } from '../../hooks/useConductor'
import { useEditarConductor } from '../../hooks/useEditarConductor'
import {
  aActualizarConductorRequest,
  camposConductorQueNoSePuedenBorrar,
  editarConductorSchema,
  valoresInicialesEditarConductor,
  type EditarConductorFormulario,
} from '../../schemas/editar-conductor'
import { SIN_DATO } from '../detalle/formato'

/** Marca los errores que puso el SERVIDOR (ya resueltos desde su `message_key`, no se retraducen). */
const TIPO_ERROR_SERVIDOR = 'servidor'

/**
 * Modal "Editar conductor" — `PATCH /api/flota/conductores/{id}`, permiso
 * `flota.conductores.editar`.
 *
 * **Implementacion UNICA**, usada por el kebab del listado (via `ModalEditarConductorPorId`) y por
 * el hero de la ficha. Dos copias serian dos lugares donde aplicar cada correccion del contrato.
 *
 * ── LA IDENTIDAD CANONICA SE MUESTRA BLOQUEADA, NO ESCONDIDA ──────────────────────────────────
 * Nombre, DNI y telefono son **proyeccion de Persona, read-only** (P-A): `ActualizarConductorRequest`
 * ni los declara. Se muestran con su leyenda para que el usuario confirme que es la persona correcta
 * y entienda **donde** se editan, en vez de descubrir que el campo no existe. El mockup los dibuja
 * editables y **esta mal**.
 *
 * Pueden llegar `null` — el `find-or-create` gatea la PII y ese `null` es el caso normal, no una
 * falla. Se muestra el fallback, nunca "esta persona no tiene nombre".
 *
 * ── VACIAR UN CAMPO NO LO BORRA ───────────────────────────────────────────────────────────────
 * `System.Text.Json` no distingue "ausente" de "null", asi que el service PRESERVA
 * (`request.X ?? entidad.X`): vaciar el legajo hoy es un **no-op con 200 OK** (B-18, abierta). Se
 * avisa ANTES de guardar en vez de cerrar en verde con el dato intacto.
 */

export interface ModalEditarConductorProps {
  conductor: ConductorDetalleDto
  abierto: boolean
  onCerrar: () => void
}

export function ModalEditarConductor({
  conductor,
  abierto,
  onCerrar,
}: ModalEditarConductorProps) {
  // Montado solo mientras esta abierto: el formulario toma sus valores del conductor ACTUAL en cada
  // apertura y el error del intento anterior no reaparece.
  if (!abierto) return null

  return <Formulario conductor={conductor} onCerrar={onCerrar} />
}

/**
 * Variante para el LISTADO: la fila solo tiene `ConductorListItemDto` y el formulario necesita
 * `notas`, que vive en el detalle. Se pide el detalle al abrir — no antes: el hook queda
 * deshabilitado mientras el modal esta cerrado.
 */
export function ModalEditarConductorPorId({
  conductorId,
  abierto,
  onCerrar,
}: {
  conductorId: string | undefined
  abierto: boolean
  onCerrar: () => void
}) {
  const { t } = useTranslation(['flota', 'common'])
  const consulta = useConductor(abierto ? conductorId : undefined)

  if (!abierto) return null

  if (consulta.data) {
    return <ModalEditarConductor conductor={consulta.data} abierto onCerrar={onCerrar} />
  }

  return (
    <Modal abierto onCerrar={onCerrar} titulo={t('flota:conductorEditar.titulo')}>
      {consulta.isError ? (
        <Aviso
          titulo={t('flota:conductorEditar.errorCarga')}
          mensaje={resolveApiErrorMessage(parseApiError(consulta.error), t)}
        />
      ) : (
        <div className="flex items-center justify-center py-8">
          <Spinner tamano="lg" />
        </div>
      )}
    </Modal>
  )
}

function Formulario({
  conductor,
  onCerrar,
}: {
  conductor: ConductorDetalleDto
  onCerrar: () => void
}) {
  const { t } = useTranslation(['flota', 'common'])
  const mutacion = useEditarConductor(conductor.id)

  const form = useForm<EditarConductorFormulario>({
    resolver: zodResolver(editarConductorSchema),
    defaultValues: valoresInicialesEditarConductor(conductor),
  })

  // `useWatch`, no `form.watch()`: `watch()` devuelve una funcion que el compilador de React no
  // puede memorizar sin arriesgar UI vieja, y el lint del repo la rechaza.
  const valores = useWatch({ control: form.control })

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

  const noBorrables = camposConductorQueNoSePuedenBorrar(valores, {
    numeroLegajo: conductor.numeroLegajo,
    notas: conductor.notas,
  }).map((campo) => t(`flota:conductorEditar.campos.${campo}`))

  const enviar = form.handleSubmit((datos) => {
    mutacion.mutate(aActualizarConductorRequest(datos), {
      onSuccess: () => {
        mutacion.reset()
        onCerrar()
      },
      onError: (error) => {
        const errores = resolveApiFieldErrors(parseApiError(error), t)
        for (const [campo, mensaje] of Object.entries(errores)) {
          form.setError(campo as keyof EditarConductorFormulario, {
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
      titulo={t('flota:conductorEditar.titulo')}
      descripcion={conductor.nombreCompleto ?? undefined}
      pie={
        <>
          <Boton variante="secundaria" onClick={onCerrar} deshabilitado={mutacion.isPending}>
            {t('flota:comun.cancelar')}
          </Boton>
          <Boton onClick={() => void enviar()} cargando={mutacion.isPending}>
            {t('flota:conductorEditar.guardar')}
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

        <IdentidadBloqueada conductor={conductor} />

        <Campo
          etiqueta={t('flota:conductorEditar.numeroLegajo')}
          error={mensajeDe(form.formState.errors.numeroLegajo)}
        >
          {(control) => (
            <Input
              {...control}
              {...form.register('numeroLegajo')}
              invalido={form.formState.errors.numeroLegajo !== undefined}
            />
          )}
        </Campo>

        <Campo
          etiqueta={t('flota:conductorEditar.notas')}
          error={mensajeDe(form.formState.errors.notas)}
        >
          {(control) => <AreaTexto {...control} {...form.register('notas')} filas={3} />}
        </Campo>

        <AvisoCamposNoBorrables campos={noBorrables} />

        <p className="text-xs text-fg-terciario">{t('flota:conductorEditar.licenciaAparte')}</p>
      </form>
    </Modal>
  )
}

/** Los 3 campos de Persona: visibles, deshabilitados y con la leyenda de donde se editan. */
function IdentidadBloqueada({ conductor }: { conductor: ConductorDetalleDto }) {
  const { t } = useTranslation(['flota', 'common'])

  const campos = [
    { etiqueta: t('flota:conductorDetalle.info.nombre'), valor: conductor.nombreCompleto },
    { etiqueta: t('flota:conductorDetalle.info.dni'), valor: conductor.dni },
    { etiqueta: t('flota:conductorDetalle.info.telefono'), valor: conductor.telefonoPrincipal },
  ]

  return (
    <div className="flex flex-col gap-3 rounded-lg border border-borde bg-superficie-2 p-3">
      <p className="flex items-start gap-2 text-xs text-fg-secundario">
        <Icono icono={Lock} tamano="sm" />
        {t('flota:conductorEditar.leyendaCanonicos')}
      </p>

      <div className="grid gap-3 sm:grid-cols-3">
        {campos.map((campo) => (
          <label key={campo.etiqueta} className="flex flex-col gap-1 text-xs text-fg-secundario">
            {campo.etiqueta}
            <Input value={campo.valor ?? SIN_DATO} disabled readOnly />
          </label>
        ))}
      </div>
    </div>
  )
}
