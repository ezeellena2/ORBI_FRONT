import { useState } from 'react'
import { Controller, useForm, useWatch, type FieldError } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useTranslation } from 'react-i18next'
import { Info } from 'lucide-react'
import { AreaTexto } from '@/shared/ui/AreaTexto'
import { Boton } from '@/shared/ui/Boton'
import { Campo } from '@/shared/ui/Campo'
import { Icono } from '@/shared/ui/Icono'
import { Input } from '@/shared/ui/Input'
import { Modal } from '@/shared/ui/Modal'
import { Select, type OpcionSelect } from '@/shared/ui/Select'
import { Toggle } from '@/shared/ui/Toggle'
import {
  parseApiError,
  resolveApiErrorMessage,
  resolveApiFieldErrors,
} from '@/shared/errors/parse-api-error'
import { Aviso } from '@/shared/ui/Aviso'
import { EditorDeCondicion } from './EditorDeCondicion'
import { SelectorWebhookDeRegla } from './SelectorWebhookDeRegla'
import { useActualizarRegla } from '../../../hooks/useActualizarRegla'
import { useCrearRegla } from '../../../hooks/useCrearRegla'
import {
  claveDeGuiaDeErrorCentro,
  claveDeSeveridadProblema,
  claveDeTipoRegla,
  SEVERIDADES_PROBLEMA,
  TIPOS_REGLA_PROBLEMA,
  tratamientoDeErrorCentro,
} from '../../../vocabulario-centro-problemas'
import {
  OPCIONES_DE_PLAZO_MINUTOS,
  SLA_MINUTOS_POR_SEVERIDAD,
  formatoDePlazo,
  validarCondicionEnCliente,
  type VeredictoCondicion,
} from '../../../vocabulario-reglas-problemas'
import {
  aActualizarReglaRequest,
  aCondicionJson,
  aCrearReglaRequest,
  aFormularioDeRegla,
  intentaDesvincularWebhook,
  reglaProblemaSchema,
  VALORES_INICIALES_REGLA,
  type ReglaProblemaFormulario,
} from '../../../schemas/regla-problema'
import type { ReglaProblemaDto, SeveridadProblema } from '@/services/contracts/flota'

const TIPO_ERROR_SERVIDOR = 'servidor'

/**
 * Modal unico crear / editar / duplicar de regla — ficha §7, `f-10` paso 7.
 *
 * ══ LO QUE ESTE MODAL NO OFRECE, Y LO DICE ══════════════════════════════════════════════════════
 * **Alcance** (vehiculos / conductores / geozonas) y **Responsable** (`destinatarios[]`): el request
 * **no los acepta** — son 3 relaciones N:M y 2 listas sin tabla puente ni columna en ningun
 * documento normativo (PENDIENTE #2). No hay selector deshabilitado: hay **una linea que dice que
 * esta regla alcanza a toda la organizacion**, que es el hecho. Un control apagado sin explicacion
 * se lee como "todavia no lo cargue"; la ficha §7 pedia el control y `f-10` paso 7 lo bloqueo.
 *
 * **`ventanaHoraria`, `canalesInternos` y `ventanaSilencioMinutos`** estan en el request y **no** en
 * el mockup ni en la ficha: PENDIENTE declarada. No se inventan controles.
 *
 * ══ EL `tipo` SE FIJA EN EL ALTA (DA-PR-08) ═════════════════════════════════════════════════════
 * `ActualizarReglaProblemaRequest` **ni siquiera lo declara**: mandarlo seria un no-op silencioso.
 * En edicion el select va en solo lectura, no oculto — el tipo es lo que explica de donde sale la
 * senal, y esconderlo deja la regla sin contexto.
 *
 * ══ EL 400 DEL DSL ES DE CAMPO, NO DE PANTALLA ══════════════════════════════════════════════════
 * `flota.regla.condicion_invalida` llega con `args {indice, motivo}` y se pinta **en la fila
 * ofensora** del editor, con el mismo copy que usa la validacion de cliente. Un 400 de forma
 * (`nombre`, `accionSugerida`, `slaMinutos`) va a su campo. Lo demas, al banner.
 *
 * ⚠️ **Nombre duplicado no tiene `code`** (DA-PR-07) y tampoco hay indice unico: la UI **no lo
 * anticipa**. Dos reglas con el mismo nombre se crean sin error, y eso es el comportamiento actual.
 */
