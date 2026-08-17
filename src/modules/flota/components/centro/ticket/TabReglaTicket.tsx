import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import { SlidersHorizontal } from 'lucide-react'
import { Boton } from '@/shared/ui/Boton'
import { EstadoVacio } from '@/shared/ui/EstadoVacio'
import { AccionConMotivo } from '../../AccionConMotivo'
import { usePermisos } from '../../../hooks/usePermisos'
import { CONTEXTO_DE_REGLA_DISPONIBLE } from '../../../vocabulario-ticket-problema'

const RUTA_REGLAS = '/app/flota/problemas/reglas'
const PERMISO_REGLAS = 'flota.reglas.leer'

/**
 * Tab **Contexto regla** del ticket (ficha §6).
 *
 * ══ EL TAB SE DIBUJA Y NO TIENE DATOS, A PROPÓSITO ═════════════════════════════════════════════
 * La ficha pide las stats de la regla en 30 días (disparos, % sin acción, MTTR, falsos positivos) y
 * dice *"lo que no venga del DTO en `—`"*. Acá **no viene nada**, y por dos motivos independientes:
 *  1. `ProblemaOperativoDetalleDto` **no trae la regla**: no hay `reglaId` ni código, porque el
 *     vínculo problema → regla **no existe como columna** (PENDIENTE #8). No se sabe de qué regla
 *     mostrar las stats.
 *  2. Las métricas son **DA-PC-01**: no existe endpoint de resumen en `api.md` §Problemas.
 *
 * Un tab con 4 tarjetas en `—` se lee como una pantalla rota; un tab ausente esconde que la
 * capacidad existe y está apagada. Se dibuja y **declara**, que es el precedente ya establecido en
 * el módulo (los tabs Historial, Eventos y Actividad hacen lo mismo) — y **no emite ningún
 * request**: la ausencia es del contrato, no algo que haya que ir a preguntarle al servidor.
 *
 * Lo único real que sobrevive de la ficha es el link a Reglas, gateado por su `.leer` en modo
 * disable (nunca oculto).
 */
export function TabReglaTicket() {
  const { t } = useTranslation('flota')
  const { tienePermiso } = usePermisos()

  const habilitado = tienePermiso(PERMISO_REGLAS)

  return (
    <EstadoVacio
      variante="sin-datos"
      icono={SlidersHorizontal}
      titulo={t('centro.ticket.regla.titulo')}
      descripcion={
        CONTEXTO_DE_REGLA_DISPONIBLE
          ? t('centro.ticket.regla.descripcion')
          : t('centro.ticket.regla.sinVinculo')
      }
      acciones={
        <AccionConMotivo
          motivo={
            habilitado
              ? undefined
              : t('centro.submenu.sinPermiso', { permiso: PERMISO_REGLAS })
          }
        >
          <Boton
            variante="secundaria"
            tamano="sm"
            deshabilitado={!habilitado}
            render={habilitado ? <Link to={RUTA_REGLAS} /> : undefined}
          >
            {t('centro.timeline.insight.ajustarRegla')}
          </Boton>
        </AccionConMotivo>
      }
    />
  )
}
