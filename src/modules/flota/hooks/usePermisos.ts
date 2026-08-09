import { useSessionStore } from '@/stores/session-store'

/**
 * Lectura de los permisos de la organización activa.
 *
 * El frontend SOLO lee `organizacionActiva.permisos` del Session Snapshot: nunca lo recalcula ni lo
 * infiere. Esto únicamente esconde o deshabilita UI — quien autoriza es el backend.
 *
 * El selector devuelve el array TAL CUAL, sin `?? []`: un `?? []` dentro del selector construye un
 * array nuevo en cada lectura, y con `useSyncExternalStore` una referencia nueva por llamada es
 * exactamente lo que dispara el bucle de re-render. El default se aplica afuera, sobre el valor ya
 * memorizado por el store.
 */
export function usePermisos() {
  const permisos = useSessionStore((estado) => estado.organizacionActiva?.permisos)

  return {
    tienePermiso: (permiso: string) => permisos?.includes(permiso) ?? false,
  }
}
