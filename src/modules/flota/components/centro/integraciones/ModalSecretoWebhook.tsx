import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { AlertTriangle, Copy } from 'lucide-react'
import { Boton } from '@/shared/ui/Boton'
import { Icono } from '@/shared/ui/Icono'
import { Modal } from '@/shared/ui/Modal'
import { Toggle } from '@/shared/ui/Toggle'
import type { SecretoWebhookDto } from '@/services/contracts/flota'

/**
 * El secreto HMAC, **la unica vez que se puede ver**.
 *
 * ══ POR QUE ESTE MODAL EXISTE Y ES ASI ══════════════════════════════════════════════════════════
 * El secreto completo sale por **2 puertas**: la respuesta del alta y la de rotar. **Ningun `GET` lo
 * devuelve** — el listado solo expone `secretoHuella`. Un secreto perdido obliga a **rotar otra vez**,
 * y rotar hoy le corta las entregas al receptor (B-39). O sea que perderlo no es un inconveniente:
 * es un incidente en el sistema de un tercero.
 *
 * Por eso el aviso va **ANTES de que el modal se pueda cerrar** y no despues:
 *  - el cartel de "esta es la unica vez" es lo primero que se lee, arriba del valor;
 *  - **`cierrePorFuera` esta apagado**: un click al costado no lo cierra;
 *  - el boton de cerrar **se habilita con una confirmacion explicita**. No es friccion decorativa —
 *    es la unica barrera entre "copie el secreto" y "creí que lo habia copiado".
 *
 * ══ EL VALOR NO SE PERSISTE EN NINGUN LADO ══════════════════════════════════════════════════════
 * Vive en la prop de este componente, que muere con el modal: **no entra a la cache de React Query**
 * (los hooks invalidan, no siembran), **no va a ningun store** y **no se loguea**.
 *
 * ══ LO QUE ESTE COPY NO PUEDE DECIR — B-39 ══════════════════════════════════════════════════════
 * `secretoAnteriorVigenteHastaUtc` llega poblado y es **dato inerte**: Flota firma con el nuevo desde
 * t=0 y manda **una sola** firma, asi que el receptor que todavia tiene el viejo pierde el **100 %**
 * de las entregas desde el instante de la rotacion. **No se muestra como plazo** y el copy no promete
 * ninguna ventana.
 */
export function ModalSecretoWebhook({
  secreto,
  origen,
  onCerrar,
}: {
  /** `null` = no hay secreto que mostrar (todavia no se creo ni se roto nada). */
  secreto: SecretoWebhookDto | null
  /** Cambia solo el subtitulo: crear y rotar tienen consecuencias distintas para el receptor. */
  origen: 'alta' | 'rotacion'
  onCerrar: () => void
}) {
  if (secreto === null) return null

  return <Contenido secreto={secreto} origen={origen} onCerrar={onCerrar} />
}

function Contenido({
  secreto,
  origen,
  onCerrar,
}: {
  secreto: SecretoWebhookDto
  origen: 'alta' | 'rotacion'
  onCerrar: () => void
}) {
  const { t } = useTranslation('flota')

  const [confirmado, setConfirmado] = useState(false)
  const [copiado, setCopiado] = useState(false)
  const [falloElCopiado, setFalloElCopiado] = useState(false)

  /**
   * ⚠️ El `catch` NO es defensivo: `navigator.clipboard` es **`undefined`** en origen no seguro
   * (`http://`) y `writeText` rechaza si el documento perdió el foco o el permiso está denegado. Sin
   * él, el fallo es **mudo** — el botón se queda en "Copiar" y no aparece nada — justo en la única
   * pantalla del módulo donde perder el valor es un incidente en el sistema de un tercero: el
   * secreto no se puede volver a pedir, recuperarlo obliga a rotar, y rotar hoy le corta el 100 % de
   * las entregas al receptor (**B-39**). El `<code>` tiene `select-all`, así que la salida manual
   * existe: lo que faltaba era ofrecerla.
   */
  async function copiar() {
    try {
      await navigator.clipboard.writeText(secreto.secreto)
      setCopiado(true)
      setFalloElCopiado(false)
    } catch {
      setCopiado(false)
      setFalloElCopiado(true)
    }
  }

  return (
    <Modal
      abierto
      // Cerrar sin querer no es una opcion: el valor no se puede volver a pedir.
      onCerrar={() => {
        if (confirmado) onCerrar()
      }}
      cierrePorFuera={false}
      titulo={t('centro.integraciones.secreto.titulo')}
      descripcion={t(
        origen === 'alta'
          ? 'centro.integraciones.secreto.subtituloAlta'
          : 'centro.integraciones.secreto.subtituloRotacion',
      )}
      pie={
        <Boton onClick={onCerrar} deshabilitado={!confirmado}>
          {t('centro.integraciones.secreto.entendido')}
        </Boton>
      }
    >
      <div className="flex flex-col gap-3">
        {/* El aviso va ARRIBA del valor: se lee antes de que el usuario decida qué hacer. */}
        <p
          role="alert"
          className="flex items-start gap-2 rounded-lg border border-advertencia/40 bg-advertencia-fondo px-3 py-2 text-sm text-fg-primario"
        >
          <Icono icono={AlertTriangle} tamano="sm" />
          <span>{t('centro.integraciones.secreto.descripcion')}</span>
        </p>

        <code className="overflow-x-auto rounded-sm border border-borde bg-superficie-2 px-3 py-2 font-mono text-sm text-fg-primario select-all">
          {secreto.secreto}
        </code>

        <div className="flex items-center gap-3">
          <Boton variante="secundaria" tamano="sm" iconoIzq={Copy} onClick={() => void copiar()}>
            {t(
              copiado
                ? 'centro.integraciones.secreto.copiado'
                : 'centro.integraciones.secreto.copiar',
            )}
          </Boton>
          <span className="font-mono text-xs text-fg-terciario">{secreto.secretoHuella}</span>
        </div>

        {falloElCopiado ? (
          <p role="alert" className="text-sm text-peligro">
            {t('centro.integraciones.secreto.errorCopiar')}
          </p>
        ) : null}

        {origen === 'rotacion' ? (
          // B-39: el copy correcto es coordinar el despliegue, NUNCA "el anterior sigue andando".
          <p className="text-xs text-fg-secundario">{t('centroBloqueado.ventanaDeGracia')}</p>
        ) : (
          <p className="text-xs text-fg-secundario">{t('centroBloqueado.suscripciones')}</p>
        )}

        <Toggle
          etiqueta={t('centro.integraciones.secreto.confirmacion')}
          activo={confirmado}
          onCambio={setConfirmado}
        />
      </div>
    </Modal>
  )
}
