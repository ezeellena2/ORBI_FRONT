import { Controller, useForm, useWatch } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useTranslation } from 'react-i18next'
import { AreaTexto } from '@/shared/ui/AreaTexto'
import { Boton } from '@/shared/ui/Boton'
import { Campo } from '@/shared/ui/Campo'
import { GrupoRadio, type OpcionRadio } from '@/shared/ui/GrupoRadio'
import { Modal } from '@/shared/ui/Modal'
import { parseApiError, resolveApiErrorMessage } from '@/shared/errors/parse-api-error'
import type { DispositivoListItemDto, EstadoStockDispositivo } from '@/services/contracts/flota'
import { AvisoOperacion } from '../AvisoOperacion'
import { DispositivoBadgeStock } from './DispositivoBadgeStock'
import { claveDeStock, destinosDeStock, type DestinoDeStock } from './detalle/vocabulario-stock'
import { useCambiarEstadoStockDispositivo } from '../../hooks/useCambiarEstadoStockDispositivo'
import {
  aCambiarEstadoStockRequest,
  cambiarEstadoStockSchema,
  type CambiarEstadoStockFormulario,
} from '../../schemas/cambiar-estado-stock'

/**
 * Modal "Cambiar estado de stock" — `POST .../estado-stock`, permiso
 * `flota.dispositivos.gestionar-stock`.
 *
 * **Implementacion UNICA**, usada por el kebab del listado y por el menu del detalle. Antes habia
 * dos copias (`dispositivos/` y `dispositivos/detalle/`) y cada correccion del contrato habia que
 * aplicarla dos veces. Toma `DispositivoListItemDto` porque `DispositivoDetalleDto` lo extiende: los
 * 4 campos que usa (`id`, `alias`, `imei`, `estadoOperativo`, `vehiculoInstalado`) estan en el
 * listado.
 *
 * ── LOS RADIOS SON 3, NO 4 (ficha §7 + D-S3-9) ────────────────────────────────────────────────
 *  - `en_stock` y `en_reparacion`: los UNICOS destinos que este endpoint admite. Se ofrecen solo
 *    cuando la maquina de estados los permite desde el estado actual (`datos.md` §3.3).
 *  - `instalado`: se muestra **siempre deshabilitado** con su nota. Existe en el catalogo pero no
 *    es alcanzable por request: se llega asignando el equipo a un vehiculo (DA-DL-05). Se muestra a
 *    proposito — el usuario tiene que entender que el estado existe y COMO se llega.
 *  - `dado_de_baja`: **NO se dibuja**. La ficha es literal ("no va en este modal") y `api.md` acota
 *    los destinos admitidos a dos. Esta gateado por otro permiso (`flota.dispositivos.eliminar` vs
 *    `gestionar-stock`): ofrecerlo aca ejecutaba una baja identica con el permiso equivocado. Su
 *    lugar es la accion "Dar de baja" / "Eliminar".
 *
 * El tipo `CambiarEstadoStockRequest` excluye los dos por `Exclude<...>`, asi que agregarlos "porque
 * faltan" no compila.
 *
 * ── EL 409 NO CIERRA EL MODAL ─────────────────────────────────────────────────────────────────
 * Con `flota.dispositivo.transicion_stock_invalida` o
 * `flota.dispositivo.reparacion_con_asignacion_activa` el modal se queda abierto mostrando el
 * motivo, con lo elegido todavia cargado. Cerrarlo como si hubiera funcionado dejaria el badge sin
 * cambiar y sin explicacion.
 */

/** Orden de lectura de los radios. No es un enum: `dado_de_baja` no esta y no es un olvido. */
const ESTADOS_VISIBLES: EstadoStockDispositivo[] = ['en_stock', 'instalado', 'en_reparacion']

export function ModalCambiarEstadoStock({
  dispositivo,
  abierto,
  onCerrar,
}: {
  dispositivo: DispositivoListItemDto | null
  abierto: boolean
  onCerrar: () => void
}) {
  // Montado solo mientras esta abierto: el formulario arranca desde el estado ACTUAL en cada
  // apertura y el error del intento anterior no reaparece.
  if (!abierto || dispositivo === null) return null

  return <Formulario dispositivo={dispositivo} onCerrar={onCerrar} />
}

