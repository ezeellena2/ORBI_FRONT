import type { ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'
import { SinAccesoOverlay } from '@/shared/ui/SinAccesoOverlay'
import { useSessionStore } from '@/stores/session-store'

/**
 * Page-gate por permiso. Transversal: lo usa cualquier modulo, no solo Flota.
 *
 * B-3 RATIFICADO — falta de permiso = OVERLAY que bloquea la pagina, NUNCA `<Navigate>`. Un
 * redirect silencioso le hace creer al usuario que la pantalla no existe, y termina pidiendole a
 * soporte una funcion que si esta, solo que no la tiene habilitada. El overlay muestra el codigo
 * exacto del permiso, que es lo que un admin necesita para darselo.
 *
 * El frontend SOLO lee `organizacionActiva.permisos` del Session Snapshot: nunca lo recalcula ni lo
 * infiere. Esto solo esconde UI; quien autoriza de verdad es el backend (403 del policy-gate).
 *
 * PENDIENTE (DA-nueva): i18n del copy del overlay. Hoy los textos por defecto son los es-AR que
 * trae la primitiva `SinAccesoOverlay`; la estrategia i18n de este copy la decide el PO
 * (`frontend.md` §3.3).
 */
export function RequierePermiso({
  permiso,
  children,
}: {
  permiso: string
  children: ReactNode
}) {
  // El `?? []` va AFUERA del selector a proposito. Zustand 5 corre el selector dentro de
  // useSyncExternalStore: si el default se construye adentro, cada lectura devuelve un array
  // NUEVO, React ve un snapshot distinto por render y entra en "Maximum update depth".
  // Solo se dispara sin organizacion activa, que es justo la ruta degradada. usePermisos.ts
  // ya tenia la forma correcta.
  const permisosDeLaOrg = useSessionStore((s) => s.organizacionActiva?.permisos)
  const permisos = permisosDeLaOrg ?? []
  const navigate = useNavigate()

  if (!permisos.includes(permiso)) {
    return (
      // `SinAccesoOverlay` es `absolute inset-0`: necesita un contenedor posicionado con alto
      // propio, o se colapsa a cero y el bloqueo no se ve.
      <div className="relative min-h-96 flex-1">
        <SinAccesoOverlay permiso={permiso} onVolver={() => navigate('/app')} />
      </div>
    )
  }

  return <>{children}</>
}
