import type { ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { Badge } from '@/shared/ui/Badge'
import { Tabla } from '@/shared/ui/Tabla'
import type { Columna } from '@/shared/ui/Columna'
import {
  claveDeEstadoEntrega,
  varianteDeEstadoEntrega,
} from '../../../vocabulario-centro-problemas'
import { nombreDelEndpointDeLaEntrega } from '../../../vocabulario-integraciones'
import type { WebhookEndpointDto, WebhookEntregaDto } from '@/services/contracts/flota'

/**
 * Tabla "Ultimas entregas" — ficha §4.2. **Los 5 estados se pueden pintar** (el mockup muestra 3).
 *
 * ══ LO QUE ESTA TABLA NO TIENE, Y NO ES UN OLVIDO ═══════════════════════════════════════════════
 *  - **Accion "Forzar"** en las filas `fallido`/`reintentando` (ficha §4.2 y §7): **B-40**. El
 *    endpoint reencola de verdad, pero **nadie drena la cola** y el cuerpo original **no es
 *    reconstruible** (la fila guarda el hash, no el payload). El boton prometeria un reenvio que no
 *    va a ocurrir; el 200 seria cierto sobre lo que hace y falso sobre lo que va a pasar.
 *  - **Columna "Error"**: `errorResumen` persiste la **constante `http_error`** desde el cierre de
 *    slice-06 (antes era el `ReasonPhrase` que elegia el receptor — texto de un tercero servido a
 *    una pantalla). Una columna con el mismo valor en todas las filas no informa: el diagnostico
 *    util es el **status**, que si tiene columna.
 *
 * ══ `eventType` NO SE TRADUCE ═══════════════════════════════════════════════════════════════════
 * Es el **nombre publico** del evento (ingles, estable para terceros): es el identificador que ve el
 * integrador del otro lado y por el que filtra en SU sistema. Traducirlo rompe esa correspondencia.
 *
 * ══ EL ENDPOINT PUEDE NO ESTAR CARGADO ══════════════════════════════════════════════════════════
 * El log es de **toda la organizacion** y la lista de endpoints esta paginada; ademas un endpoint
 * dado de baja sale del listado y **sus entregas quedan** (el log es la auditoria de a donde salio
 * cada payload). En ese caso se dice, **no se pinta el uuid**.
 */
export function TablaDeEntregas({
  entregas,
  endpoints,
  cargando,
  vacio,
  error,
}: {
  entregas: WebhookEntregaDto[]
  /** Los de la pagina cargada: es lo unico con lo que se puede resolver un nombre. */
  endpoints: WebhookEndpointDto[]
  cargando: boolean
  vacio: ReactNode
  error?: ReactNode
}) {
  const { t, i18n } = useTranslation('flota')

  const columnas: Columna<WebhookEntregaDto>[] = [
    {
      clave: 'evento',
      titulo: t('centro.integraciones.entregas.evento'),
      tipo: 'mono',
      render: (entrega) => <span className="font-mono text-xs">{entrega.eventType}</span>,
    },
    {
      clave: 'endpoint',
      titulo: t('centro.integraciones.entregas.endpoint'),
      tipo: 'nodo',
      render: (entrega) => {
        const nombre = nombreDelEndpointDeLaEntrega(entrega.webhookEndpointId, endpoints)
        return nombre === null ? (
          <span className="text-xs text-fg-terciario">
            {t('centro.integraciones.entregas.endpointNoCargado')}
          </span>
        ) : (
          <span className="text-sm text-fg-primario">{nombre}</span>
        )
      },
    },
    {
      clave: 'estado',
      titulo: t('centro.integraciones.entregas.estado'),
      tipo: 'nodo',
      render: (entrega) => (
        <Badge variante={varianteDeEstadoEntrega(entrega.estado)} punto>
          {t(claveDeEstadoEntrega(entrega.estado))}
        </Badge>
      ),
    },
    {
      clave: 'intentos',
      titulo: t('centro.integraciones.entregas.intentos'),
      tipo: 'numero',
      render: (entrega) => <span>{entrega.intentos}</span>,
    },
    {
      clave: 'status',
      titulo: t('centro.integraciones.entregas.status'),
      tipo: 'numero',
      render: (entrega) => (
        <span>
          {entrega.httpStatus === null
            ? t('centro.integraciones.entregas.sinStatus')
            : entrega.httpStatus}
        </span>
      ),
    },
    {
      clave: 'proximo',
      titulo: t('centro.integraciones.entregas.proximoIntento'),
      tipo: 'fecha',
      render: (entrega) => <ProximoIntento entrega={entrega} idioma={i18n.language} />,
    },
  ]

  return (
    <Tabla
      columnas={columnas}
      filas={entregas}
      claveFila={(entrega) => entrega.id}
      densidad="densa"
      cargando={cargando}
      vacio={vacio}
      error={error}
    />
  )
}

/**
 * ⚠️ Un `proximoIntentoUtc` en el futuro **no significa que vaya a salir** (B-40): es lo que sostiene
 * el backoff de una cola que nadie drena. Se muestra el instante porque es el dato persistido, y la
 * pantalla aclara arriba de la tabla que las filas en reintento no avanzan solas.
 */
function ProximoIntento({ entrega, idioma }: { entrega: WebhookEntregaDto; idioma: string }) {
  const { t } = useTranslation('flota')

  if (entrega.proximoIntentoUtc === null) {
    return <span className="text-fg-terciario">{t('centro.problemas.sinValor')}</span>
  }

  return (
    <span>
      {new Intl.DateTimeFormat(idioma, {
        day: '2-digit',
        month: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
      }).format(new Date(entrega.proximoIntentoUtc))}
    </span>
  )
}
