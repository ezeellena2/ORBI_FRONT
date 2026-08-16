import { useTranslation } from 'react-i18next'
import { KeyRound, ShieldCheck } from 'lucide-react'
import { AccionConMotivo } from '../../AccionConMotivo'
import { Boton } from '@/shared/ui/Boton'
import { Card } from '@/shared/ui/Card'
import { Icono } from '@/shared/ui/Icono'
import {
  HEADERS_DE_FIRMA,
  STRING_CANONICO_DE_FIRMA,
} from '../../../vocabulario-integraciones'
import type { WebhookEndpointDto } from '@/services/contracts/flota'

/**
 * Card "Firma HMAC" — **no es un placeholder**: es el material de onboarding del integrador, y todo
 * lo que muestra esta **cerrado** en `api.md` §Firma de webhooks (`f-11` paso 6).
 *
 * Documenta las 4 cosas que hacen que la firma sirva:
 *  1. los **4 headers** de toda entrega, con para que es cada uno;
 *  2. el **string canonico** copiable, con el prefijo `v1=` como parte del valor;
 *  3. que se firma el **`rawBody` tal cual se transmite** — no una reserializacion del JSON;
 *  4. que el receptor tiene que validar **las tres cosas**: timestamp, firma y event id.
 *
 * ⚠️ **DA-IN-08-b**: la tolerancia del `X-Orbi-Timestamp` (minutos) y si el formato es Unix o ISO
 * **no estan definidos**. Ese dato puntual va en `—`; el resto del esquema se documenta completo.
 * Un numero inventado ahi hace que el receptor rechace entregas legitimas o acepte replays.
 *
 * ══ ⚠️ EL COPY DE LA ROTACION — B-39 ═══════════════════════════════════════════════════════════
 * `api.md` §Rotacion promete una **ventana de gracia**: el anterior sigue validando para que el
 * receptor despliegue el cambio sin perder entregas. **Hoy eso es FALSO**, y esta verificado contra
 * el backend que corre: Flota firma con el nuevo desde t=0 y manda **una sola** firma en
 * `X-Orbi-Signature`; el secreto viejo queda con `vigente_hasta` futuro y **ningun camino de
 * produccion lo lee**. `ESTADO.md` §"Lo que el frontend NO debe dibujar" lo dice punto por punto:
 * *"Ningun aviso de 'el secreto anterior sigue funcionando' al rotar — B-39: hoy es falso"*.
 *
 * ⇒ El aviso dice que hay que **coordinar el despliegue del receptor**. Prometer la ventana haria
 * que el integrador se tome el tiempo que le ofrecemos y pierda el **100 %** de las entregas.
 * `secretoAnteriorVigenteHastaUtc` llega poblado y es **dato inerte**: no se muestra como plazo.
 */
export function CardFirmaHmac({
  endpoint,
  puedeGestionar,
  onRotar,
}: {
  /** El endpoint seleccionado. `null` = la organizacion todavia no tiene ninguno. */
  endpoint: WebhookEndpointDto | null
  puedeGestionar: boolean
  onRotar: (endpoint: WebhookEndpointDto) => void
}) {
  const { t } = useTranslation('flota')

  return (
    <Card titulo={t('centro.integraciones.firma.titulo')}>
      <div className="flex flex-col gap-3">
        <p className="text-sm text-fg-secundario">{t('centro.integraciones.firma.descripcion')}</p>

        <ul className="flex flex-col gap-1.5">
          {HEADERS_DE_FIRMA.map((header) => (
            <li key={header.nombre} className="flex flex-col">
              <code className="font-mono text-xs text-fg-primario">{header.nombre}</code>
              <span className="text-xs text-fg-terciario">{t(header.clave)}</span>
            </li>
          ))}
        </ul>

        <div className="flex flex-col gap-1">
          <span className="text-xs font-medium text-fg-secundario">
            {t('centro.integraciones.firma.stringCanonico')}
          </span>
          <code className="overflow-x-auto rounded-sm border border-borde bg-superficie-2 px-2 py-1.5 font-mono text-xs text-fg-primario select-all">
            {STRING_CANONICO_DE_FIRMA}
          </code>
          <span className="text-xs text-fg-terciario">
            {t('centro.integraciones.firma.rawBody')}
          </span>
        </div>

        <p className="flex items-start gap-2 text-xs text-fg-secundario">
          <Icono icono={ShieldCheck} tamano="sm" />
          <span>{t('centro.integraciones.firma.validacionTriple')}</span>
        </p>

        {/* DA-IN-08-b: dato ausente, nunca un numero plausible. */}
        <p className="text-xs text-fg-terciario">
          {t('centro.integraciones.firma.tolerancia')}:{' '}
          <span className="font-mono">{t('centro.integraciones.firma.toleranciaPendiente')}</span>
        </p>

        <Rotacion endpoint={endpoint} puedeGestionar={puedeGestionar} onRotar={onRotar} />
      </div>
    </Card>
  )
}

function Rotacion({
  endpoint,
  puedeGestionar,
  onRotar,
}: {
  endpoint: WebhookEndpointDto | null
  puedeGestionar: boolean
  onRotar: (endpoint: WebhookEndpointDto) => void
}) {
  const { t } = useTranslation('flota')

  if (endpoint === null) {
    return (
      <p className="border-t border-borde pt-3 text-xs text-fg-terciario">
        {t('centro.integraciones.firma.sinEndpoint')}
      </p>
    )
  }

  const motivo = puedeGestionar
    ? undefined
    : t('centro.integraciones.acciones.sinPermiso', { permiso: 'flota.integraciones.gestionar' })

  return (
    <div className="flex flex-col gap-2 border-t border-borde pt-3">
      <div className="flex flex-col">
        <span className="text-xs text-fg-terciario">
          {t('centro.integraciones.firma.huellaDe', { nombre: endpoint.nombre })}
        </span>
        <code className="font-mono text-xs text-fg-primario select-all">
          {endpoint.secretoHuella}
        </code>
      </div>

      {/*
        B-39. El aviso va ANTES del boton, no en el resultado: quien lee "tenés una ventana" ya
        aceptó el riesgo cuando aparece el cartel.
      */}
      <p className="text-xs text-fg-secundario">{t('centroBloqueado.ventanaDeGracia')}</p>

      <AccionConMotivo motivo={motivo}>
        <Boton
          variante="secundaria"
          tamano="sm"
          iconoIzq={KeyRound}
          deshabilitado={!puedeGestionar}
          onClick={() => onRotar(endpoint)}
        >
          {t('centro.integraciones.firma.rotar')}
        </Boton>
      </AccionConMotivo>
    </div>
  )
}
