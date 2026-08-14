import { useState, type ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { Search } from 'lucide-react'
import { Boton } from '@/shared/ui/Boton'
import type { PropsControlCampo } from '@/shared/ui/Campo'
import { GrupoRadio, type OpcionRadio } from '@/shared/ui/GrupoRadio'
import { Input } from '@/shared/ui/Input'
import { Skeleton } from '@/shared/ui/Skeleton'
import { parseApiError, resolveApiErrorMessage } from '@/shared/errors/parse-api-error'
import type { VehiculoListItemDto, VehiculosPageQuery } from '@/services/contracts/flota'
import { useVehiculos } from '../../hooks/useVehiculos'

/**
 * Lista de seleccion (radio) de los vehiculos de la organizacion. Es el UNICO componente que elige
 * vehiculo en el modulo, y lo comparten los DOS sentidos de asignacion:
 *  - **conductor → vehiculo** (`ModalAsignarVehiculo`, `f-06`): el conductor ya esta elegido;
 *  - **dispositivo → vehiculo** (`ModalAsociarAVehiculo`, `f-07`): el GPS ya esta elegido.
 *
 * Vive en `components/conductores/` porque fue su primer consumidor, igual que
 * `SelectorDispositivoEnStock` vive en `components/dispositivos/` y lo importan conductores y el
 * wizard. Un segundo selector propio por pantalla es como se desincronizan los estados de vacio.
 *
 * ── ⚠️ EL PRE-FILTRADO NO ES EL MISMO EN LOS DOS SENTIDOS ─────────────────────────────────────
 * `situacion` **existe y filtra de verdad** desde el 2026-08-12 (slice-05 `f-02`: los 4 valores,
 * `EXISTS`/`NOT EXISTS` intra-schema, sin depender de Telemetria). Pero solo **uno** de sus valores
 * describe exactamente a los candidatos de una de las dos operaciones:
 *
 *  - **Dispositivo → vehiculo** (`soloSinDispositivoGps`): el vinculo vehiculo↔GPS es **1:1**, asi
 *    que "vehiculos sin dispositivo" ES el conjunto de candidatos, sin recorte ni sobra. Se filtra
 *    server-side y la lista lo dice.
 *  - **Conductor → vehiculo** (default): **no se filtra**, y no es un olvido. `sin_conductor` es "sin
 *    **ninguna** asignacion vigente", y ese modal tambien asigna rol **secundario**: un vehiculo que
 *    hoy tiene solo un secundario admite perfectamente un principal —el indice unico es por
 *    (vehiculo, principal, abierta)— y quedaria **fuera de la lista sin que el usuario sepa por que**.
 *    El filtro que haria falta es "sin conductor PRINCIPAL", y ese valor **no existe** en el
 *    vocabulario de `situacion`. PENDIENTE del PO + `api.md`; hasta entonces, no se filtra.
 *
 * Tampoco se puede marcar fila por fila: `VehiculoListItemDto.dispositivo`, `.conductorPrincipal` y
 * `.conductoresCount` **siguen** viniendo `null` / `0` en el 100% de las respuestas (composicion
 * intra-schema que ningun slice tomo — su dueno declarado es el PO), asi que cualquier "sin GPS" o
 * "sin conductor" calculado localmente seria una **afirmacion falsa** sobre cada fila. El filtro SI
 * es confiable, porque el `EXISTS` corre del lado del server sobre la asignacion real.
 *
 * En los dos casos la operacion **decide el backend**: si el vehiculo elegido ya tiene principal
 * responde 409 `flota.vehiculo.ya_tiene_principal`, y si ya tiene GPS el `POST` lo reasigna. El
 * indice unico parcial es la fuente de verdad, no un `SELECT` previo que igual correria una carrera.
 *
 * ── EL BUSCADOR ES LOCAL, Y ESO NO ES UNA SIMPLIFICACION ──────────────────────────────────────
 * `GET /vehiculos` SI declara `patente` (busqueda parcial), pero mandarla por cada tecla dispara una
 * query nueva por render de la key: acá se filtra sobre la pagina ya cargada, igual que en el
 * selector de dispositivos, y cuando lo cargado no alcanza **se avisa** (`soloPrimeros`) en vez de
 * dejar creer que la lista esta completa.
 *
 * ── FORBIDDEN PROPIO ──────────────────────────────────────────────────────────────────────────
 * Esta lista se sirve con `flota.vehiculos.leer`, que **no es** el permiso de la accion
 * (`flota.vehiculos.asignar-conductor`). Un rol puede tener uno sin el otro: en ese caso el bloque
 * dice **el permiso literal que falta**, no el `code`, y no bloquea el modal entero.
 */

/**
 * Query de los candidatos. Constante de modulo A PROPOSITO, no un literal dentro del render: es la
 * key de React Query y un objeto recreado por render con los mismos valores hashea igual, pero
 * cualquier valor derivado del reloj o de un `.filter()` no — y eso ya produjo un bucle infinito de
 * requests en este modulo.
 *
 * `pageSize: 100` es el MAXIMO del contrato (`PageQuery`: > 100 se normaliza a 100).
 */
const QUERY_VEHICULOS_ASIGNABLES: VehiculosPageQuery = {
  soloActivos: true,
  page: 1,
  pageSize: 100,
  sortBy: 'Patente',
  sortDirection: 'Asc',
}

/**
 * La variante para instalar un GPS: los candidatos son EXACTAMENTE los vehiculos sin dispositivo
 * (el vinculo es 1:1). Es otra constante de modulo y no un spread dentro del render, por lo mismo:
 * las 2 keys quedan fijas y no dependen de cuantas veces se renderice el selector.
 */
const QUERY_VEHICULOS_SIN_DISPOSITIVO: VehiculosPageQuery = {
  ...QUERY_VEHICULOS_ASIGNABLES,
  situacion: 'sin_dispositivo_gps',
}

export function SelectorVehiculo({
  valor,
  onCambio,
  deshabilitado = false,
  soloSinDispositivoGps = false,
  accionSinVehiculos,
  control,
}: {
  /** `''` = sin elegir. */
  valor: string
  onCambio: (vehiculoFlotaId: string) => void
  deshabilitado?: boolean
  /**
   * `true` = pide al server solo los vehiculos **sin GPS instalado** (`situacion=sin_dispositivo_gps`).
   * Lo usa el sentido dispositivo→vehiculo, donde ese conjunto es exactamente el de candidatos.
   * Ver el bloque del encabezado: en el sentido conductor→vehiculo filtrar esconderia candidatos
   * validos, asi que el default es **no** filtrar.
   */
  soloSinDispositivoGps?: boolean
  /** CTA del vacio sin-datos (ir a vehiculos, dar de alta). Lo pone cada superficie. */
  accionSinVehiculos?: ReactNode
  /** Cableado `label` ↔ control ↔ error que entrega `Campo`. Va al grupo de radios. */
  control?: PropsControlCampo
}) {
  const { t } = useTranslation(['flota', 'common'])
  const [busqueda, setBusqueda] = useState('')
  const consulta = useVehiculos(
    soloSinDispositivoGps ? QUERY_VEHICULOS_SIN_DISPOSITIVO : QUERY_VEHICULOS_ASIGNABLES,
  )

  if (consulta.isPending) {
    return (
      <div className="flex flex-col gap-2" aria-busy="true">
        <span className="text-sm text-fg-secundario">
          {t('flota:asignacionVehiculo.cargando')}
        </span>
        <Skeleton variante="linea" repetir={4} className="h-9" />
      </div>
    )
  }

  if (consulta.isError) {
    const apiError = parseApiError(consulta.error)

    if (apiError.status === 403) {
      return (
        <Bloque>
          {t('flota:asignacionVehiculo.sinPermisoLectura', { permiso: 'flota.vehiculos.leer' })}
        </Bloque>
      )
    }

    return (
      <Bloque
        accion={
          <Boton variante="secundaria" tamano="sm" onClick={() => void consulta.refetch()}>
            {t('flota:comun.reintentar')}
          </Boton>
        }
      >
        {resolveApiErrorMessage(apiError, t)}
      </Bloque>
    )
  }

  const items = consulta.data.items
  const total = consulta.data.pagination.totalItems

  if (items.length === 0) {
    // Los 2 vacios llevan a acciones OPUESTAS: "no tenes vehiculos" se resuelve dando de alta uno;
    // "todos ya tienen GPS" se resuelve desasociando uno o dando de alta el vehiculo que falta. Un
    // solo mensaje para los dos deja al usuario buscando el problema en el lugar equivocado.
    return (
      <Bloque accion={accionSinVehiculos}>
        {soloSinDispositivoGps
          ? t('flota:asignacionVehiculo.sinDisponiblesSinDispositivo')
          : t('flota:asignacionVehiculo.sinDisponibles')}
      </Bloque>
    )
  }

  const termino = busqueda.trim().toLowerCase()
  const visibles = termino.length === 0 ? items : items.filter((item) => coincide(item, termino))

  const opciones: OpcionRadio[] = visibles.map((item) => ({
    valor: item.id,
    // `patente` es nullable (la proyeccion canonica puede no estar vigente): sin ella, la identidad
    // visible es el alias operativo, que es dato propio de Flota.
    etiqueta: item.patente ?? item.alias ?? t('flota:asignacionVehiculo.sinPatente'),
    descripcion: descripcionDe(item),
    deshabilitada: deshabilitado,
  }))

  return (
    <div className="flex flex-col gap-3">
      {/*
        Acá es donde el componente **dice** en que estado esta la lista. Sin esta linea, las dos
        variantes se ven identicas: una filtrada por el server y otra sin filtrar, y el usuario no
        tiene forma de saber cual esta mirando — que es exactamente lo que hace que "no aparece el
        que busco" se lea como un bug en vez de como un vehiculo que ya tiene GPS.
      */}
      <p className="text-xs text-fg-terciario">
        {soloSinDispositivoGps
          ? t('flota:asignacionVehiculo.listaFiltradaSinDispositivo')
          : t('flota:asignacionVehiculo.listaSinFiltrar')}
      </p>

      <Input
        value={busqueda}
        onChange={(evento) => setBusqueda(evento.target.value)}
        iconoIzq={Search}
        placeholder={t('flota:asignacionVehiculo.buscarPlaceholder')}
        aria-label={t('flota:asignacionVehiculo.buscar')}
        autoComplete="off"
        disabled={deshabilitado}
      />

      {visibles.length === 0 ? (
        <Bloque
          accion={
            <Boton variante="secundaria" tamano="sm" onClick={() => setBusqueda('')}>
              {t('flota:asignacionVehiculo.limpiarBusqueda')}
            </Boton>
          }
        >
          {t('flota:asignacionVehiculo.sinResultados')}
        </Bloque>
      ) : (
        <div className="max-h-72 overflow-y-auto rounded-lg border border-borde bg-superficie-2 p-3">
          {/*
            `valor` va TAL CUAL: `''` es un valor controlado valido y significa "nada elegido". El
            ternario que mandaba `undefined` mientras no habia eleccion hacia nacer el grupo NO
            controlado y pasar a controlado al primer click — el warning que Base UI reporta.
          */}
          <GrupoRadio {...control} opciones={opciones} valor={valor} onCambio={onCambio} />
        </div>
      )}

      {total > items.length ? (
        <p className="text-xs text-fg-terciario">
          {t('flota:asignacionVehiculo.soloPrimeros', { cantidad: items.length, total })}
        </p>
      ) : null}
    </div>
  )
}

/**
 * Bloque neutro para los estados sin lista (vacio, error, sin permiso). No es `EstadoError`: eso
 * ocupa la superficie entera y acá el formulario del modal sigue arriba y abajo.
 */
function Bloque({ children, accion }: { children: ReactNode; accion?: ReactNode }) {
  return (
    <div className="flex flex-col items-start gap-3 rounded-lg border border-dashed border-borde bg-superficie-2 px-4 py-4">
      <p className="text-sm text-fg-secundario">{children}</p>
      {accion}
    </div>
  )
}

/**
 * Lo que el usuario tiene delante para reconocer la unidad: marca, modelo y alias.
 *
 * **No dice si tiene conductor**: ese dato no llega (ver el bloque del encabezado). Es preferible una
 * descripcion mas pobre que una que afirme algo que el backend todavia no puede saber.
 */
function descripcionDe(item: VehiculoListItemDto): string {
  return [item.marca, item.modelo, item.alias]
    .filter((parte): parte is string => parte !== null && parte.trim().length > 0)
    .join(' · ')
}

function coincide(item: VehiculoListItemDto, termino: string): boolean {
  return [item.patente, item.alias, item.marca, item.modelo].some(
    (campo) => campo !== null && campo.toLowerCase().includes(termino),
  )
}
