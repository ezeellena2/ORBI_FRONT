import { useQuery } from '@tanstack/react-query'
import { flotaKeys } from '../query-keys'
import { problemasService } from '@/services/flota/problemas-service'

/**
 * Detalle compuesto de UN problema — el ticket (`?ticket=<problemaId>`).
 *
 * `staleTime` **15 s**, el mismo de la bandeja: es la misma entidad vista de cerca y su SLA corre
 * igual. `enabled` cuelga del id porque el ticket se abre desde la URL y puede no haber ninguno.
 *
 * ══ LO QUE ESTE DETALLE TRAE NEUTRO SIEMPRE, Y NO ES "NO HAY" ═══════════════════════════════════
 * Los 3 son **partial-data por construccion del esquema**, no estados del problema:
 *  - `integracion` = `{ enviado: false, ultimoEstado: null }` y `webhooks: []` — **ninguna columna
 *    ata una entrega de webhook a un problema**. El tab Integraciones no puede decir "no se envio
 *    nada": tiene que decir que esa correlacion todavia no existe.
 *  - `contextoOperativo.criticidadActivo` = `null` — el modelo no tiene marca de activo critico.
 *  - `sla.estado` nunca vale `por_vencer` — ningun documento fija el umbral.
 *
 * ══ PARTIAL-DATA DE VERDAD (D-C1 a) ════════════════════════════════════════════════════════════
 * Si Telemetria no responde, `contextoOperativo` viaja **entero en `null`** y el resto del detalle
 * se sirve igual: **200, nunca 5xx**. Esta superficie NO esta en la lista cerrada de las que
 * responden 500 `flota.telemetria.no_disponible`, asi que un fallo de Telemetria **no debe pintar
 * pantalla de error** — el titulo, la severidad, el estado, el SLA, el responsable y las senales
 * persistidas siguen visibles y el contexto va en `—`.
 *
 * ⚠️ Y el guard del render va DESPUES de mirar si hay datos en mano: en React Query v5 `status` pasa
 * a `'error'` aunque `data` este cargada, asi que un refetch fallado tras una mutacion exitosa
 * borraria la ficha entera sobre algo que SI se hizo. Es el defecto D-S4F-1, ya cometido en la ficha
 * del conductor.
 */
export function useProblemaDetalle(problemaId: string | undefined) {
  return useQuery({
    queryKey: flotaKeys.problemaDetalle(problemaId ?? ''),
    queryFn: async () => {
      const respuesta = await problemasService.obtener(problemaId as string)
      return respuesta.data
    },
    enabled: problemaId !== undefined && problemaId !== '',
    staleTime: 15_000,
  })
}
