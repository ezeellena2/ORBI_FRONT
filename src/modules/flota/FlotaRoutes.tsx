import { lazy, Suspense } from 'react'
import { Navigate, Route, Routes } from 'react-router-dom'
import { RequiereModulo } from '@/shared/auth/permissions/RequiereModulo'
import { RequierePermiso } from '@/shared/auth/permissions/RequierePermiso'
import { Spinner } from '@/shared/ui/Spinner'

/**
 * Rutas del modulo Flota — patron unico de `frontend.md` §3.2 (A-13).
 *
 * REGLA DURA: este componente renderiza un `<Routes>` INTERNO con rutas relativas, y el padre lo
 * registra con `path="flota/*"` (el splat es obligatorio). La variante que devolvia
 * `<Route path="flota">` desde un componente queda derogada: `react-router` 7 tiene un invariant
 * incondicional en `createRoutesFromChildren` que voltea la app entera en cualquier URL si un hijo
 * de `<Routes>` no es un `<Route>` literal.
 *
 * Lazy loading: el JS de Flota no se descarga hasta navegar al modulo.
 *
 * DUENIO DEL ARCHIVO: el paso que construye el cimiento del slice. Las pantallas se llenan en sus
 * propios archivos; este no se toca para agregar UI.
 *
 * Rutas de otros slices (mapa, dispositivos, conductores, geozonas, problemas, integraciones)
 * todavia NO estan aca: siguen resueltas por el `AppRouter` con su placeholder. Se mudan a este
 * archivo cuando su slice las construya.
 */

const VehiculosListPage = lazy(() => import('./pages/VehiculosListPage'))
const VehiculoDetallePage = lazy(() => import('./pages/VehiculoDetallePage'))
const OnboardingFlotaPage = lazy(() => import('./pages/OnboardingFlotaPage'))
const NotFoundPage = lazy(() => import('./pages/NotFoundPage'))

function FlotaCargando() {
  return (
    <div className="flex items-center justify-center py-24">
      <Spinner tamano="lg" />
    </div>
  )
}

export default function FlotaRoutes() {
  return (
    <RequiereModulo modulo="flota">
      <Suspense fallback={<FlotaCargando />}>
        <Routes>
          <Route index element={<Navigate to="vehiculos" replace />} />

          <Route
            path="vehiculos"
            element={
              <RequierePermiso permiso="flota.vehiculos.leer">
                <VehiculosListPage />
              </RequierePermiso>
            }
          />

          {/*
            ORDEN CRITICO: "vehiculos/onboarding" va ANTES de "vehiculos/:vehiculoFlotaId".
            Si va despues, la palabra "onboarding" se parsea como un id de vehiculo y el wizard
            queda inalcanzable.
          */}
          <Route
            path="vehiculos/onboarding"
            element={
              <RequierePermiso permiso="flota.vehiculos.crear">
                <OnboardingFlotaPage />
              </RequierePermiso>
            }
          />

          <Route
            path="vehiculos/:vehiculoFlotaId"
            element={
              <RequierePermiso permiso="flota.vehiculos.leer">
                <VehiculoDetallePage />
              </RequierePermiso>
            }
          />

          {/* Sin esto, una URL inexistente de Flota cae en el catch-all "Proximamente" del AppRouter. */}
          <Route path="*" element={<NotFoundPage />} />
        </Routes>
      </Suspense>
    </RequiereModulo>
  )
}
