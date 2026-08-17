import type { QueryClient } from '@tanstack/react-query'
import { useSessionStore } from '@/stores/session-store'
import type { SessionSnapshot, OrganizacionActiva } from '@/services/contracts/auth'

/**
 * Aislamiento de la cache de React Query entre sesiones.
 *
 * ⚠️ EL PROBLEMA QUE CIERRA (fuga de datos entre organizaciones, visible por el usuario):
 * ninguna key de `flotaKeys` lleva la organizacion — todas arrancan en `['flota', ...]` — y el
 * `QueryClient` es UNO solo para toda la vida de la pestaña. Con `staleTime` de 30 s y `gcTime`
 * de 5 min, cambiar de organizacion y volver a un listado devolvia la respuesta de la ANTERIOR
 * **sin emitir un request**: la key era identica y la entrada seguia fresca. El backend nunca
 * estuvo en falta (el JWT ya era de la org destino); el request no llegaba a existir.
 *
 * Mismo agujero por otra puerta: cuando el refresh falla, el interceptor llama a `clearSession`,
 * que limpiaba el store y NO la cache. En una PC compartida, el siguiente usuario que entrara
 * dentro del `gcTime` veia el listado del anterior en el primer render.
 *
 * ⚠️ POR QUE ACA Y NO PREFIJANDO LAS KEYS CON `organizacionId`: prefijar obliga a tocar las ~30
 * keys y los ~74 hooks que las consumen, y a repasar cada invalidacion por prefijo — que estan
 * razonadas una por una en `modules/flota/query-keys.ts`. Esto cubre lo mismo desde un solo lugar,
 * y cubre ademas los caminos que todavia no existen: cualquier modulo nuevo queda protegido sin
 * escribir una linea.
 *
 * ⚠️ POR QUE UNA SUSCRIPCION AL STORE Y NO UN `useEffect` SOBRE LA IDENTIDAD: el subscriber de
 * zustand corre **dentro del `set`**, o sea antes de que React re-renderice. Un efecto correria
 * DESPUES del render de la pantalla nueva, que para entonces ya monto sus queries sobre la cache
 * vieja: el usuario alcanzaria a ver el dato ajeno un instante antes de que se limpie.
 */

/** La sesion no autenticada. Se distingue de cualquier identidad real, y de si misma. */
const SIN_SESION = null

type EstadoConIdentidad = {
  snapshot: SessionSnapshot | null
  organizacionActiva: OrganizacionActiva | null
}

/**
 * Identidad de la sesion: el par (usuario, organizacion activa).
 *
 * ⚠️ Son los DOS, no solo la organizacion. Con solo la org, dos usuarios distintos de la MISMA
 * empresa comparten identidad, y el caso de la PC compartida —sesion que vence, entra otro— se
 * escapa entero: es exactamente el escenario del que salio este archivo.
 *
 * Devuelve un string y no un objeto a proposito: se compara por valor con `===`, sin igualdad
 * estructural ni dependencias.
 */
export function identidadDeSesion(estado: EstadoConIdentidad): string | null {
  const usuarioId = estado.snapshot?.usuarioId
  const organizacionId = estado.organizacionActiva?.id

  if (!usuarioId || !organizacionId) return SIN_SESION

  return `${usuarioId}|${organizacionId}`
}

/**
 * Suscribe la purga de cache a los cambios de identidad del store de sesion.
 *
 * Devuelve la funcion para desuscribirse (la firma que espera el `useEffect` que lo monta).
 *
 * Purga en CUALQUIER transicion de identidad, incluida la de sesion a no-sesion: eso es lo que
 * cubre el logout forzado por 401, que hoy no limpiaba nada. El logout explicito
 * (`features/access/hooks/useLogout`) sigue llamando a `clear()` por su cuenta; que se limpie dos
 * veces no cuesta nada y deja el camino explicito legible sin este archivo.
 */
export function suscribirPurgaDeCachePorSesion(queryClient: QueryClient): () => void {
  let identidadAnterior = identidadDeSesion(useSessionStore.getState())

  return useSessionStore.subscribe((estado) => {
    const identidad = identidadDeSesion(estado)
    if (identidad === identidadAnterior) return

    identidadAnterior = identidad
    purgarCache(queryClient)
  })
}

/**
 * Cancela lo que este en vuelo y vacia la cache, en ese orden.
 *
 * El `cancel` primero no es decorativo: aborta los fetch que salieron con el token de la sesion
 * anterior, para que su respuesta no aterrice despues del `clear`. `clear` solo ya seria correcto
 * (React Query descarta el resultado de una query removida), pero cancelar ahorra el request y
 * cierra la ventana sin depender de ese detalle de implementacion.
 */
function purgarCache(queryClient: QueryClient): void {
  void queryClient.cancelQueries()
  queryClient.clear()
}
