import { useTranslation } from 'react-i18next'
import { Campo } from '@/shared/ui/Campo'
import { Select, type OpcionSelect } from '@/shared/ui/Select'
import { usePermisos } from '../../../hooks/usePermisos'
import { useWebhooks } from '../../../hooks/useWebhooks'
import type { WebhooksPageQuery } from '@/services/contracts/flota'

const PERMISO_LECTURA_INTEGRACIONES = 'flota.integraciones.leer'

/** Valor del select cuando la regla no dispara ningun webhook. Viaja como campo omitido. */
export const SIN_WEBHOOK = ''

/**
 * Constante de modulo, no literal en el render: un objeto nuevo por render dentro de una query key
 * es el patron que este modulo ya pago dos veces. React Query hashea por valor, asi que no habria
 * bucle — pero la convencion del repo es que el DATO sea estable, no que el hash lo perdone.
 *
 * `pageSize: 100` es el maximo de `Platform.Pagination`. Un select paginado no existe, y el volumen
 * de endpoints por organizacion es chico (la ficha de integraciones lo declara).
 */
const QUERY_DE_ENDPOINTS: WebhooksPageQuery = { pageSize: 100 }

/**
 * Select "Webhook" del modal de regla — se alimenta de `GET /api/flota/integraciones/webhooks`.
 *
 * ── EL PERMISO ES DE OTRO GRUPO, Y ESO TIENE CONSECUENCIA ─────────────────────────────────────
 * Listar endpoints exige **`flota.integraciones.leer`**, que es de otro grupo del catalogo: el rol
 * **supervisor**, que si tiene `flota.reglas.leer`, **no lo tiene**. Sin ese permiso el select va
 * **deshabilitado con el motivo escrito** en vez de vacio: un select vacio se lee como "esta
 * organizacion no configuro webhooks", que es una afirmacion falsa sobre datos de otro grupo.
 *
 * ⚠️ Y la consulta **no se emite**: sin el permiso el componente que la hace ni siquiera se monta.
 * Emitirla para recibir un 403 ensucia la consola y la telemetria de errores de todo supervisor que
 * abra el modal. Por eso son 2 componentes y no un `enabled`.
 *
 * ── LO QUE ESTE SELECT NO PUEDE HACER (B-18) ──────────────────────────────────────────────────
 * Volver a "Sin webhook" en una regla que ya tenia uno **no lo desvincula**: el `PATCH` preserva lo
 * ausente y `null` no borra. El aviso lo da el modal (`intentaDesvincularWebhook`) antes de guardar;
 * acá la opcion se ofrece igual, porque el alta si la necesita.
 */
export function SelectorWebhookDeRegla({
  valor,
  onCambio,
  deshabilitado,
}: {
  valor: string
  onCambio: (valor: string) => void
  deshabilitado: boolean
}) {
  const { tienePermiso } = usePermisos()

  return tienePermiso(PERMISO_LECTURA_INTEGRACIONES) ? (
    <SelectorConCatalogo valor={valor} onCambio={onCambio} deshabilitado={deshabilitado} />
  ) : (
    <SelectorSinPermiso valor={valor} />
  )
}

function SelectorConCatalogo({
  valor,
  onCambio,
  deshabilitado,
}: {
  valor: string
  onCambio: (valor: string) => void
  deshabilitado: boolean
}) {
  const { t } = useTranslation('flota')
  const consulta = useWebhooks(QUERY_DE_ENDPOINTS)

  const opciones: OpcionSelect[] = [
    { valor: SIN_WEBHOOK, etiqueta: t('centro.reglas.modal.webhookNinguno') },
    ...(consulta.data?.items ?? []).map((endpoint) => ({
      valor: endpoint.id,
      etiqueta: endpoint.nombre,
    })),
  ]

  return (
    <Campo etiqueta={t('centro.reglas.modal.webhook')} ayuda={t('centro.reglas.modal.webhookAyuda')}>
      {(control) => (
        <Select
          {...control}
          opciones={opciones}
          valor={valor}
          onCambio={onCambio}
          cargando={consulta.isPending}
          deshabilitado={deshabilitado}
          textoCargando={t('centro.reglas.modal.webhookCargando')}
        />
      )}
    </Campo>
  )
}

/**
 * Sin `flota.integraciones.leer`.
 *
 * ⚠️ Muestra el valor que la regla YA tiene y no puede resolver su nombre (eso exigiria el catalogo).
 * Por eso la opcion unica lleva el copy "ya configurado" en vez del id crudo: pintar un uuid en un
 * select es peor que no pintarlo.
 */
function SelectorSinPermiso({ valor }: { valor: string }) {
  const { t } = useTranslation('flota')

  const opciones: OpcionSelect[] = [
    {
      valor,
      etiqueta:
        valor === SIN_WEBHOOK
          ? t('centro.reglas.modal.webhookNinguno')
          : t('centro.reglas.modal.webhookYaConfigurado'),
    },
  ]

  return (
    <Campo
      etiqueta={t('centro.reglas.modal.webhook')}
      ayuda={t('centro.reglas.modal.webhookSinPermiso', {
        permiso: PERMISO_LECTURA_INTEGRACIONES,
      })}
    >
      {(control) => <Select {...control} opciones={opciones} valor={valor} deshabilitado />}
    </Campo>
  )
}
