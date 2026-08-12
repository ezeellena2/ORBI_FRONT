import { useState, type ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { Search } from 'lucide-react'
import { Boton } from '@/shared/ui/Boton'
import type { PropsControlCampo } from '@/shared/ui/Campo'
import { GrupoRadio, type OpcionRadio } from '@/shared/ui/GrupoRadio'
import { Input } from '@/shared/ui/Input'
import { Skeleton } from '@/shared/ui/Skeleton'
import { parseApiError, resolveApiErrorMessage } from '@/shared/errors/parse-api-error'
import type { ConductorListItemDto } from '@/services/contracts/flota'
import { useConductores } from '../../hooks/useConductores'
import {
  identidadDeConductor,
  QUERY_CONDUCTORES_SIN_VEHICULO,
} from './vocabulario-conductor-asignacion'

/**
 * Lista de seleccion (radio) de los conductores asignables, para darle uno a un vehiculo.
 *
 * Es el gemelo de `SelectorVehiculo` en el sentido inverso, y el de `SelectorDispositivoEnStock` del
 * lado del GPS. Lo usan las DOS superficies de `f-07` —el modal del tab Conductor y el paso 3 del
 * wizard— con la MISMA query key, asi que React Query sirve una sola entrada de cache: montar los dos
 * no dispara dos requests. Una segunda lista propia seria una segunda definicion de "quien es
 * elegible", y las dos se desincronizan.
 *
 * ── LA LISTA NO PROMETE QUE TODOS SEAN ASIGNABLES, Y LO DICE ──────────────────────────────────
 * El filtro `asignacion=sin_vehiculo` es real y el server lo declara. Lo que NO existe es un filtro
 * por estado operativo: `estado` de este listado mira la baja logica
 * (`activo`/`inactivo`/`licencia_*`), no el catalogo de 5 estados, asi que **un conductor
 * `suspendido` o con la licencia vencida puede aparecer** y el backend lo rechaza con 409 al asignar.
 * La fila lo muestra en su descripcion cuando el dato llega, pero el gate real es el 409 —no un
 * `SELECT` previo, que ademas correria una carrera.
 *
 * ── LA IDENTIDAD PUEDE FALTAR, Y NO ES UN ERROR ───────────────────────────────────────────────
 * `nombreCompleto` y `dni` son `null` cuando el gate de PII del `find-or-create` no dejo pasar la
 * identidad (`fronteras/plataforma-canonica.md` §5.1). La fila cae al legajo y, si tampoco hay, a un
 * marcador explicito: nunca imprime "null" ni afirma que la persona no tiene nombre.
 *
 * ── EL BUSCADOR ES LOCAL, Y ESO NO ES UNA SIMPLIFICACION ──────────────────────────────────────
 * `GET /conductores` **no declara ningun parametro de busqueda** (ni `search` ni `nombre`), asi que no
 * hay busqueda server-side que pedir. Se filtra sobre la pagina ya cargada y, cuando lo cargado no
 * alcanza, **se avisa** en vez de dejar creer que la lista esta completa.
 *
 * ── FORBIDDEN PROPIO ──────────────────────────────────────────────────────────────────────────
 * Esta lista se sirve con `flota.conductores.leer`, que **no es** el permiso de la accion
 * (`flota.vehiculos.asignar-conductor`). Un rol puede tener uno sin el otro: en ese caso el bloque
 * dice **el permiso literal que falta**, no el `code`, y no bloquea el modal entero.
 */
export function SelectorConductor({
  valor,
  onCambio,
  deshabilitado = false,
  textoSinConductores,
  accionSinConductores,
  control,
}: {
  /** `''` = sin elegir. */
  valor: string
  /**
   * Devuelve el id Y la identidad ya resuelta. La identidad viaja con el id porque quien recibe la
   * asignacion (la ficha del vehiculo) solo tiene la respuesta del `POST`, que trae **ids y fechas**:
   * sin esto, la tarjeta de "conductor asignado" no tendria como nombrar a la persona.
   */
  onCambio: (conductorFlotaId: string, identidad: string | null) => void
  deshabilitado?: boolean
  /** Copy del vacio sin-datos. Cada superficie lo dice a su manera (modal vs. wizard). */
  textoSinConductores?: string
  /** CTA del vacio sin-datos (ir al listado de conductores). Lo pone cada superficie. */
  accionSinConductores?: ReactNode
  /** Cableado `label` ↔ control ↔ error que entrega `Campo`. Va al grupo de radios. */
  control?: PropsControlCampo
}) {
  const { t } = useTranslation(['flota', 'common'])
  const [busqueda, setBusqueda] = useState('')
  const consulta = useConductores(QUERY_CONDUCTORES_SIN_VEHICULO)

  if (consulta.isPending) {
    return (
      <div className="flex flex-col gap-2" aria-busy="true">
        <span className="text-sm text-fg-secundario">{t('flota:asignacionConductor.cargando')}</span>
        <Skeleton variante="linea" repetir={4} className="h-9" />
      </div>
    )
  }

  if (consulta.isError) {
    const apiError = parseApiError(consulta.error)

    if (apiError.status === 403) {
      return (
        <Bloque>
          {t('flota:asignacionConductor.sinPermisoLectura', {
            permiso: 'flota.conductores.leer',
          })}
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
    return (
      <Bloque accion={accionSinConductores}>
        {textoSinConductores ?? t('flota:asignacionConductor.sinDisponibles')}
      </Bloque>
    )
  }

  const termino = busqueda.trim().toLowerCase()
  const visibles = termino.length === 0 ? items : items.filter((item) => coincide(item, termino))

  const opciones: OpcionRadio[] = visibles.map((item) => ({
    valor: item.id,
    etiqueta: identidadDeConductor(item) ?? t('flota:asignacionConductor.identidadNoDisponible'),
    descripcion: descripcionDe(item, t),
    deshabilitada: deshabilitado,
  }))

  return (
    <div className="flex flex-col gap-3">
      <Input
        value={busqueda}
        onChange={(evento) => setBusqueda(evento.target.value)}
        iconoIzq={Search}
        placeholder={t('flota:asignacionConductor.buscarPlaceholder')}
        aria-label={t('flota:asignacionConductor.buscar')}
        autoComplete="off"
        disabled={deshabilitado}
      />

      {visibles.length === 0 ? (
        <Bloque
          accion={
            <Boton variante="secundaria" tamano="sm" onClick={() => setBusqueda('')}>
              {t('flota:asignacionConductor.limpiarBusqueda')}
            </Boton>
          }
        >
          {t('flota:asignacionConductor.sinResultados')}
        </Bloque>
      ) : (
        <div className="max-h-72 overflow-y-auto rounded-lg border border-borde bg-superficie-2 p-3">
          {/*
            `valor` va TAL CUAL: `''` es un valor controlado valido y significa "nada elegido". Un
            `undefined` mientras no hay eleccion hace nacer el grupo NO controlado y pasar a
            controlado al primer click — el warning que Base UI reporta.
          */}
          <GrupoRadio
            {...control}
            opciones={opciones}
            valor={valor}
            onCambio={(id) => {
              const elegido = items.find((item) => item.id === id) ?? null
              onCambio(id, elegido === null ? null : identidadDeConductor(elegido))
            }}
          />
        </div>
      )}

      {total > items.length ? (
        <p className="text-xs text-fg-terciario">
          {t('flota:asignacionConductor.soloPrimeros', { cantidad: items.length })}
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
 * Lo que el usuario tiene delante para reconocer a la persona: legajo y estado operativo.
 *
 * **No dice la categoria de licencia**: `licencia.categoria` viene `null` SIEMPRE (no tiene columna en
 * ninguna tabla — B-21). Y **no promete que el conductor sea asignable**: el estado se muestra como
 * dato, no como filtro, porque el listado no puede pre-filtrarlo (ver el bloque del encabezado).
 */
function descripcionDe(
  item: ConductorListItemDto,
  t: (clave: string) => string,
): string | undefined {
  const partes = [
    item.numeroLegajo,
    t(`flota:estadoConductor.${item.estado}`),
    // Solo cuando la identidad visible NO es el documento: repetirlo dos veces en la misma fila no
    // agrega informacion.
    identidadDeConductor(item) === item.dni ? null : item.dni,
  ].filter((parte): parte is string => parte !== null && parte.trim().length > 0)

  return partes.length === 0 ? undefined : partes.join(' · ')
}

function coincide(item: ConductorListItemDto, termino: string): boolean {
  return [item.nombreCompleto, item.dni, item.numeroLegajo].some(
    (campo) => campo !== null && campo.toLowerCase().includes(termino),
  )
}
