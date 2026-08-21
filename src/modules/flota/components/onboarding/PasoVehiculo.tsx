import { Controller, useForm, type FieldError, type UseFormReturn } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useTranslation } from 'react-i18next'
import { AreaTexto } from '@/shared/ui/AreaTexto'
import { Boton } from '@/shared/ui/Boton'
import { Campo } from '@/shared/ui/Campo'
import { Input } from '@/shared/ui/Input'
import {
  parseApiError,
  resolveApiErrorMessage,
  resolveApiFieldErrors,
} from '@/shared/errors/parse-api-error'
import type { VehiculoDetalleDto } from '@/services/contracts/flota'
import { Aviso } from '@/shared/ui/Aviso'
import { CampoMarcaYModelo } from './CampoMarcaYModelo'
import { CampoSelectCatalogo } from './CampoSelectCatalogo'
import { useCatalogoTipos } from '../../hooks/useCatalogoTipos'
import { useCrearVehiculo } from '../../hooks/useCrearVehiculo'
import {
  ANIO_MAXIMO,
  ANIO_MINIMO,
  aCrearVehiculoRequest,
  crearVehiculoSchema,
  valoresInicialesCrearVehiculo,
  type CrearVehiculoFormulario,
} from '../../schemas/crear-vehiculo'

/**
 * Marca los errores que puso el SERVIDOR, para no volver a traducirlos: ya vienen resueltos desde
 * su `message_key`. Los de Zod, en cambio, son claves y sí se traducen.
 */
const TIPO_ERROR_SERVIDOR = 'servidor'

/**
 * PASO 1 DEL WIZARD — y el único que persiste.
 *
 * Un solo `POST /api/flota/vehiculos`. Cuando responde 201 el vehículo YA EXISTE y ya es consultable
 * en el listado: abandonar el wizard acá no deshace nada, y no hay ningún "guardar al final"
 * (A-14 / DA-ON-01).
 *
 * LOS TRES ERRORES DEL SUBMIT NO SON INTERCAMBIABLES, y por eso hay tres ramas:
 *  - `flota.vehiculo.patente_duplicada` (409) → INLINE junto al campo Patente, formulario intacto.
 *    Es un error de UN CAMPO: el usuario cambia la patente y reenvía.
 *  - `flota.vehiculo.datos_canonicos_invalidos` (400) y `flota.vehiculo.conflicto_canonico` (409) →
 *    error de INPUT corregible, pero el backend no dice qué campo: banner, SIN botón de reintento
 *    (reenviar lo mismo va a fallar igual).
 *  - `flota.vehiculo.canonico_no_creable` (500) → el Canónico NO RESPONDIÓ. No es culpa del usuario
 *    y los datos están bien: banner recuperable CON REINTENTO. Y no queda fila fantasma — el write
 *    canónico va primero, así que si falla no se persistió nada local.
 *
 * El mockup simula éxito siempre (`setTimeout` + redirect): eso no se porta.
 */
export function PasoVehiculo({ onCreado }: { onCreado: (vehiculo: VehiculoDetalleDto) => void }) {
  const { t } = useTranslation(['flota', 'common'])
  const tipos = useCatalogoTipos()
  const mutacion = useCrearVehiculo()

  const form = useForm<CrearVehiculoFormulario>({
    resolver: zodResolver(crearVehiculoSchema),
    defaultValues: valoresInicialesCrearVehiculo,
  })

  /**
   * Los mensajes de Zod son CLAVES i18n (los mismos `WithErrorCode` del Validator backend); los del
   * servidor llegan YA RESUELTOS. Se distinguen por el `type` que se les puso al setearlos, no por
   * adivinar si el string parece una clave: una frase con puntos también "parece" una clave.
   */
  const mensajeDe = (error: FieldError | undefined) => {
    if (!error?.message) return undefined
    return error.type === TIPO_ERROR_SERVIDOR
      ? error.message
      : t(error.message, { defaultValue: error.message })
  }

  const enviar = form.handleSubmit((valores) => {
    mutacion.mutate(aCrearVehiculoRequest(valores), {
      onSuccess: onCreado,
      onError: (error) => {
        const apiError = parseApiError(error)

        if (apiError.code === 'flota.vehiculo.patente_duplicada') {
          form.setError('patente', {
            type: TIPO_ERROR_SERVIDOR,
            message: resolveApiErrorMessage(apiError, t),
          })
          return
        }

        // Un 400 de FluentValidation sí trae el campo ofensor: se devuelve a su input.
        const errores = resolveApiFieldErrors(apiError, t)
        for (const [campo, mensaje] of Object.entries(errores)) {
          form.setError(campo as keyof CrearVehiculoFormulario, {
            type: TIPO_ERROR_SERVIDOR,
            message: mensaje,
          })
        }
      },
    })
  })

  const registroPatente = form.register('patente')

  return (
    <form
      className="flex flex-col gap-4 rounded-xl border border-borde bg-superficie-1 p-6"
      onSubmit={(evento) => {
        evento.preventDefault()
        void enviar()
      }}
      noValidate
    >
      <AvisoDelSubmit error={mutacion.error} reintentando={mutacion.isPending} onReintentar={enviar} />

      <Campo
        etiqueta={t('flota:onboarding.campos.patente')}
        requerido
        error={mensajeDe(form.formState.errors.patente)}
      >
        {(control) => (
          <Input
            {...control}
            {...registroPatente}
            mono
            autoFocus
            maxLength={20}
            placeholder={t('flota:onboarding.campos.patentePlaceholder')}
            invalido={form.formState.errors.patente !== undefined}
            // Auto-uppercase mientras se tipea: se muta el valor del DOM ANTES de que lo lea react-
            // hook-form, así lo que se ve y lo que se guarda son el mismo string.
            onChange={(evento) => {
              evento.target.value = evento.target.value.toUpperCase()
              void registroPatente.onChange(evento)
            }}
          />
        )}
      </Campo>

      {/*
        Marca + Modelo salen juntos del catálogo canónico (la cascada). Están acoplados —cambiar la
        marca invalida el modelo— así que viven en un componente propio.
      */}
      <CampoMarcaYModelo form={form} mensajeDe={mensajeDe} />

      <div className="grid gap-4 sm:grid-cols-2">
        <Campo
          etiqueta={t('flota:onboarding.campos.anio')}
          requerido
          ayuda={t('flota:onboarding.campos.anioAyuda', { min: ANIO_MINIMO, max: ANIO_MAXIMO })}
          error={mensajeDe(form.formState.errors.anio)}
        >
          {(control) => (
            <Input
              {...control}
              {...form.register('anio')}
              mono
              inputMode="numeric"
              maxLength={4}
              invalido={form.formState.errors.anio !== undefined}
            />
          )}
        </Campo>

        <Controller
          control={form.control}
          name="tipo"
          render={({ field, fieldState }) => (
            <CampoSelectCatalogo
              etiqueta={t('flota:onboarding.campos.tipo')}
              opciones={(tipos.data ?? []).map((tipo) => ({
                // El VALOR es el código snake_case del catálogo; la etiqueta es lo traducido. Lo
                // que viaja al backend es siempre el código.
                valor: tipo.codigo,
                etiqueta: t(`flota:tipoVehiculo.${tipo.codigo}`, { defaultValue: tipo.nombre }),
              }))}
              valor={field.value}
              onCambio={field.onChange}
              cargando={tipos.isPending}
              fallo={tipos.isError}
              error={mensajeDe(fieldState.error)}
              placeholder={t('flota:onboarding.campos.tipoPlaceholder')}
              avisoVacio={t('flota:onboarding.catalogo.tiposVacios')}
            />
          )}
        />
      </div>

      <OpcionalesColapsados form={form} mensajeDe={mensajeDe} />

      <Boton type="submit" tamano="lg" anchoCompleto cargando={mutacion.isPending}>
        {mutacion.isPending
          ? t('flota:onboarding.creando')
          : t('flota:onboarding.crearYContinuar')}
      </Boton>
    </form>
  )
}

