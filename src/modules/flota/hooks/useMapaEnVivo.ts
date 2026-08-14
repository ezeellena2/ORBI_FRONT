import { useQuery } from '@tanstack/react-query'
import { flotaKeys } from '../query-keys'
import { POLLING_MAPA_MS } from '../vocabulario-mapa'
import { mapaService } from '@/services/flota/mapa-service'

/**
 * Marcadores de toda la flota, con **polling**.
 *
 * ══ POR QUE `refetchInterval` Y NO `staleTime: 0` SOLO ══════════════════════════════════════════
 * `staleTime: 0` marca el dato como viejo, pero **no dispara nada**: React Query refetchea al montar,
 * al enfocar la ventana o al reconectar — o sea, ante una accion del usuario. Un mapa en vivo sin
 * `refetchInterval` se queda quieto mientras alguien lo mira, que es exactamente el bug que C-9
 * corrigio en el doc de origen. La cadencia (10-15 s) es contrato, no preferencia: `api.md` §Mapa en
 * vivo. **SSE/WebSocket son fase 2** — no se implementan ni se dejan preparados.
 *
 * ══ EL POLLING SE APAGA CON LA PESTAÑA OCULTA ══════════════════════════════════════════════════
 * `refetchIntervalInBackground: false` — es el default de React Query y se declara EXPLICITO para
 * que nadie lo prenda "para que el mapa este al dia al volver". Verificado en
 * `@tanstack/query-core/queryObserver.js`: el tick del intervalo solo ejecuta el fetch
 * `if (this.options.refetchIntervalInBackground || focusManager.isFocused())`, y
 * `focusManager.isFocused()` es `document.visibilityState !== 'hidden'`, escuchando `visibilitychange`.
 * O sea: con la pestaña de fondo **no sale un solo request**. Un mapa pidiendo cada 12 s en una
 * pestaña que nadie mira es bateria y trafico regalados, y con 20 pestañas abiertas es carga real
 * sobre `Flota.Api` (que a su vez llama a Telemetria 2 veces por request).
 *
 * Al volver a la pestaña, `refetchOnWindowFocus` trae el dato **inmediatamente** en vez de esperar
 * hasta 12 s: si no, el usuario mira durante un intervalo entero un mapa congelado del momento en que
 * se fue. Se declara explicito por el mismo motivo que el de arriba.
 *
 * ── Partial-data (D-C1 a) ─────────────────────────────────────────────────────────────────────
 * Si Telemetria no responde, el backend **NO falla**: responde 200 y sirve lo que tiene. En el mapa
 * eso se ve distinto que en un listado —lo dice `api.md` §Mapa en vivo—:
 *  · posicion fresca ⇒ marcador con su `estado` real;
 *  · sin posicion fresca y **cache vigente** (TTL ≤ 60 s) ⇒ marcador en la ultima posicion conocida
 *    y `estado = sin_dato` (**nunca** `en_linea`: el estado guardado es el que tenia cuando era
 *    fresca, y servirlo pintaria la flota entera de verde justo durante la caida — **D-S5-1**);
 *  · sin posicion fresca y cache expirada ⇒ el vehiculo **sale de `items`**.
 * O sea que con Telemetria caida el mapa se vacia de a poco, no de golpe, y nunca tira error. La
 * pantalla lo cuenta con `AvisoDatosDeConexion` + el aviso de "fuera del mapa".
 */
export function useMapaEnVivo() {
  return useQuery({
    queryKey: flotaKeys.mapaVehiculos(),
    queryFn: async () => {
      const respuesta = await mapaService.obtenerMapa()
      return respuesta.data
    },
    // Dato en vivo: cualquier valor ya servido esta viejo por definicion.
    staleTime: 0,
    refetchInterval: POLLING_MAPA_MS,
    refetchIntervalInBackground: false,
    refetchOnWindowFocus: true,
  })
}
