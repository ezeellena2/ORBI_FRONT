import type { ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { List, MoreHorizontal, Pause, Pencil, Play, Send, Trash2 } from 'lucide-react'
import { Badge } from '@/shared/ui/Badge'
import { BotonIcono } from '@/shared/ui/BotonIcono'
import { MenuAcciones, type ItemMenuAcciones } from '@/shared/ui/MenuAcciones'
import { Skeleton } from '@/shared/ui/Skeleton'
import {
  claveDeEstadoDerivadoDeWebhook,
  claveDeEstadoEntrega,
  estadoDerivadoDeWebhook,
  varianteDeEstadoDerivadoDeWebhook,
} from '../../../vocabulario-centro-problemas'
import {
  ACCIONES_DE_WEBHOOK_DE_GESTION,
  accionesDeWebhook,
  claveDeAccionDeWebhook,
  type AccionDeWebhook,
} from '../../../vocabulario-integraciones'
import type { WebhookEndpointDto } from '@/services/contracts/flota'

/**
 * Lista "Webhooks configurados" — **cards, no tabla** (ficha §4.1): cada endpoint lleva su URL en
 * mono, su badge derivado, su ultima entrega y su kebab, y eso no entra legible en una fila.
 *
 * ══ EL BADGE ES DERIVADO, NO UN CAMPO (DA-IN-02, cerrada) ═══════════════════════════════════════
 * Sale de `activo` + `ultimoEstado` con la tabla del contrato: **Inactivo · Sin envios · Activo ·
 * Pendiente · Con errores · Fallando**. Las etiquetas del mockup (`Activo`/`Reintento`/`Pausado`)
 * son demo con el mapeo viejo y **no se portan**.
 *
 * ⚠️ `activo === false` gana **siempre**, incluso con `ultimoEstado` poblado: un endpoint pausado no
 * recibe entregas, asi que su ultimo resultado es historia y no estado.
 *
 * ══ LO QUE LA CARD **NO** MUESTRA, Y POR QUE ════════════════════════════════════════════════════
 *  - **Pills de `eventos[]`** (ficha §4.1): el array llega **vacio siempre** (PENDIENTE #3). Pintar
 *    "sin eventos" al lado del nombre se leeria como "todavia no los configuraste", cuando en
 *    realidad **no se pueden configurar**. La linea que si va lo dice con palabras.
 *  - **Contador de fallos 24 h**: mismo hueco que la health grid (DA-IN-04) — no hay ventana
 *    definida ni forma de contar sin paginar el log entero.
 *  - **Badge "HMAC OK"**: `firmaHmacActiva` **no tiene camino a `false`** (toda entrega va firmada),
 *    asi que un badge que siempre dice lo mismo no informa. La card "Firma HMAC" del rail es donde
 *    esa informacion tiene contexto.
 *  - **"Reintentar ahora"** (kebab): **B-40** — reencola una cola que nadie drena.
 *  - **"Ver error"** (kebab): `errorResumen` persiste la constante `http_error` desde el cierre de
 *    slice-06; el diagnostico util es el `httpStatus`, que ya esta en la tabla de entregas.
 */
export function ListaDeWebhooks({
  endpoints,
  cargando,
  vacio,
  puedeGestionar,
  onAccion,
}: {
  endpoints: WebhookEndpointDto[]
  cargando: boolean
  vacio: ReactNode
  puedeGestionar: boolean
  onAccion: (accion: AccionDeWebhook, endpoint: WebhookEndpointDto) => void
}) {
  if (cargando) {
    return <Skeleton variante="bloque" repetir={3} />
  }

  if (endpoints.length === 0) {
    return <>{vacio}</>
  }

  return (
    <ul className="flex flex-col gap-2">
      {endpoints.map((endpoint) => (
        <li key={endpoint.id}>
          <CardDeWebhook
            endpoint={endpoint}
            puedeGestionar={puedeGestionar}
            onAccion={onAccion}
          />
        </li>
      ))}
    </ul>
  )
}

export type { AccionDeWebhook }

function CardDeWebhook({
  endpoint,
  puedeGestionar,
  onAccion,
}: {
  endpoint: WebhookEndpointDto
  puedeGestionar: boolean
  onAccion: (accion: AccionDeWebhook, endpoint: WebhookEndpointDto) => void
}) {
  const { t, i18n } = useTranslation('flota')

  const derivado = estadoDerivadoDeWebhook(endpoint.activo, endpoint.ultimoEstado)

  return (
    <article className="flex flex-wrap items-start justify-between gap-3 rounded-lg border border-borde bg-superficie-1 px-4 py-3">
      <div className="flex min-w-0 flex-col gap-1">
        <div className="flex flex-wrap items-center gap-2">
          <span className="font-medium text-fg-primario">{endpoint.nombre}</span>
          <Badge variante={varianteDeEstadoDerivadoDeWebhook(derivado)} punto>
            {t(claveDeEstadoDerivadoDeWebhook(derivado))}
          </Badge>
        </div>

        <code className="truncate font-mono text-xs text-fg-secundario">{endpoint.url}</code>

        <p className="text-xs text-fg-terciario">
          {/*
            `eventos[]` viaja vacio SIEMPRE: el endpoint nace sin suscripciones y no recibe nada
            automatico. Sin esta linea, un integrador se va creyendo que ya esta conectado.
          */}
          {t('centroBloqueado.suscripciones')}
        </p>

        <UltimaEntrega endpoint={endpoint} idioma={i18n.language} />
      </div>

      <MenuDeWebhook
        endpoint={endpoint}
        puedeGestionar={puedeGestionar}
        onAccion={onAccion}
      />
    </article>
  )
}

/**
 * La ultima entrega del endpoint.
 *
 * ⚠️ `ultimoEstado === null` **no es "todo bien"**: es que el endpoint **nunca recibio una entrega**.
 * Y hoy ese es el caso normal, porque la unica entrega que existe en todo el sistema es la explicita
 * de "Probar" (PENDIENTE #3). Por eso el copy del vacio dice eso y no un guion.
 */
function UltimaEntrega({ endpoint, idioma }: { endpoint: WebhookEndpointDto; idioma: string }) {
  const { t } = useTranslation('flota')

  if (endpoint.ultimoEstado === null) {
    return <p className="text-xs text-fg-terciario">{t('centro.integraciones.sinEnviosAun')}</p>
  }

  const fecha =
    endpoint.ultimoEnvioUtc === null
      ? null
      : new Intl.DateTimeFormat(idioma, {
          day: '2-digit',
          month: '2-digit',
          hour: '2-digit',
          minute: '2-digit',
        }).format(new Date(endpoint.ultimoEnvioUtc))

  return (
    <p className="text-xs text-fg-secundario">
      {t('centro.integraciones.ultimaEntrega', {
        estado: t(claveDeEstadoEntrega(endpoint.ultimoEstado)),
        fecha: fecha ?? t('centro.problemas.sinValor'),
      })}
    </p>
  )
}

const ICONOS: Record<AccionDeWebhook, typeof Pencil> = {
  editar: Pencil,
  probar: Send,
  verEntregas: List,
  pausar: Pause,
  activar: Play,
  eliminar: Trash2,
}

/*
  La lista de acciones y su gate viven en `vocabulario-integraciones.ts`, no acá: la etiqueta se arma
  por concatenacion (`centro.integraciones.accion.${accion}`) y una clave concatenada que no sale de
  un vocabulario no la puede anclar ningun test — el usuario la descubre leyendo la clave cruda en el
  menu. Es el mismo motivo por el que `ACCIONES_DE_REGLA` vive en su vocabulario.
*/

function MenuDeWebhook({
  endpoint,
  puedeGestionar,
  onAccion,
}: {
  endpoint: WebhookEndpointDto
  puedeGestionar: boolean
  onAccion: (accion: AccionDeWebhook, endpoint: WebhookEndpointDto) => void
}) {
  const { t } = useTranslation('flota')

  const items: ItemMenuAcciones[] = accionesDeWebhook(endpoint).map((accion) => {
    const habilitada = ACCIONES_DE_WEBHOOK_DE_GESTION.includes(accion) ? puedeGestionar : true

    return {
      clave: accion,
      etiqueta: t(claveDeAccionDeWebhook(accion)),
      icono: ICONOS[accion],
      deshabilitado: !habilitada,
      motivo: habilitada
        ? undefined
        : t('centro.integraciones.acciones.sinPermiso', {
            permiso: 'flota.integraciones.gestionar',
          }),
      tono: accion === 'eliminar' ? 'peligro' : 'normal',
      separadorAntes: accion === 'pausar' || accion === 'activar',
      onSelect: () => onAccion(accion, endpoint),
    }
  })

  return (
    <MenuAcciones
      disparador={
        <BotonIcono
          icono={MoreHorizontal}
          etiqueta={t('centro.integraciones.acciones.abrir', { nombre: endpoint.nombre })}
          variante="fantasma"
          tamano="sm"
        />
      }
      items={items}
      alineacion="end"
    />
  )
}
