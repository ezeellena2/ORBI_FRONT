import { Controller, useForm, useWatch, type FieldError } from 'react-hook-form'
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
import { Toggle } from '@/shared/ui/Toggle'
import {
  hasApiFieldErrors,
  parseApiError,
  resolveApiErrorMessage,
  resolveApiFieldErrors,
} from '@/shared/errors/parse-api-error'
import type { DispositivoDetalleDto } from '@/services/contracts/flota'
import { AccionConMotivo } from '../AccionConMotivo'
import { AvisoOperacion } from '../AvisoOperacion'
import { CampoModeloDispositivo, CampoProveedorSim } from './CamposCatalogoDispositivo'
import { useBajaDispositivo } from '../../hooks/useBajaDispositivo'
import { useDispositivo } from '../../hooks/useDispositivo'
import { useEditarDispositivo } from '../../hooks/useEditarDispositivo'
import { usePermisos } from '../../hooks/usePermisos'
import { useReactivarDispositivo } from '../../hooks/useReactivarDispositivo'
import {
  aActualizarDispositivoRequest,
  camposDispositivoQueNoSePuedenBorrar,
  editarDispositivoSchema,
  valoresInicialesEditarDispositivo,
  type EditarDispositivoFormulario,
} from '../../schemas/editar-dispositivo'
import { AvisoCamposNoBorrables } from '../AvisoCamposNoBorrables'

/** Marca los errores que puso el SERVIDOR (ya resueltos desde su `message_key`, no se retraducen). */
const TIPO_ERROR_SERVIDOR = 'servidor'

/**
 * Permiso de los endpoints `POST .../baja` y `POST .../reactivar` que dispara el toggle de estado.
 * NO es el permiso del modal (`flota.dispositivos.editar`). Ver `ToggleActivo`.
 */
const PERMISO_BAJA_DISPOSITIVO = 'flota.dispositivos.eliminar'

/**
 * Modal "Editar dispositivo" — `PATCH /api/flota/dispositivos/{id}`, permiso
 * `flota.dispositivos.editar`.
 *
 * **Implementacion UNICA**, usada por el kebab del listado (via `ModalEditarDispositivoPorId`) y por
 * el hero del detalle. Antes habia dos copias y cada correccion del contrato habia que aplicarla dos
 * veces.
 *
 * ── LA IDENTIDAD TECNICA SE MUESTRA BLOQUEADA, NO ESCONDIDA ───────────────────────────────────
 * IMEI, fabricante y numero de serie son read-only despues del alta (DA-DL-09 / D-S3-24) y
 * `ActualizarDispositivoRequest` no los expone. Se muestran con su leyenda para que el usuario
 * entienda que el dato existe y por que no se toca, en vez de descubrirlo cuando no encuentra el
 * campo.
 *
 * ── MODELO Y PROVEEDOR DE SIM SALEN DEL CATALOGO ──────────────────────────────────────────────
 * El valor que viaja es el **uuid** de `modelos_dispositivo_flota` / `proveedores_sim_flota`, nunca
 * texto libre (B-18).
 *
 * ⚠️ **VACIAR UN SELECT NO DESVINCULA, NI SIQUIERA EL DE SIM.** La version anterior de este
 * comentario decia que `proveedorSimId` admitia `null` explicito y desvinculaba: es FALSO contra el
 * codigo que corre. `DispositivoGpsService` resuelve los DOS campos igual
 * (`request.ModeloId ?? dispositivo.ModeloId`, `request.ProveedorSimId ?? dispositivo.ProveedorSimId`)
 * porque `System.Text.Json` no distingue "ausente" de "null", y ante la ambiguedad PRESERVA. O sea
 * que la "asimetria del contrato" que se elevo al PO no existe: los dos campos se comportan igual y
 * el pendiente real es UNO SOLO (`Optional<T>` o JSON Merge Patch para poder expresar el borrado).
 *
 * Mientras tanto la UI no promete lo que no pasa: los dos selects llevan la ayuda que lo dice, en
 * vez de cerrar en verde con el dato intacto.
 */