/** Banner de los errores que NO son de un campo puntual. Solo el 500 del Canónico ofrece reintento. */
function AvisoDelSubmit({
  error,
  reintentando,
  onReintentar,
}: {
  error: unknown
  reintentando: boolean
  onReintentar: () => void
}) {
  const { t } = useTranslation(['flota', 'common'])

  if (!error) return null

  const apiError = parseApiError(error)

  // La patente duplicada ya se pintó inline junto a su campo: repetirla arriba sería decir dos veces
  // lo mismo y empujar el formulario hacia abajo.
  if (apiError.code === 'flota.vehiculo.patente_duplicada') return null

  const esReintentable = apiError.code === 'flota.vehiculo.canonico_no_creable'

  return (
    <Aviso
      titulo={resolveApiErrorMessage(apiError, t)}
      mensaje={esReintentable ? t('flota:onboarding.errores.sinFilaFantasma') : null}
      trazaId={apiError.traceId}
      accion={
        esReintentable ? (
          <Boton
            variante="secundaria"
            tamano="sm"
            cargando={reintentando}
            onClick={() => onReintentar()}
          >
            {t('flota:comun.reintentar')}
          </Boton>
        ) : null
      }
    />
  )
}

/**
 * Opcionales del request en una sección COLAPSADA (DA-ON-03). `<details>` nativo: es accesible por
 * teclado y por lector de pantalla sin una línea de JS.
 *
 * `combustible` NO se renderiza: no tiene columna fuente ni en Flota ni en el canónico
 * (PENDIENTE C-6), y el backend lo acepta pero no lo persiste. Un campo que se pierde en silencio es
 * peor que un campo ausente.
 */
function OpcionalesColapsados({
  form,
  mensajeDe,
}: {
  form: UseFormReturn<CrearVehiculoFormulario>
  mensajeDe: (error: FieldError | undefined) => string | undefined
}) {
  const { t } = useTranslation(['flota', 'common'])

  return (
    <details className="rounded-lg border border-borde bg-superficie-2 px-4 py-3">
      <summary className="cursor-pointer text-sm font-medium text-fg-primario">
        {t('flota:onboarding.opcionales.titulo')}
      </summary>

      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        <Campo
          etiqueta={t('flota:onboarding.campos.vin')}
          error={mensajeDe(form.formState.errors.vin)}
        >
          {(control) => (
            <Input
              {...control}
              {...form.register('vin')}
              mono
              maxLength={17}
              invalido={form.formState.errors.vin !== undefined}
            />
          )}
        </Campo>

        <Campo etiqueta={t('flota:onboarding.campos.color')}>
          {(control) => <Input {...control} {...form.register('color')} />}
        </Campo>

        <Campo
          etiqueta={t('flota:onboarding.campos.kilometrajeInicial')}
          error={mensajeDe(form.formState.errors.kilometrajeInicial)}
        >
          {(control) => (
            <Input
              {...control}
              {...form.register('kilometrajeInicial')}
              mono
              inputMode="numeric"
              invalido={form.formState.errors.kilometrajeInicial !== undefined}
            />
          )}
        </Campo>

        <Campo etiqueta={t('flota:onboarding.campos.notasOperativas')} className="sm:col-span-2">
          {(control) => <AreaTexto {...control} {...form.register('notasOperativas')} filas={3} />}
        </Campo>
      </div>
    </details>
  )
}
