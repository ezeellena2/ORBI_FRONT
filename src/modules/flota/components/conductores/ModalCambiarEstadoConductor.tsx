import { Controller, useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useTranslation } from 'react-i18next'
import { AreaTexto } from '@/shared/ui/AreaTexto'
import { Boton } from '@/shared/ui/Boton'
import { Campo } from '@/shared/ui/Campo'
import { GrupoRadio, type OpcionRadio } from '@/shared/ui/GrupoRadio'
import { Modal } from '@/shared/ui/Modal'
import { parseApiError, resolveApiErrorMessage } from '@/shared/errors/parse-api-error'
import type { ConductorListItemDto } from '@/services/contracts/flota'
import { Aviso } from '@/shared/ui/Aviso'
import { ConductorBadgeEstado } from './ConductorBadgeEstado'
import {
  claveDeEstadoConductor,
  DESTINOS_ESTADO_CONDUCTOR,
  destinosDeEstadoConductor,
} from './vocabulario-conductor-asignacion'
import { useCambiarEstadoConductor } from '../../hooks/useCambiarEstadoConductor'
import {
  aCambiarEstadoConductorRequest,
  cambiarEstadoConductorSchema,
  type CambiarEstadoConductorFormulario,
} from '../../schemas/cambiar-estado-conductor'

/**
 * Modal "Cambiar estado del conductor" — `POST .../{id}/estado` -> **204 sin cuerpo**, permiso
 * `flota.conductores.editar`.
 *
 * **Implementacion UNICA**: la usan el kebab del listado y el menu de la ficha.
 *
 * ── LOS RADIOS SON 4, Y NO TODOS SON ELEGIBLES ────────────────────────────────────────────────
 * `pendiente_documentacion` **no esta**: es el estado con el que nace el conductor y el contrato lo
 * excluye POR TIPO — no se vuelve a "pendiente" por pedido del usuario. Los otros 4 se muestran
 * siempre, pero solo se habilitan los que la **matriz de transiciones** admite desde el estado
 * actual. Mostrar los no elegibles es deliberado: el usuario tiene que entender que el estado existe
 * y que no se llega desde donde esta.
 *
 * ⚠️ **La matriz NO es la intuitiva** (`TRANSICIONES_CONDUCTOR`, transcripta del dominio):
 * `disponible → pausado` y `en_servicio → disponible` **no existen**. Ofrecerlos "por simetria" seria
 * ofrecer un 409.
 *
 * ⚠️ **`suspendido` no tiene salida** (B-22, abierta): su fila de la matriz es la lista vacia. El
 * modal lo DICE con su copy en vez de dibujar un boton "Rehabilitar" que garantiza un 409. La unica
 * salida operativa hoy es baja logica + re-alta.
 *
 * ── EL 409 NO CIERRA EL MODAL ─────────────────────────────────────────────────────────────────
 * `flota.conductor.transicion_invalida` y `flota.conductor.documento_vencido` (pasar a
 * `en_servicio` con documentacion obligatoria vencida o sin cargar) dejan el modal abierto con el
 * motivo a la vista. Cerrarlo como si hubiera funcionado dejaria el badge sin cambiar y sin
 * explicacion.
 *
 * ── NO TOCA `activo` ──────────────────────────────────────────────────────────────────────────
 * Estado operativo y baja logica son **ejes ortogonales** (DA-CD2-19). Desactivar es
 * `POST .../baja`, con otro permiso.
 */
export function ModalCambiarEstadoConductor({
  conductor,
  abierto,
  onCerrar,
}: {
  conductor: ConductorListItemDto | null
  abierto: boolean
  onCerrar: () => void
}) {
  // Montado solo mientras esta abierto: arranca desde el estado ACTUAL en cada apertura.
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
  const mutacion = useCambiarEstadoConductor(conductor.id)

  const destinos = destinosDeEstadoConductor(conductor.estado)

  const form = useForm<CambiarEstadoConductorFormulario>({
    resolver: zodResolver(cambiarEstadoConductorSchema),
    defaultValues: {
      // Sin destinos el boton queda deshabilitado, asi que este valor no se llega a mandar; existe
      // para que el tipo cierre sin un `!` que mienta sobre la nulabilidad.
      estadoNuevo: destinos[0] ?? 'suspendido',
      motivo: '',
    },
  })

  const opciones: OpcionRadio[] = DESTINOS_ESTADO_CONDUCTOR.map((estado) => ({
    valor: estado,
    etiqueta: t(`flota:${claveDeEstadoConductor(estado)}`, { defaultValue: estado }),
    deshabilitada: !destinos.includes(estado),
  }))

  const errorGeneral = mutacion.error
    ? resolveApiErrorMessage(parseApiError(mutacion.error), t)
    : null

  const errorMotivo = form.formState.errors.motivo?.message
  const mensajeDeMotivo =
    errorMotivo === undefined ? undefined : t(errorMotivo, { defaultValue: errorMotivo })

  const enviar = form.handleSubmit((valores) => {
    mutacion.mutate(aCambiarEstadoConductorRequest(valores), {
      onSuccess: () => {
        mutacion.reset()
        onCerrar()
      },
    })
  })

  return (
    <Modal
      abierto
      onCerrar={onCerrar}
      cierrePorFuera={false}
      titulo={t('flota:conductorEstado.titulo')}
      descripcion={conductor.nombreCompleto ?? undefined}
      pie={
        <>
          <Boton variante="secundaria" onClick={onCerrar} deshabilitado={mutacion.isPending}>
            {t('flota:comun.cancelar')}
          </Boton>
          <Boton
            onClick={() => void enviar()}
            cargando={mutacion.isPending}
            deshabilitado={destinos.length === 0}
          >
            {t('flota:conductorEstado.confirmar')}
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

        <div className="flex items-center gap-2 text-sm text-fg-secundario">
          {t('flota:conductorEstado.estadoActual')}
          <ConductorBadgeEstado
            estado={conductor.estado}
            activo={conductor.activo}
            variante="catalogo"
          />
        </div>

        {destinos.length === 0 ? (
          <p className="rounded-lg border border-dashed border-borde bg-superficie-2 px-3 py-2 text-sm text-fg-secundario">
            {conductor.estado === 'suspendido'
              ? t('flota:conductorEstado.suspendidoSinVuelta')
              : t('flota:conductorEstado.sinDestinos')}
          </p>
        ) : null}

        <Controller
          control={form.control}
          name="estadoNuevo"
          render={({ field }) => (
            <Campo etiqueta={t('flota:conductorEstado.nuevoEstado')} requerido>
              {(control) => (
                <GrupoRadio
                  {...control}
                  opciones={opciones}
                  valor={field.value}
                  onCambio={field.onChange}
                />
              )}
            </Campo>
          )}
        />

        <Campo
          etiqueta={t('flota:conductorEstado.motivo')}
          ayuda={t('flota:conductorEstado.motivoAyuda')}
          error={mensajeDeMotivo}
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
      </form>
    </Modal>
  )
}
