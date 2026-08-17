import { useTranslation } from 'react-i18next'
import { Route } from 'lucide-react'
import { PanelSinFuente } from '../dispositivos/detalle/PanelSinFuente'

/**
 * Tab Historial (recorridos) del vehiculo — superficie ⚠ DEGRADADA, **declarada sin pedirla**.
 *
 * ── POR QUE ESTE TAB YA NO EMITE NINGUN REQUEST ───────────────────────────────────────────────
 * `GET /vehiculos/{id}/recorridos` responde **SIEMPRE 500** con `code:
 * flota.telemetria.no_disponible`: Telemetria no persiste historico de posiciones ni modela viajes,
 * asi que la superficie entera no tiene fuente upstream (capa (b) de **D-C1**, bloqueante **B-9**).
 * La lista de superficies degradadas es **cerrada** por contrato, o sea que ese 500 no es una
 * observacion de runtime que pueda cambiar sola: es un hecho del contrato.
 *
 * La version anterior lo pedia igual —una vez por apertura del tab, con `retry: false`— para pintar
 * el estado degradado con el `code` de la respuesta. Eso contradice al contrato en dos lugares que
 * lo dicen literal (`ESTADO.md` §"Listo para el frontend": *"`GET .../recorridos` y `.../stats` —
 * 500 por contrato (B-9). **No pedirlos.**"*, y `fronteras/telemetria.md` §A-1), y le mete un 500 a
 * la consola y a la telemetria de errores de **todos** los usuarios que abran la pestania.
 *
 * Ahora se comporta como sus 2 hermanos del modulo, que ya lo hacian bien: el tab **Eventos** de la
 * ficha del dispositivo y el tab **Actividad** de la ficha del conductor. Los tres declaran el
 * estado sin tocar la red — por eso se reusa `PanelSinFuente`, que existe exactamente para esto.
 *
 * ── LO QUE SE FUE CON EL REQUEST, Y NO ES PERDIDA ─────────────────────────────────────────────
 * La tabla de recorridos y el select de periodo eran **codigo muerto por contrato**: la rama de
 * exito no se renderizo nunca (el endpoint no puede responder 200) y el select filtraba un rango
 * sobre datos que no llegan. Sus claves i18n (`detalle.historial.periodo.*`, `.columnas.*`,
 * `.minutos`, `.vacio*`, `.error*`) **quedan a proposito, pareadas es/en**: son andamio declarado
 * para el dia que se cierre B-9, igual que `conexion.vacio.incompleto` para B-31/B-32.
 *
 * "Ver historial completo →" y "Exportar" del mockup tampoco se implementan: no tienen destino ni
 * endpoint (DA-VD-07 residual), y dependen del mismo pedido upstream a Telemetria.
 * ─────────────────────────────────────────────────────────────────────────────────────────────
 */
export function TabHistorial() {
  const { t } = useTranslation(['flota', 'common'])

  return (
    <PanelSinFuente
      icono={Route}
      titulo={t('flota:detalle.historial.degradadoTitulo')}
      descripcion={t('flota:detalle.historial.degradadoDescripcion')}
    />
  )
}
