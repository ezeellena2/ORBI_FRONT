import { useState } from 'react'
import { Controller, useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useQueryClient } from '@tanstack/react-query'
import { Boton } from '@/shared/ui/Boton'
import { Campo } from '@/shared/ui/Campo'
import { GrupoRadio } from '@/shared/ui/GrupoRadio'
import { Modal } from '@/shared/ui/Modal'
import type { AsignacionVehiculoConductorDto } from '@/services/contracts/flota'
import { AvisoOperacion } from '../AvisoOperacion'
import { flotaKeysAfectadasPorAsignacionConductor } from '../../query-keys'
import { useAsignarConductor } from '../../hooks/useAsignarConductor'
import { useDesasignarConductor } from '../../hooks/useDesasignarConductor'
import {
  aAsignarConductorVehiculoRequest,
  asignarConductorVehiculoSchema,
  valoresInicialesAsignarConductor,
  type AsignarConductorVehiculoFormulario,
} from '../../schemas/asignar-conductor-vehiculo'
import { AvisoErrorAsignacionConductor } from './AvisoErrorAsignacionConductor'
import { SelectorConductor } from './SelectorConductor'
import {
  MOTIVO_CIERRE_POR_CAMBIO,
  pasosDeCambioDeConductor,
} from './vocabulario-conductor-asignacion'

/**
 * Modal "Asignar / cambiar conductor" **visto desde el vehiculo** (`f-07` §2) —
 * `POST /api/flota/vehiculos/{vehiculoFlotaId}/asignaciones/conductor`, permiso
 * **`flota.vehiculos.asignar-conductor`** (grupo VEHICULOS: la accion vive sobre el vinculo).
 *
 * Es el gemelo inverso de `ModalAsignarVehiculo` (mismo endpoint, el otro extremo elegido) y el
 * hermano de `ModalAsociarDispositivo`. **No es su copia**, y la diferencia es la que sigue.
 *
 * ── ASIGNAR Y CAMBIAR **NO** SON LA MISMA OPERACION ACA ───────────────────────────────────────
 * En dispositivos si lo son: el `POST` cierra la asignacion anterior por su cuenta (D-S3-14). El
 * `POST` de CONDUCTOR **no cierra nada** — si el vehiculo ya tiene principal, responde 409
 * `flota.vehiculo.ya_tiene_principal`. Por eso cambiar son **DOS requests sin atomicidad**
 * (`api.md` §Conductores): `DELETE` de la vigente y despues `POST` de la nueva.
 *
 * **El caso feo es real y la pantalla no se lo traga**: si el `DELETE` sale bien y el `POST` falla,
 * el vehiculo queda SIN conductor. En ese estado el modal lo dice con todas las letras y el reintento
 * **no repite el `DELETE`** (`pasosDeCambioDeConductor`), porque repetirlo daria 404
 * `flota.asignacion.no_existe` y taparia el problema original con un error nuevo.
 *
 * ── DE DONDE SALE LA ASIGNACION VIGENTE (y por que casi siempre es `null`) ─────────────────────
 * Del lado del vehiculo **no hay ningun `GET` que la exponga**: `GET /vehiculos/{id}/asignaciones` no
 * esta implementado (B-19) y `VehiculoDetalleDto.conductoresAsignados` viene `[]` en el 100% de las
 * respuestas. La unica fuente es la respuesta del `POST` de ESTA sesion. Asi que `asignacionVigente`
 * en `null` significa "no la conocemos", **no** "no existe": si el vehiculo ya tenia principal, el
 * gate real es el 409 del indice unico parcial, y el aviso de error lo explica.
 *
 * ── LO QUE NO SE PROMETE ──────────────────────────────────────────────────────────────────────
 *  - **No se le avisa al conductor.** La asignacion **no coordina con PlataformaCanonica** (B-20,
 *    abierta): `vehiculo_conductores` no se entera, el Canonico sigue diciendo "no hay principal" y
 *    **Notificaciones no manda nada**. La operacion ES un exito real en Flota; lo que no se hace es
 *    prometer un aviso que nadie manda.
 *  - **Asignar NO pone al conductor `en_servicio`**: eso es una transicion explicita, con su modal.
 *  - **No hay "fecha efectiva"**: `AsignarConductorRequest` no la declara (ver el schema).
 */