export function ModalRegla({
  abierto,
  regla,
  modo,
  onCerrar,
}: {
  abierto: boolean
  /** La fila de origen: `null` en el alta, la regla en editar, y el clon en duplicar. */
  regla: ReglaProblemaDto | null
  modo: 'crear' | 'editar' | 'duplicar'
  onCerrar: () => void
}) {
  // Montado solo mientras esta abierto: el formulario arranca limpio en cada apertura y el error del
  // intento anterior no reaparece.
  if (!abierto) return null

  return <Formulario regla={regla} modo={modo} onCerrar={onCerrar} />
}

function Formulario({
  regla,
  modo,
  onCerrar,
}: {
  regla: ReglaProblemaDto | null
  modo: 'crear' | 'editar' | 'duplicar'
  onCerrar: () => void
}) {
  const { t } = useTranslation(['flota', 'common'])

  const esEdicion = modo === 'editar'
  const crear = useCrearRegla()
  // El hook exige un id; en el alta no hay fila que actualizar y la mutacion nunca se dispara.
  const actualizar = useActualizarRegla(regla?.id ?? '')
  const mutacion = esEdicion ? actualizar : crear

  const [veredicto, setVeredicto] = useState<VeredictoCondicion | null>(null)

  const form = useForm<ReglaProblemaFormulario>({
    resolver: zodResolver(reglaProblemaSchema),
    defaultValues: regla === null ? VALORES_INICIALES_REGLA : aFormularioDeRegla(regla),
  })

  const mensajeDe = (error: FieldError | undefined) => {
    if (!error?.message) return undefined
    return error.type === TIPO_ERROR_SERVIDOR
      ? error.message
      : t(error.message, { defaultValue: error.message })
  }

  const apiError = mutacion.error ? parseApiError(mutacion.error) : null
  const tratamiento = apiError === null ? null : tratamientoDeErrorCentro(apiError.code, apiError.args)

  /*
    El 400 del DSL trae `args {indice, motivo}` y se pinta EN LA FILA, no en el banner: el editor ya
    sabe mostrar un veredicto y el copy es el mismo (`condicionInvalida.motivo.*`). Si el backend
    manda un `indice` que no existe en el formulario actual (una condicion que el usuario acaba de
    borrar), cae en `null` y se muestra arriba del editor, que es donde el usuario lo puede leer.
  */
  const veredictoDelServidor: VeredictoCondicion | null =
    tratamiento === 'condicionInvalida'
      ? {
          valida: false,
          indice: typeof apiError?.args?.indice === 'number' ? apiError.args.indice : null,
          motivo: (apiError?.args?.motivo ?? null) as VeredictoCondicion['motivo'],
        }
      : null

  const enviar = form.handleSubmit((valores) => {
    /*
      La condicion NO la valida Zod (ver el docblock del schema): se valida acá con las mismas 9
      causas del dominio y, si falla, el submit no se emite. Es lo que evita el round-trip para un
      error de forma que el cliente puede ver.
    */
    const local = validarCondicionEnCliente(aCondicionJson(valores.condiciones))
    setVeredicto(local)
    if (!local.valida) return

    const alTerminar = {
      onSuccess: () => {
        mutacion.reset()
        onCerrar()
      },
      onError: (error: unknown) => {
        const errores = resolveApiFieldErrors(parseApiError(error), t)
        for (const [campo, mensaje] of Object.entries(errores)) {
          form.setError(campo as keyof ReglaProblemaFormulario, {
            type: TIPO_ERROR_SERVIDOR,
            message: mensaje,
          })
        }
      },
    }

    if (esEdicion) {
      actualizar.mutate(aActualizarReglaRequest(valores), alTerminar)
      return
    }

    crear.mutate(aCrearReglaRequest(valores), alTerminar)
  })

  const opcionesDeTipo: OpcionSelect[] = TIPOS_REGLA_PROBLEMA.map((tipo) => ({
    valor: tipo,
    etiqueta: t(`flota:${claveDeTipoRegla(tipo)}`),
  }))

  const opcionesDeSeveridad: OpcionSelect[] = SEVERIDADES_PROBLEMA.map((severidad) => ({
    valor: severidad,
    etiqueta: t(`flota:${claveDeSeveridadProblema(severidad)}`),
  }))

  const opcionesDePlazo: OpcionSelect[] = OPCIONES_DE_PLAZO_MINUTOS.map((minutos) => {
    const formato = formatoDePlazo(minutos)
    return {
      valor: String(minutos),
      etiqueta: t(`flota:${formato.clave}`, { count: formato.cantidad }),
    }
  })

  // `useWatch`, no `form.watch()`: `watch()` devuelve una funcion que el compilador de React no
  // puede memoizar, y el lint lo frena (`react-hooks/incompatible-library`). Es el mismo patron que
  // ya usan los modales de conductores.
  const valores = useWatch({ control: form.control })

  const desvincula = intentaDesvincularWebhook(
    valores as ReglaProblemaFormulario,
    esEdicion ? regla : null,
  )

  return (
    <Modal
      abierto
      onCerrar={onCerrar}
      cierrePorFuera={false}
      tamano="lg"
      titulo={t(esEdicion ? 'flota:centro.reglas.modal.tituloEditar' : 'flota:centro.reglas.modal.tituloAlta')}
      descripcion={t('flota:centro.reglas.modal.subtitulo')}
      pie={
        <>
          <Boton variante="secundaria" onClick={onCerrar} deshabilitado={mutacion.isPending}>
            {t('flota:comun.cancelar')}
          </Boton>
          <Boton onClick={() => void enviar()} cargando={mutacion.isPending}>
            {t('flota:centro.reglas.modal.guardar')}
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
        {apiError === null || tratamiento === 'condicionInvalida' ? null : (
          <Aviso
            titulo={resolveApiErrorMessage(apiError, t)}
            mensaje={t(`flota:${claveDeGuiaDeErrorCentro(tratamiento ?? 'generico')}`)}
            trazaId={apiError.traceId}
          />
        )}

        <Campo
          etiqueta={t('flota:centro.reglas.modal.nombre')}
          error={mensajeDe(form.formState.errors.nombre)}
          requerido
        >
          {(control) => (
            <Input
              {...control}
              {...form.register('nombre')}
              invalido={form.formState.errors.nombre !== undefined}
            />
          )}
        </Campo>

        <div className="grid gap-4 sm:grid-cols-2">
          <Controller
            control={form.control}
            name="tipo"
            render={({ field }) => (
              <Campo
                etiqueta={t('flota:centro.reglas.modal.tipo')}
                ayuda={t(
                  esEdicion
                    ? 'flota:centro.reglas.modal.tipoFijo'
                    : 'flota:centro.reglas.modal.tipoAyuda',
                )}
                requerido
              >
                {(control) => (
                  <Select
                    {...control}
                    opciones={opcionesDeTipo}
                    valor={field.value}
                    onCambio={field.onChange}
                    deshabilitado={esEdicion}
                  />
                )}
              </Campo>
            )}
          />

          <Controller
            control={form.control}
            name="severidadBase"
            render={({ field }) => (
              <Campo etiqueta={t('flota:centro.reglas.modal.severidad')} requerido>
                {(control) => (
                  <Select
                    {...control}
                    opciones={opcionesDeSeveridad}
                    valor={field.value}
                    onCambio={(valor) => {
                      field.onChange(valor)
                      /*
                        El plazo sigue a la severidad porque §4.1 los ata: cambiar a `critica` y
                        dejar el plazo de `media` (8 h) produce una regla que contradice su propio
                        catalogo. Queda EDITABLE despues: el contrato permite sobrescribirlo.
                      */
                      form.setValue('slaMinutos', SLA_MINUTOS_POR_SEVERIDAD[valor as SeveridadProblema])
                    }}
                  />
                )}
              </Campo>
            )}
          />
        </div>

        <Controller
          control={form.control}
          name="slaMinutos"
          render={({ field }) => (
            <Campo
              etiqueta={t('flota:centro.reglas.modal.plazo')}
              ayuda={t('flota:centro.reglas.modal.plazoAyuda')}
              error={mensajeDe(form.formState.errors.slaMinutos)}
              requerido
            >
              {(control) => (
                <Select
                  {...control}
                  opciones={opcionesDePlazo}
                  valor={String(field.value)}
                  onCambio={(valor) => field.onChange(Number(valor))}
                />
              )}
            </Campo>
          )}
        />

        <Campo
          etiqueta={t('flota:centro.reglas.modal.condicion')}
          ayuda={t('flota:centro.reglas.modal.condicionAyuda')}
          requerido
        >
          <Controller
            control={form.control}
            name="condiciones"
            render={({ field }) => (
              <EditorDeCondicion
                filas={field.value}
                onCambio={field.onChange}
                veredicto={veredictoDelServidor ?? veredicto}
                deshabilitado={mutacion.isPending}
              />
            )}
          />
        </Campo>

        <AlcanceDeclarado />

        <Controller
          control={form.control}
          name="webhookEndpointId"
          render={({ field }) => (
            <SelectorWebhookDeRegla
              valor={field.value}
              onCambio={field.onChange}
              deshabilitado={mutacion.isPending}
            />
          )}
        />

        {desvincula ? <AvisoWebhookNoDesvinculable /> : null}

        <Campo
          etiqueta={t('flota:centro.reglas.modal.accionSugerida')}
          ayuda={t('flota:centro.reglas.modal.accionSugeridaAyuda')}
          error={mensajeDe(form.formState.errors.accionSugerida)}
          requerido
        >
          {(control) => (
            <AreaTexto {...control} {...form.register('accionSugerida')} filas={2} maxLargo={500} />
          )}
        </Campo>

        <Controller
          control={form.control}
          name="activa"
          render={({ field }) => (
            <Toggle
              etiqueta={t('flota:centro.reglas.modal.activa')}
              descripcion={t('flota:centro.reglas.modal.activaAyuda')}
              activo={field.value}
              onCambio={field.onChange}
            />
          )}
        />
      </form>
    </Modal>
  )
}

/**
 * La linea que reemplaza a los 2 controles que la ficha §7 pedia (Alcance y Responsable).
 *
 * No es un placeholder: es el **hecho**. Hoy toda regla alcanza a toda la organizacion, y esta
 * pantalla es el unico lugar donde el usuario puede enterarse antes de crearla.
 */
function AlcanceDeclarado() {
  const { t } = useTranslation('flota')

  return (
    <p className="flex items-start gap-2 rounded-lg border border-borde bg-superficie-2 px-3 py-2 text-xs text-fg-secundario">
      <Icono icono={Info} tamano="sm" />
      <span>{t('centroBloqueado.alcanceRegla')}</span>
    </p>
  )
}

/** B-18: elegir "Sin webhook" sobre una regla que ya tenia uno cierra en verde y no lo quita. */
function AvisoWebhookNoDesvinculable() {
  const { t } = useTranslation('flota')

  return (
    <p className="flex items-start gap-2 rounded-lg border border-advertencia/40 bg-advertencia-fondo px-3 py-2 text-xs text-fg-secundario">
      <Icono icono={Info} tamano="sm" />
      <span>{t('centro.reglas.modal.webhookNoSeDesvincula')}</span>
    </p>
  )
}
