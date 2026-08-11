import { useState, type ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { Search } from 'lucide-react'
import { Boton } from '@/shared/ui/Boton'
import type { PropsControlCampo } from '@/shared/ui/Campo'
import { GrupoRadio, type OpcionRadio } from '@/shared/ui/GrupoRadio'
import { Input } from '@/shared/ui/Input'
import { Skeleton } from '@/shared/ui/Skeleton'
import { parseApiError, resolveApiErrorMessage } from '@/shared/errors/parse-api-error'
import type { DispositivoListItemDto } from '@/services/contracts/flota'
import { useDispositivos } from '../../hooks/useDispositivos'
import { QUERY_DISPOSITIVOS_EN_STOCK } from './vocabulario-asignacion'

/**
 * Lista de seleccion (radio) de los GPS `en_stock` de la organizacion — el UNICO componente que
 * elige dispositivo para asignar. Lo comparten el tab del vehiculo, el modal del listado y el paso 2
 * del wizard (`f-07` §1: un solo componente, un solo contrato).
 *
 * ── POR QUE UN RADIO Y NO UNA TABLA ───────────────────────────────────────────────────────────
 * La ficha de onboarding §4 es explicita: "lista de seleccion, no una tabla de datos". Sin filtros,
 * sin paginacion y sin columnas: la decision es "cual de estos equipos instalo", no "explorar el
 * inventario".
 *
 * ── EL BUSCADOR ES LOCAL, Y ESO NO ES UNA SIMPLIFICACION ──────────────────────────────────────
 * `GET /api/flota/dispositivos` **no declara ningun parametro de busqueda** en `api.md`. Un `search`
 * inventado lo descartaria el binder sin error y devolveria la lista entera: el filtro se veria
 * aplicado y no lo estaria. Por eso se filtra sobre lo ya cargado — y cuando lo cargado no alcanza,
 * se avisa (`soloPrimeros`) en vez de dejar creer que la lista esta completa.
 *
 * ── LOS DOS VACIOS SON DISTINTOS ──────────────────────────────────────────────────────────────
 * "No hay equipos en stock" (problema de inventario: hay que registrar o liberar uno) y "ningun
 * equipo coincide con lo que escribiste" (problema del filtro: hay que borrarlo) llevan al usuario a
 * acciones opuestas. Nunca se colapsan en un solo mensaje.
 *
 * ── FORBIDDEN PROPIO ──────────────────────────────────────────────────────────────────────────
 * Esta lista se sirve con `flota.dispositivos.leer`, que NO es el permiso de la accion
 * (`flota.vehiculos.asignar-dispositivo`). Un rol puede tener uno sin el otro: en ese caso el bloque
 * dice **el permiso literal que falta**, no el `code` del error, y no bloquea la pantalla entera
 * (es una sub-superficie dentro de un modal, no la pagina).
 */
export function SelectorDispositivoEnStock({
  valor,
  onCambio,
  deshabilitado = false,
  accionSinStock,
  textoSinStock,
  control,
}: {
  /** `''` = sin elegir. */
  valor: string
  onCambio: (dispositivoFlotaId: string) => void
  deshabilitado?: boolean
  /** CTA del vacio sin-datos (registrar un equipo, ir al inventario…). Lo pone cada superficie. */
  accionSinStock?: ReactNode
  /**
   * Copy del vacio sin-datos, ya resuelto. El wizard tiene el suyo cerrado en la ficha de
   * onboarding §9 (dice explicitamente que se puede saltar), que no es el mismo mensaje que en un
   * modal donde saltar no existe.
   */
  textoSinStock?: string
  /** Cableado `label` ↔ control ↔ error que entrega `Campo`. Va al grupo de radios. */
  control?: PropsControlCampo
}) {
  const { t } = useTranslation(['flota', 'common'])
  const [busqueda, setBusqueda] = useState('')
  const consulta = useDispositivos(QUERY_DISPOSITIVOS_EN_STOCK)

  if (consulta.isPending) {
    return (
      <div className="flex flex-col gap-2" aria-busy="true">
        <span className="text-sm text-fg-secundario">{t('flota:asignacionDispositivo.cargando')}</span>
        <Skeleton variante="linea" repetir={4} className="h-9" />
      </div>
    )
  }

  if (consulta.isError) {
    const apiError = parseApiError(consulta.error)

    if (apiError.status === 403) {
      return (
        <Bloque>
          {t('flota:asignacionDispositivo.sinPermisoLectura', {
            permiso: 'flota.dispositivos.leer',
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
      <Bloque accion={accionSinStock}>
        {textoSinStock ?? t('flota:asignacionDispositivo.sinDisponibles')}
      </Bloque>
    )
  }

  const termino = busqueda.trim().toLowerCase()
  const visibles = termino.length === 0 ? items : items.filter((item) => coincide(item, termino))

  const opciones: OpcionRadio[] = visibles.map((item) => ({
    valor: item.id,
    // `alias` es nullable (D-S3-12): sin el, la identidad visible es el IMEI, que siempre esta.
    etiqueta: item.alias ?? item.imei,
    descripcion: descripcionDe(item),
    deshabilitada: deshabilitado,
  }))

  return (
    <div className="flex flex-col gap-3">
      <Input
        value={busqueda}
        onChange={(evento) => setBusqueda(evento.target.value)}
        iconoIzq={Search}
        placeholder={t('flota:asignacionDispositivo.buscarPlaceholder')}
        aria-label={t('flota:asignacionDispositivo.buscar')}
        autoComplete="off"
        disabled={deshabilitado}
      />

      {visibles.length === 0 ? (
        <Bloque
          accion={
            <Boton variante="secundaria" tamano="sm" onClick={() => setBusqueda('')}>
              {t('flota:asignacionDispositivo.limpiarBusqueda')}
            </Boton>
          }
        >
          {t('flota:asignacionDispositivo.sinResultados')}
        </Bloque>
      ) : (
        <div className="max-h-72 overflow-y-auto rounded-lg border border-borde bg-superficie-2 p-3">
          {/*
            `valor` va TAL CUAL, sin `valor.length > 0 ? valor : undefined`. Ese ternario mandaba
            `undefined` mientras no habia eleccion (el form arranca en `dispositivoFlotaId: ''`) y un
            string despues: el grupo nacia NO CONTROLADO y pasaba a controlado al primer click, que
            es exactamente el error que Base UI reportaba en consola al elegir un equipo. `''` es un
            valor controlado perfectamente valido y significa lo mismo: nada elegido.
          */}
          <GrupoRadio {...control} opciones={opciones} valor={valor} onCambio={onCambio} />
        </div>
      )}

      {total > items.length ? (
        <p className="text-xs text-fg-terciario">
          {t('flota:asignacionDispositivo.soloPrimeros', { cantidad: items.length, total })}
        </p>
      ) : null}
    </div>
  )
}

/** Bloque neutro para los estados sin lista (vacio, error, sin permiso). No es `EstadoError`: eso
 * ocupa la superficie entera y acá el formulario del modal sigue arriba y abajo. */
function Bloque({ children, accion }: { children: ReactNode; accion?: ReactNode }) {
  return (
    <div className="flex flex-col items-start gap-3 rounded-lg border border-dashed border-borde bg-superficie-2 px-4 py-4">
      <p className="text-sm text-fg-secundario">{children}</p>
      {accion}
    </div>
  )
}

/** Lo que el usuario tiene delante para reconocer el equipo: IMEI (identidad real) + modelo. */
function descripcionDe(item: DispositivoListItemDto): string {
  return [item.imei, item.modeloNombre].filter((parte) => parte !== null).join(' · ')
}

function coincide(item: DispositivoListItemDto, termino: string): boolean {
  return [item.alias, item.imei, item.modeloNombre].some(
    (campo) => campo !== null && campo.toLowerCase().includes(termino),
  )
}
