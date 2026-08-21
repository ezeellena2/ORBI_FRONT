import { Controller, useForm, useWatch, type FieldError } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useTranslation } from 'react-i18next'
import { AreaTexto } from '@/shared/ui/AreaTexto'
import { Boton } from '@/shared/ui/Boton'
import { Campo } from '@/shared/ui/Campo'
import { GrupoRadio } from '@/shared/ui/GrupoRadio'
import { Input } from '@/shared/ui/Input'
import { Modal } from '@/shared/ui/Modal'
import { Select } from '@/shared/ui/Select'
import { Aviso } from '@/shared/ui/Aviso'
import { repartirErroresDelAlta } from './errores-alta-conductor'
import { useCrearConductor } from '../../hooks/useCrearConductor'
import {
  aCrearConductorRequest,
  crearConductorSchema,
  VALORES_INICIALES_CREAR_CONDUCTOR,
  type CrearConductorFormulario,
} from '../../schemas/crear-conductor'

/** Marca los errores que puso el SERVIDOR (ya resueltos desde su `message_key`, no se retraducen). */
const TIPO_ERROR_SERVIDOR = 'servidor'

/**
 * Modal "Nuevo conductor" — `POST /api/flota/conductores`, permiso `flota.conductores.crear`.
 *
 * ── LOS DOS MODOS SON UN RADIO, NO DOS FORMULARIOS ────────────────────────────────────────────
 * El backend exige **exactamente uno** de `personaId` (Modo A) o `persona` (Modo B):
 * `validation.persona.modo_invalido`. Un radio garantiza esa exclusividad por construccion — con dos
 * bloques rellenables a la vez, el 400 llegaria por una combinacion que el usuario no ve.
 *
 * El default es el **Modo B**, que es el camino real: el operador tiene el documento en la mano, no
 * un uuid. El Modo A queda para quien copio el identificador desde otra pantalla, y su ayuda dice la
 * verdad incomoda — **solo alcanza a personas que ESTA organizacion ya proyecto**, porque Flota no
 * tiene forma de resolver un `personaId` contra el Canonico.
 *
 * ── LA IDENTIDAD ES CANONICA: SE REUSA, NO SE DUPLICA ─────────────────────────────────────────
 * El Modo B resuelve la Persona **por documento**. Si ya existe en ORBI, se REUSA y el Canonico
 * **no pisa** su nombre. Y puede devolver `nombre`/`apellido` en `null` cuando la organizacion no
 * tenia relacion previa con esa persona: **eso NO es un error, es el gate de privacidad** — la UI se
 * queda con lo que el operador tipeo.
 *
 * ── LO QUE NO SE DIBUJA (los 2 dan 400, no se descartan en silencio) ──────────────────────────
 *  - **Bloque de licencia**: `validation.licencia.sin_destino`. No tiene donde persistirse (B-21);
 *    se carga despues como documento con `tipoDocumento: 'licencia'`. El modal lo DICE.
 *  - **Toggle "Enviar invitacion por email"**: `validation.enviar_invitacion.no_soportado`. No hay
 *    canal contratado — Flota no invoca Notificaciones.
 *  - **Email y fecha de nacimiento**: el contrato del Canonico no los recibe y **se descartan**. Un
 *    campo cuyo valor se pierde en silencio es peor que su ausencia.
 *
 * ── EL ERROR NO CIERRA EL MODAL ───────────────────────────────────────────────────────────────
 * Un 409 `flota.conductor.persona_ya_es_conductor` o un 400 `datos_canonicos_invalidos` dejan el
 * modal abierto con lo tipeado intacto. Cerrarlo en verde sobre un rechazo es la version silenciosa
 * de mentir: la fila no aparece en el listado y nadie sabe por que.
 */
export function ModalCrearConductor({
  abierto,
  onCerrar,
}: {
  abierto: boolean
  onCerrar: () => void
}) {
  // Se monta solo mientras esta abierto: el formulario arranca limpio en cada apertura y el error
  // del intento anterior no reaparece en el siguiente.
  if (!abierto) return null

  return <Formulario onCerrar={onCerrar} />
}