function Formulario({
  dispositivo,
  onCerrar,
}: {
  dispositivo: DispositivoListItemDto
  onCerrar: () => void
}) {
  const { t } = useTranslation(['flota', 'common'])
  const mutacion = useCambiarEstadoStockDispositivo(dispositivo.id)

  const destinos = destinosDeStock(dispositivo.estadoOperativo)

  const form = useForm<CambiarEstadoStockFormulario>({
    resolver: zodResolver(cambiarEstadoStockSchema),
    defaultValues: {
      // Sin destinos el menu ya deshabilita la accion, asi que este modal no llega a abrirse; el
      // fallback existe para que el tipo cierre sin un `!` que mienta sobre la nulabilidad.
      estadoNuevo: destinos[0] ?? 'en_reparacion',
      motivo: '',
    },
  })

  const opciones: OpcionRadio[] = ESTADOS_VISIBLES.map((estado) => ({
    valor: estado,
    etiqueta: t(`flota:${claveDeStock(estado)}`, { defaultValue: estado }),
    descripcion:
      estado === 'instalado' ? t('flota:dispositivosListado.estadoStock.instaladoNota') : undefined,
    // `instalado` nunca es elegible por este request; el resto, solo si la maquina de estados lo
    // admite desde el actual (cambiar a lo mismo tampoco es una transicion).
    deshabilitada: !destinos.includes(estado as DestinoDeStock),
  }))

  const errorGeneral = mutacion.error
    ? resolveApiErrorMessage(parseApiError(mutacion.error), t)
    : null

  const enviar = form.handleSubmit((valores) => {
    mutacion.mutate(aCambiarEstadoStockRequest(valores), {
      onSuccess: () => {
        mutacion.reset()
        onCerrar()
      },
    })
  })

  // `useWatch`, no `form.watch()`: `watch()` devuelve una funcion que el compilador de React no
  // puede memorizar sin arriesgar UI vieja, y el lint del repo la rechaza.
  const estadoNuevo = useWatch({ control: form.control, name: 'estadoNuevo' })

  // Los mensajes de Zod son CLAVES i18n (`validation.motivo.max_length`, el mismo `WithErrorCode`
  // que emite el validator del backend), asi que se traducen. `defaultValue` cubre el caso de que
  // llegue un texto ya resuelto.
  const errorMotivo = form.formState.errors.motivo?.message
  const mensajeDeMotivo =
    errorMotivo === undefined ? undefined : t(errorMotivo, { defaultValue: errorMotivo })

  return (
    <Modal
      abierto
      onCerrar={onCerrar}
      cierrePorFuera={false}
      titulo={t('flota:dispositivosListado.estadoStock.titulo')}
      // `alias` es nullable (D-S3-12): sin el, el subtitulo cae al IMEI, que es la identidad real.
      descripcion={dispositivo.alias ?? dispositivo.imei}
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
            {t('flota:dispositivosListado.estadoStock.confirmar')}
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

        <div className="flex items-center gap-2 text-sm text-fg-secundario">
          {t('flota:dispositivosListado.estadoStock.estadoActual')}
          <DispositivoBadgeStock estado={dispositivo.estadoOperativo} />
        </div>

        {destinos.length === 0 ? (
          <p className="text-sm text-fg-secundario">
            {t('flota:dispositivosListado.estadoStock.sinDestinos')}
          </p>
        ) : null}

        <Controller
          control={form.control}
          name="estadoNuevo"
          render={({ field }) => (
            <Campo etiqueta={t('flota:dispositivosListado.estadoStock.nuevoEstado')} requerido>
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

        {/*
          `en_reparacion` con el GPS todavia instalado NO lo bloquea la maquina de estados (esa celda
          de la matriz esta permitida): lo bloquea la asignacion vigente, con su propio 409
          `flota.dispositivo.reparacion_con_asignacion_activa` (D-S3-8). Se avisa ANTES de confirmar
          para que el rechazo no llegue como sorpresa.
        */}
        {estadoNuevo === 'en_reparacion' && dispositivo.vehiculoInstalado !== null ? (
          <p className="rounded-lg border border-dashed border-borde bg-superficie-2 px-3 py-2 text-xs text-fg-secundario">
            {t('flota:dispositivoDetalle.estadoStock.avisoReparacionInstalado')}
          </p>
        ) : null}

        {/*
          El error del campo SI se cablea: el schema replica el `max(500)` del validator del backend
          y sin `error` el formulario quedaba trabado en silencio — con mas de 500 caracteres
          `handleSubmit` no llama al callback, o sea que "Confirmar" no hacia absolutamente nada y no
          aparecia un solo mensaje. Era el unico formulario del frente que no cableaba sus errores de
          campo.
        */}
        <Campo
          etiqueta={t('flota:dispositivosListado.estadoStock.motivo')}
          ayuda={t('flota:dispositivosListado.estadoStock.motivoAyuda')}
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