export interface ModalEditarDispositivoProps {
  dispositivo: DispositivoDetalleDto
  abierto: boolean
  onCerrar: () => void
  /**
   * Muestra el toggle "Dispositivo activo" (ficha §7): dispara `POST .../baja` y
   * `POST .../reactivar`, NO el `PATCH`. Lo usa el LISTADO, donde esas acciones no tienen otro
   * lugar. En el detalle van en el menu "Mas acciones" con su propio dialogo de confirmacion, asi
   * que ahi el toggle se apaga para no ofrecer la misma baja por dos caminos distintos.
   */
  conEstadoActivo?: boolean
}

export function ModalEditarDispositivo({
  dispositivo,
  abierto,
  onCerrar,
  conEstadoActivo = false,
}: ModalEditarDispositivoProps) {
  // Montado solo mientras esta abierto: el formulario toma sus valores del dispositivo ACTUAL en
  // cada apertura y el error de un intento anterior no reaparece en el siguiente.
  if (!abierto) return null

  return (
    <Formulario
      dispositivo={dispositivo}
      onCerrar={onCerrar}
      conEstadoActivo={conEstadoActivo}
    />
  )
}

/**
 * Variante del LISTADO: recibe un id y carga el detalle antes de abrir el formulario.
 *
 * `DispositivoListItemDto` no trae `numeroSim`, `proveedorSimId` ni `notasOperativas` — son campos
 * del detalle. Precargar el form con la mitad y completarlo despues haria que el usuario tipee
 * sobre campos que se van a pisar, asi que se espera con un cargando propio.
 */
