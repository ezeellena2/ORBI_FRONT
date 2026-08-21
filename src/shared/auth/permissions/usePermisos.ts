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
/**
 * El predicado, aislado de React para poder testearlo.
 *
 * El proyecto `unit` de Vitest corre con `environment: 'node'` a propósito (ver `vite.config.ts`):
 * cubre lógica pura y el comportamiento de componentes se verifica en el proyecto `storybook`,
 * contra un browser real. Sacar esta línea del hook es lo que la hace alcanzable desde `unit` sin
 * meter un tercer paradigma de test en el repo. El comportamiento es idéntico al de antes.
 *
 * El `?? false` es la parte que importa: sin organización activa se responde **que no**. Un default
 * permisivo acá abre botones que el backend después rechaza con 403.
 */
export function tienePermisoEn(
  permisos: readonly string[] | undefined,
  permiso: string
): boolean {
  return permisos?.includes(permiso) ?? false
}

export function usePermisos() {
  const permisos = useSessionStore((estado) => estado.organizacionActiva?.permisos)

  return {
    tienePermiso: (permiso: string) => tienePermisoEn(permisos, permiso),
  }
}
