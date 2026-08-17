import { useQuery } from '@tanstack/react-query'
import { flotaKeys } from '../query-keys'
import { dispositivosService } from '@/services/flota/dispositivos-service'

/**
 * Snapshot tecnico en vivo de UN dispositivo (`GET /dispositivos/{id}/telemetria`).
 *
 * ⚠️ Es **PARTIAL-DATA, no una superficie degradada**: responde 200 con los campos sin fuente en
 * `null`, nunca 500. Por eso este hook SI emite el request, a diferencia de los de eventos y
 * recorridos — que responden siempre 500 `flota.telemetria.no_disponible` (convencion 8b) y por eso
 * no existen. La regla no es "todo lo que toca Telemetria no se pide": es que se pide lo que puede
 * contestar 200.
 *
 * `staleTime` 15 s y `refetchOnWindowFocus`: es dato EN VIVO, mas corto que el del detalle (que es
 * dato propio y cambia por CRUD). No hay polling automatico — el contrato lo contempla, pero un
 * intervalo fijo en una ficha abierta en segundo plano es trafico contra Telemetria por una pantalla
 * que nadie esta mirando. Se refresca al volver a la pestana y con el boton.
 *
 * `enabled` por id: sin dispositivo no hay a quien preguntarle, y montar la query igual dispararia
 * un request a `/undefined/telemetria`.
 */
export function useTelemetriaDispositivo(dispositivoId: string | undefined) {
  return useQuery({
    queryKey: flotaKeys.dispositivoTelemetria(dispositivoId ?? ''),
    queryFn: async () => {
      const respuesta = await dispositivosService.obtenerTelemetria(dispositivoId ?? '')
      return respuesta.data
    },
    enabled: dispositivoId !== undefined && dispositivoId !== '',
    staleTime: 15_000,
    refetchOnWindowFocus: true,
  })
}