export function ModalAsignarConductor({
  vehiculoFlotaId,
  identificacionVehiculo,
  asignacionVigente,
  identidadVigente,
  abierto,
  onCerrar,
  onAsignado,
  onVigenteCerrada,
}: {
  vehiculoFlotaId: string
  /** Patente o alias, ya resuelto. Va en el subtitulo para que se vea sobre que se esta operando. */
  identificacionVehiculo: string
  /**
   * La asignacion vigente CONOCIDA (la de esta sesion), o `null`. Con ella, confirmar cierra primero
   * y asigna despues; sin ella es un solo `POST`.
   */
  asignacionVigente: AsignacionVehiculoConductorDto | null
  /** Identidad del conductor que se va a reemplazar, si se conoce. */
  identidadVigente: string | null
  abierto: boolean
  onCerrar: () => void
  /**
   * Recibe la asignacion creada Y la identidad elegida, NO un aviso vacio: su `asignacionId` es la
   * unica fuente del id que el `DELETE` pide en la URL, y la identidad no viaja en la respuesta del
   * `POST` (solo trae ids y fechas). Un caller que los tire deja al usuario sin forma de quitar al
   * conductor que acaba de poner, y con una tarjeta sin nombre.
   */
  onAsignado: (asignacion: AsignacionVehiculoConductorDto, identidad: string | null) => void
  /**
   * El `DELETE` de la vigente salio bien. Se avisa **apenas ocurre**, no al final: si despues falla
   * el `POST`, el caller ya no debe seguir creyendo que esa asignacion existe — ofrecer "Quitar"
   * sobre un `asignacionId` ya cerrado da 404 `flota.asignacion.no_existe` y convierte un boton
   * habilitado en uno que solo puede fallar.
   */
  onVigenteCerrada: () => void
}) {
  // Montado solo mientras esta abierto: la seleccion arranca vacia en cada apertura, el error del
  // intento anterior no reaparece y —lo importante— `cierreHecho` vuelve a false para un cambio nuevo.
  if (!abierto) return null

  return (
    <Formulario
      vehiculoFlotaId={vehiculoFlotaId}
      identificacionVehiculo={identificacionVehiculo}
      asignacionVigente={asignacionVigente}
      identidadVigente={identidadVigente}
      onCerrar={onCerrar}
      onAsignado={onAsignado}
      onVigenteCerrada={onVigenteCerrada}
    />
  )
}