export function ModalEditarDispositivoPorId({
  dispositivoId,
  abierto,
  onCerrar,
}: {
  dispositivoId: string | undefined
  abierto: boolean
  onCerrar: () => void
}) {
  const { t } = useTranslation(['flota', 'common'])
  // `undefined` mientras el modal esta cerrado: el hook no dispara request hasta que hace falta.
  const consulta = useDispositivo(abierto ? dispositivoId : undefined)

  if (!abierto) return null

  if (consulta.data) {
    return (
      <ModalEditarDispositivo
        dispositivo={consulta.data}
        abierto
        onCerrar={onCerrar}
        conEstadoActivo
      />
    )
  }

  return (
    <Modal abierto onCerrar={onCerrar} titulo={t('flota:dispositivosListado.editar.titulo')}>
      {consulta.isError ? (
        <AvisoOperacion
          titulo={t('flota:dispositivosListado.editar.errorCarga')}
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
  dispositivo,
  onCerrar,
  conEstadoActivo,
}: {
  dispositivo: DispositivoDetalleDto
  onCerrar: () => void
  conEstadoActivo: boolean
}) {
  const { t } = useTranslation(['flota', 'common'])
  const mutacion = useEditarDispositivo(dispositivo.id)

  const form = useForm<EditarDispositivoFormulario>({
    resolver: zodResolver(editarDispositivoSchema),
    defaultValues: valoresInicialesEditarDispositivo(dispositivo),
  })

  // Los de Zod son claves i18n y se traducen; los del servidor ya vienen resueltos y se pintan tal
  // cual. Se distinguen por el `type`, no adivinando si el string parece una clave.
  const mensajeDe = (error: FieldError | undefined) => {
    if (!error?.message) return undefined
    return error.type === TIPO_ERROR_SERVIDOR
      ? error.message
      : t(error.message, { defaultValue: error.message })
  }

  // Los 404 de catalogo (`modelo_no_existe` / `proveedor_sim_no_existe`) llegan como `code`
  // top-level, no dentro de `validation_errors`: van al banner. Su copy vive UNA sola vez en el
  // catalogo de errores de `common.json`.
  /*
    `useWatch`, no `form.watch()`: la regla `react-hooks/incompatible-library` marca `watch()` como
    no memoizable y deja al React Compiler saltearse el componente entero. `useWatch` es la API
    suscribible que el compilador sí entiende. Devuelve los valores como parciales, y por eso los
    helpers los reciben `Partial<...>`.
  */
  const valoresActuales = useWatch({ control: form.control })

  const errorGeneral = (() => {
    if (!mutacion.error) return null
    const apiError = parseApiError(mutacion.error)
    if (hasApiFieldErrors(apiError)) return null
    return resolveApiErrorMessage(apiError, t)
  })()

  const enviar = form.handleSubmit((valores) => {
    mutacion.mutate(aActualizarDispositivoRequest(valores), {
      onSuccess: () => {
        mutacion.reset()
        onCerrar()
      },
      onError: (error) => {
        // Un 400 de forma vuelve a los campos; el resto queda en el banner de arriba.
        const errores = resolveApiFieldErrors(parseApiError(error), t)
        for (const [campo, mensaje] of Object.entries(errores)) {
          form.setError(campo as keyof EditarDispositivoFormulario, {
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
      titulo={t('flota:dispositivosListado.editar.titulo')}
      // `alias` es nullable (D-S3-12): sin el, el subtitulo cae al IMEI, que es la identidad real.
      descripcion={dispositivo.alias ?? dispositivo.imei}
      pie={
        <>
          <Boton variante="secundaria" onClick={onCerrar} deshabilitado={mutacion.isPending}>
            {t('flota:comun.cancelar')}
          </Boton>
          <Boton onClick={() => void enviar()} cargando={mutacion.isPending}>
            {t('flota:dispositivosListado.editar.guardar')}
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

        <IdentidadTecnicaBloqueada dispositivo={dispositivo} />

        <Campo
          etiqueta={t('flota:dispositivosListado.editar.alias')}
          ayuda={t('flota:dispositivosListado.editar.aliasAyuda')}
          error={mensajeDe(form.formState.errors.alias)}
        >
          {(control) => (
            <Input
              {...control}
              {...form.register('alias')}
              invalido={form.formState.errors.alias !== undefined}
            />
          )}
        </Campo>

        {/*
          Los selects van por `Controller` y no por `register`: son controles CONTROLADOS de Base UI
          y no emiten el evento nativo que `register` escucharia.
        */}
        <Controller
          control={form.control}
          name="modeloId"
          render={({ field }) => (
            <CampoModeloDispositivo
              valor={field.value}
              onCambio={field.onChange}
              ayuda={t('flota:dispositivosListado.editar.catalogoNoDesvincula')}
            />
          )}
        />

        <Campo
          etiqueta={t('flota:dispositivosListado.editar.numeroSim')}
          error={mensajeDe(form.formState.errors.numeroSim)}
        >
          {(control) => <Input {...control} {...form.register('numeroSim')} mono />}
        </Campo>

        <Controller
          control={form.control}
          name="proveedorSimId"
          render={({ field }) => (
            <CampoProveedorSim
              valor={field.value}
              onCambio={field.onChange}
              ayuda={t('flota:dispositivosListado.editar.catalogoNoDesvincula')}
            />
          )}
        />

        {/*
          "Costo de adquisicion" y "Ubicacion en deposito" SE BORRARON (D-S3-12): no existen las
          columnas, y como no hay `UnmappedMemberHandling` configurado, System.Text.Json los
          descartaba en silencio — el usuario los tipeaba, recibia 200 y el dato se perdia.
        */}

        <Campo
          etiqueta={t('flota:dispositivosListado.editar.notas')}
          error={mensajeDe(form.formState.errors.notasOperativas)}
        >
          {(control) => <AreaTexto {...control} {...form.register('notasOperativas')} filas={3} />}
        </Campo>

        {/*
          Se calcula sobre lo que hay EN EL FORMULARIO ahora, no en el submit: el usuario tiene que
          enterarse mientras vacia el campo, no despues de guardar. `watch()` re-renderiza el modal
          en cada tecla, que es exactamente lo que hace falta para que el aviso aparezca y desaparezca
          solo.
        */}
        <AvisoCamposNoBorrables
          campos={camposDispositivoQueNoSePuedenBorrar(valoresActuales, dispositivo).map((campo) =>
            t(`flota:dispositivosListado.editar.campos.${campo}`),
          )}
        />

        {conEstadoActivo ? <ToggleActivo dispositivo={dispositivo} /> : null}
      </form>
    </Modal>
  )
}

/** La frontera canonico↔operativo, dicha en la UI en vez de dejarla como sorpresa del backend. */
function IdentidadTecnicaBloqueada({ dispositivo }: { dispositivo: DispositivoDetalleDto }) {
  const { t } = useTranslation(['flota', 'common'])

  const campos = [
    {
      clave: 'imei',
      etiqueta: t('flota:dispositivoDetalle.info.imei'),
      valor: dispositivo.imei,
      mono: true,
    },
    {
      clave: 'numeroSerie',
      etiqueta: t('flota:dispositivoDetalle.info.numeroSerie'),
      valor: dispositivo.numeroSerie,
      mono: true,
    },
    {
      // `fabricante` se DERIVA del catalogo de modelos (D-S3-25): cambia solo si cambia el modelo.
      clave: 'fabricante',
      etiqueta: t('flota:dispositivoDetalle.info.fabricante'),
      valor: dispositivo.fabricante,
      mono: false,
    },
  ]

  return (
    <fieldset disabled className="flex flex-col gap-3">
      <legend className="sr-only">{t('flota:dispositivosListado.editar.imeiBloqueado')}</legend>

      <p className="flex items-start gap-2 rounded-lg border border-borde bg-superficie-2 px-3 py-2 text-xs text-fg-secundario">
        <Icono icono={Lock} tamano="sm" />
        {t('flota:dispositivosListado.editar.imeiBloqueado')}
      </p>

      <div className="grid gap-3 sm:grid-cols-3">
        {campos.map((campo) => (
          <Campo key={campo.clave} etiqueta={campo.etiqueta}>
            {(control) => (
              <Input {...control} readOnly value={campo.valor ?? ''} mono={campo.mono} />
            )}
          </Campo>
        ))}
      </div>
    </fieldset>
  )
}

/**
 * Toggle "Dispositivo activo" — dispara los endpoints DEDICADOS `POST .../baja` y
 * `POST .../reactivar`, NO el `PATCH` (ficha §7, DA-DL-11). No es un campo del formulario: es una
 * accion inmediata, y por eso vive fuera del `handleSubmit`.
 *
 * La baja es COHERENTE (DA-DL-10): setea `activo=false` **y** `estado_stock='dado_de_baja'` en la
 * misma transaccion. Con el dispositivo instalado en un vehiculo el backend la BLOQUEA con 409
 * `flota.dispositivo.baja_con_asignacion_activa`, y ese copy se muestra aca mismo: la accion no se
 * anticipa en el cliente, se deja fallar y se explica.
 *
 * ── EL TOGGLE TIENE SU PROPIO PERMISO, DISTINTO DEL DEL MODAL ─────────────────────────────────
 * El modal se abre con `flota.dispositivos.editar`, pero los 2 endpoints que este control dispara
 * estan gateados con **`flota.dispositivos.eliminar`** (`DispositivosController`). No son el mismo
 * permiso ni los tienen los mismos roles: en la matriz de `permisos.md` **supervisor tiene `editar`
 * y NO tiene `eliminar`**, asi que un supervisor veia un toggle habilitado, lo apagaba y se comia un
 * 403 — exactamente "dibujar un boton para una operacion que el backend no puede completar".
 * `AccionesDispositivo` de la ficha ya lo hacia bien; eran dos criterios para la misma operacion.
 *
 * Se DESHABILITA con el motivo visible en vez de ocultarse: el estado activo/inactivo es informacion
 * que el usuario necesita ver aunque no pueda cambiarlo (y ocultarlo dejaria un modal que cambia de
 * forma segun el rol, sin decir por que).
 */
function ToggleActivo({ dispositivo }: { dispositivo: DispositivoDetalleDto }) {
  const { t } = useTranslation(['flota', 'common'])
  const { tienePermiso } = usePermisos()
  const baja = useBajaDispositivo(dispositivo.id)
  const reactivar = useReactivarDispositivo(dispositivo.id)

  const puedeCambiarEstado = tienePermiso(PERMISO_BAJA_DISPOSITIVO)
  const motivo = puedeCambiarEstado
    ? undefined
    : t('flota:dispositivosListado.acciones.sinPermiso', { permiso: PERMISO_BAJA_DISPOSITIVO })

  const error = baja.error ?? reactivar.error
  const enCurso = baja.isPending || reactivar.isPending

  return (
    <div className="flex flex-col gap-2 border-t border-borde pt-4">
      <AccionConMotivo motivo={motivo}>
        <Toggle
          etiqueta={t('flota:dispositivosListado.editar.activo')}
          descripcion={t('flota:dispositivosListado.editar.activoAyuda')}
          activo={dispositivo.activo}
          cargando={enCurso}
          deshabilitado={!puedeCambiarEstado}
          onCambio={(activo) => {
            if (activo) {
              reactivar.mutate()
              return
            }
            baja.mutate()
          }}
        />
      </AccionConMotivo>
      {error ? <AvisoOperacion titulo={resolveApiErrorMessage(parseApiError(error), t)} /> : null}
    </div>
  )
}