function Formulario({ onCerrar }: { onCerrar: () => void }) {
  const { t } = useTranslation(['flota', 'common'])
  const mutacion = useCrearConductor()

  const form = useForm<CrearConductorFormulario>({
    resolver: zodResolver(crearConductorSchema),
    defaultValues: VALORES_INICIALES_CREAR_CONDUCTOR,
  })

  // `useWatch`, no `form.watch()`: `watch()` devuelve una funcion que el compilador de React no
  // puede memorizar sin arriesgar UI vieja, y el lint del repo la rechaza.
  const modo = useWatch({ control: form.control, name: 'modo' })

  // Los de Zod son claves i18n y se traducen; los del servidor ya vienen resueltos y se pintan tal
  // cual. Se distinguen por el `type`, no adivinando si el string parece una clave.
  const mensajeDe = (error: FieldError | undefined) => {
    if (!error?.message) return undefined
    return error.type === TIPO_ERROR_SERVIDOR
      ? error.message
      : t(error.message, { defaultValue: error.message })
  }

  /*
    Los 409/404/500 de negocio llegan como `code` top-level y van al banner; su copy vive UNA sola
    vez en el catalogo de errores de `common.json`. Los 400 de validacion van al campo — salvo los
    que NO tienen campo en este formulario (el request es anidado y el form es plano), que tambien
    van al banner en vez de perderse. El reparto vive en `errores-alta-conductor.ts`, con tests.
  */
  const errorGeneral = mutacion.error
    ? repartirErroresDelAlta(mutacion.error, t).general
    : null

  const enviar = form.handleSubmit((valores) => {
    mutacion.mutate(aCrearConductorRequest(valores), {
      // Cierra y DEJA AL USUARIO EN EL LISTADO: la fila nueva aparece con su badge "Pendiente" (el
      // hook invalida el prefijo). No se navega a la ficha — ver la fila aparecer ES el resultado de
      // la accion, y llevarselo a otra pantalla se lo esconde.
      onSuccess: () => {
        mutacion.reset()
        onCerrar()
      },
      onError: (error) => {
        // Solo los que TIENEN campo en este formulario. El cast a `keyof` que habia antes tapaba el
        // desajuste `Persona.Nombre` → `personaNombre` y el error no se veia en ninguna parte.
        for (const [campo, mensaje] of repartirErroresDelAlta(error, t).campos) {
          form.setError(campo, { type: TIPO_ERROR_SERVIDOR, message: mensaje })
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
      titulo={t('flota:conductorAlta.titulo')}
      descripcion={t('flota:conductorAlta.subtitulo')}
      pie={
        <>
          <Boton variante="secundaria" onClick={onCerrar} deshabilitado={mutacion.isPending}>
            {t('flota:comun.cancelar')}
          </Boton>
          <Boton onClick={() => void enviar()} cargando={mutacion.isPending}>
            {t('flota:conductorAlta.guardar')}
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

        <Controller
          control={form.control}
          name="modo"
          render={({ field }) => (
            <Campo etiqueta={t('flota:conductorAlta.modo')} ayuda={t('flota:conductorAlta.modoAyuda')}>
              {(control) => (
                <GrupoRadio
                  {...control}
                  valor={field.value}
                  onCambio={field.onChange}
                  opciones={[
                    { valor: 'nuevo', etiqueta: t('flota:conductorAlta.modoNuevo') },
                    { valor: 'existente', etiqueta: t('flota:conductorAlta.modoExistente') },
                  ]}
                />
              )}
            </Campo>
          )}
        />

        {modo === 'existente' ? (
          <Campo
            etiqueta={t('flota:conductorAlta.personaId')}
            ayuda={t('flota:conductorAlta.personaIdAyuda')}
            error={mensajeDe(form.formState.errors.personaId)}
            requerido
          >
            {(control) => (
              <Input
                {...control}
                {...form.register('personaId')}
                mono
                autoComplete="off"
                invalido={form.formState.errors.personaId !== undefined}
              />
            )}
          </Campo>
        ) : (
          <BloquePersonaNueva form={form} mensajeDe={mensajeDe} />
        )}

        <div className="grid gap-4 sm:grid-cols-2">
          <Campo
            etiqueta={t('flota:conductorAlta.numeroLegajo')}
            error={mensajeDe(form.formState.errors.numeroLegajo)}
          >
            {(control) => <Input {...control} {...form.register('numeroLegajo')} />}
          </Campo>
        </div>

        <Campo etiqueta={t('flota:conductorAlta.notas')} error={mensajeDe(form.formState.errors.notas)}>
          {(control) => <AreaTexto {...control} {...form.register('notas')} filas={3} />}
        </Campo>

        {/*
          Las 3 cosas que el usuario espera y NO estan, dichas ANTES de guardar en vez de dejarlas
          como sorpresa: la licencia va aparte, la invitacion no existe, y el conductor nace
          "pendiente". Los 2 primeros son rechazos 400 del Validator, no omisiones nuestras.
        */}
        <div className="flex flex-col gap-1 rounded-lg border border-dashed border-borde bg-superficie-2 px-3 py-2 text-xs text-fg-secundario">
          <p>{t('flota:conductorAlta.licenciaAparte')}</p>
          <p>{t('flota:conductorAlta.invitacionNoDisponible')}</p>
          <p>{t('flota:conductorAlta.estadoInicial')}</p>
        </div>
      </form>
    </Modal>
  )
}

/**
 * Modo B — la Persona canonica se resuelve o se crea POR DOCUMENTO.
 *
 * El select de tipo de documento reusa el vocabulario de Access (`auth.registro.docTypes.*` con los
 * valores `dni|cuit|pasaporte|otro`), que es el que ya usan las 3 pantallas de registro. **No se
 * inventa un catalogo `tipoDocumentoPersona` de Flota**: el contrato dice que el tipo lo valida el
 * **Canonico**, que es su dueno, y no lo enumera. Si el PO quiere un catalogo propio, es una
 * decision suya — hoy duplicar la lista en dos modulos es como divergen.
 */
function BloquePersonaNueva({
  form,
  mensajeDe,
}: {
  form: ReturnType<typeof useForm<CrearConductorFormulario>>
  mensajeDe: (error: FieldError | undefined) => string | undefined
}) {
  const { t } = useTranslation(['flota', 'common'])

  const tiposDocumento = [
    { valor: 'dni', etiqueta: t('common:auth.registro.docTypes.dni') },
    { valor: 'cuit', etiqueta: t('common:auth.registro.docTypes.cuit') },
    { valor: 'pasaporte', etiqueta: t('common:auth.registro.docTypes.passport') },
    { valor: 'otro', etiqueta: t('common:auth.registro.docTypes.other') },
  ]

  return (
    <div className="flex flex-col gap-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <Controller
          control={form.control}
          name="tipoDocumento"
          render={({ field }) => (
            <Campo
              etiqueta={t('flota:conductorAlta.tipoDocumento')}
              error={mensajeDe(form.formState.errors.tipoDocumento)}
              requerido
            >
              {(control) => (
                <Select
                  {...control}
                  opciones={tiposDocumento}
                  valor={field.value}
                  onCambio={field.onChange}
                />
              )}
            </Campo>
          )}
        />

        <Campo
          etiqueta={t('flota:conductorAlta.numeroDocumento')}
          error={mensajeDe(form.formState.errors.numeroDocumento)}
          requerido
        >
          {(control) => (
            <Input
              {...control}
              {...form.register('numeroDocumento')}
              mono
              autoComplete="off"
              invalido={form.formState.errors.numeroDocumento !== undefined}
            />
          )}
        </Campo>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Campo
          etiqueta={t('flota:conductorAlta.nombre')}
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

        <Campo
          etiqueta={t('flota:conductorAlta.apellido')}
          error={mensajeDe(form.formState.errors.apellido)}
          requerido
        >
          {(control) => (
            <Input
              {...control}
              {...form.register('apellido')}
              invalido={form.formState.errors.apellido !== undefined}
            />
          )}
        </Campo>
      </div>

      <Campo
        etiqueta={t('flota:conductorAlta.telefono')}
        ayuda={t('flota:conductorAlta.telefonoAyuda')}
        error={mensajeDe(form.formState.errors.telefono)}
      >
        {(control) => <Input {...control} {...form.register('telefono')} mono />}
      </Campo>
    </div>
  )
}