function Formulario({
  vehiculoFlotaId,
  identificacionVehiculo,
  asignacionVigente,
  identidadVigente,
  onCerrar,
  onAsignado,
  onVigenteCerrada,
}: {
  vehiculoFlotaId: string
  identificacionVehiculo: string
  asignacionVigente: AsignacionVehiculoConductorDto | null
  identidadVigente: string | null
  onCerrar: () => void
  onAsignado: (asignacion: AsignacionVehiculoConductorDto, identidad: string | null) => void
  onVigenteCerrada: () => void
}) {
  const { t } = useTranslation(['flota', 'common'])
  const queryClient = useQueryClient()

  const cierre = useDesasignarConductor(vehiculoFlotaId)
  const asignacion = useAsignarConductor(vehiculoFlotaId)

  /**
   * FOTO de la asignación vigente al ABRIR, no la prop viva.
   *
   * El modal le avisa al caller apenas cierra la vigente, y el caller la olvida — así que la prop se
   * vuelve `null` a mitad de la operación. Sin esta foto, el aviso de "quedó a medias" perdería el
   * nombre del conductor que acabamos de sacar, justo en el mensaje donde más hace falta. El modal
   * se monta solo mientras está abierto, así que la foto se renueva en cada apertura.
   */
  const [vigenteAlAbrir] = useState(asignacionVigente)
  const [identidadAlAbrir] = useState(identidadVigente)

  /**
   * El cierre YA se ejecutó con éxito en este modal. Es el estado que hace que un reintento no
   * repita el `DELETE` — y también el que habilita el aviso de "quedó a medias", que es el único
   * momento en que el vehículo está sin conductor por culpa nuestra.
   */
  const [cierreHecho, setCierreHecho] = useState(false)

  /** Identidad del conductor elegido, para que la ficha pueda nombrarlo sin pedir su detalle. */
  const [identidadElegida, setIdentidadElegida] = useState<string | null>(null)

  const esCambio = vigenteAlAbrir !== null

  const form = useForm<AsignarConductorVehiculoFormulario>({
    resolver: zodResolver(asignarConductorVehiculoSchema),
    defaultValues: valoresInicialesAsignarConductor(),
  })

  const enviar = form.handleSubmit(async (valores) => {
    const pasos = pasosDeCambioDeConductor(esCambio, cierreHecho)

    try {
      if (pasos.includes('cerrar') && vigenteAlAbrir !== null) {
        await cierre.mutateAsync({
          asignacionId: vigenteAlAbrir.asignacionId,
          motivo: MOTIVO_CIERRE_POR_CAMBIO,
        })
        setCierreHecho(true)
        // Se avisa ACÁ, no al final: si el `POST` de abajo falla, la asignación vieja ya no existe y
        // el caller no debe seguir ofreciéndola.
        onVigenteCerrada()
      }

      const creada = await asignacion.mutateAsync(aAsignarConductorVehiculoRequest(valores))

      asignacion.reset()
      cierre.reset()
      onAsignado(creada, identidadElegida)
      onCerrar()
    } catch {
      // El error ya quedó en el estado de la mutation que falló y se pinta abajo. Se traga acá para
      // que `mutateAsync` no genere un rechazo sin manejar: el modal NO se cierra, y con la selección
      // cargada el usuario puede reintentar exactamente lo que falta.
    }
  })

  // Lo que arregla un 409 de negocio no es reintentar: es volver a mirar. Refresca las 2 superficies
  // y el selector se repuebla solo.
  const actualizar = () => {
    for (const key of flotaKeysAfectadasPorAsignacionConductor()) {
      void queryClient.invalidateQueries({ queryKey: key })
    }
    asignacion.reset()
    cierre.reset()
  }

  const enCurso = cierre.isPending || asignacion.isPending
  const errorSeleccion = form.formState.errors.conductorFlotaId?.message

  return (
    <Modal
      abierto
      onCerrar={onCerrar}
      cierrePorFuera={false}
      tamano="lg"
      titulo={
        esCambio
          ? t('flota:asignacionConductor.cambiarTitulo')
          : t('flota:asignacionConductor.titulo')
      }
      descripcion={identificacionVehiculo}
      pie={
        <>
          <Boton variante="secundaria" onClick={onCerrar} deshabilitado={enCurso}>
            {t('flota:asignacionConductor.cancelar')}
          </Boton>
          <Boton onClick={() => void enviar()} cargando={enCurso}>
            {enCurso
              ? t('flota:asignacionConductor.asignando')
              : t('flota:asignacionConductor.asignar')}
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
        {/*
          EL AVISO MAS IMPORTANTE DEL MODAL. Solo aparece cuando el cierre salió bien y la asignación
          no: en ese momento el vehículo está REALMENTE sin conductor, y el usuario tiene que saberlo
          antes de cerrar la ventana. Va arriba del error técnico porque describe el estado del
          sistema, no la causa del fallo.
        */}
        {cierreHecho && asignacion.error ? (
          <AvisoOperacion
            titulo={t('flota:asignacionConductor.cambioAMediasTitulo')}
            mensaje={t('flota:asignacionConductor.cambioAMedias', {
              nombre: identidadAlAbrir ?? t('flota:asignacionConductor.identidadNoDisponible'),
            })}
          />
        ) : null}

        {cierre.error ? (
          <AvisoErrorAsignacionConductor error={cierre.error} onActualizar={actualizar} />
        ) : null}
        {asignacion.error ? (
          <AvisoErrorAsignacionConductor error={asignacion.error} onActualizar={actualizar} />
        ) : null}

        <p className="text-sm text-fg-secundario">
          {esCambio
            ? t('flota:asignacionConductor.cambiarDescripcion')
            : t('flota:asignacionConductor.descripcion')}
        </p>

        {/*
          Se avisa ANTES de confirmar, no después: cambiar son dos requests sin transacción y el
          usuario tiene derecho a saber que el paso intermedio deja al vehículo sin conductor.
        */}
        {esCambio ? (
          <p className="rounded-lg border border-advertencia/40 bg-advertencia-fondo px-3 py-2 text-xs text-fg-secundario">
            {t('flota:asignacionConductor.cambiarNoAtomico')}
          </p>
        ) : null}

        <Controller
          control={form.control}
          name="conductorFlotaId"
          render={({ field }) => (
            <Campo
              etiqueta={t('flota:asignacionConductor.conductor')}
              error={
                errorSeleccion === undefined
                  ? undefined
                  : t(errorSeleccion, { defaultValue: errorSeleccion })
              }
              requerido
            >
              {(control) => (
                <SelectorConductor
                  control={control}
                  valor={field.value}
                  onCambio={(id, identidad) => {
                    field.onChange(id)
                    setIdentidadElegida(identidad)
                  }}
                  deshabilitado={enCurso}
                  accionSinConductores={
                    <Boton
                      variante="secundaria"
                      tamano="sm"
                      render={<Link to="/app/flota/conductores" />}
                    >
                      {t('flota:asignacionConductor.sinDisponiblesCta')}
                    </Boton>
                  }
                />
              )}
            </Campo>
          )}
        />

        <Controller
          control={form.control}
          name="rol"
          render={({ field }) => (
            <Campo
              etiqueta={t('flota:asignacionConductor.rol')}
              ayuda={t('flota:asignacionConductor.rolAyuda')}
              requerido
            >
              {(control) => (
                <GrupoRadio
                  {...control}
                  orientacion="horizontal"
                  valor={field.value}
                  onCambio={field.onChange}
                  opciones={[
                    { valor: 'principal', etiqueta: t('flota:asignacionConductor.rolPrincipal') },
                    { valor: 'secundario', etiqueta: t('flota:asignacionConductor.rolSecundario') },
                  ]}
                />
              )}
            </Campo>
          )}
        />

        <p className="rounded-lg border border-dashed border-borde bg-superficie-2 px-3 py-2 text-xs text-fg-secundario">
          {t('flota:asignacionConductor.noAvisaAlConductor')}
        </p>
      </form>
    </Modal>
  )
}
