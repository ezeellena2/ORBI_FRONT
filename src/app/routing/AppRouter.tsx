import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { AuthShell } from '@/app/shells/AuthShell'
import { AppShell } from '@/app/shells/AppShell'
import { ErrorBoundary } from '@/shared/errors/ErrorBoundary'
import { ProtectedRoute } from './ProtectedRoute'
import { PublicOnlyRoute } from './PublicOnlyRoute'

// Pages — landing (publica)
import { LandingPage } from '@/features/landing/pages/LandingPage'

// Pages — auth (publicas)
import { LoginPage } from '@/features/access/pages/LoginPage'
import { RegistroPage } from '@/features/access/pages/RegistroPage'
import { RegistroEmpresaPage } from '@/features/access/pages/RegistroEmpresaPage'
import { RegistroEmailVerificationPage } from '@/features/access/pages/RegistroEmailVerificationPage'
import { AceptarInvitacionPage } from '@/features/access/pages/AceptarInvitacionPage'
import { GoogleCompletionPage } from '@/features/access/pages/GoogleCompletionPage'
import { SolicitarRecuperacionPage } from '@/features/access/pages/SolicitarRecuperacionPage'
import { RestablecerPasswordPage } from '@/features/access/pages/RestablecerPasswordPage'

// Pages — app (protegidas)
import { DashboardPage } from '@/features/shell/pages/DashboardPage'
import { ContextSelectorPage } from '@/features/context/pages/ContextSelectorPage'

// Modulos de negocio
import FlotaRoutes from '@/modules/flota/FlotaRoutes'

function AppComingSoonPage() {
  const { t } = useTranslation()
  return (
    <div className="flex flex-col items-center justify-center py-24 text-center">
      <p className="text-base font-medium text-text-primary">{t('shell.placeholder.title')}</p>
      <p className="mt-2 text-sm text-text-tertiary">{t('shell.placeholder.comingSoon')}</p>
    </div>
  )
}

export function AppRouter() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Landing: pagina publica de producto */}
        <Route path="/" element={<LandingPage />} />

        {/* Auth: pantallas publicas de acceso */}
        <Route
          path="/auth"
          element={
            <PublicOnlyRoute>
              <ErrorBoundary>
                <AuthShell />
              </ErrorBoundary>
            </PublicOnlyRoute>
          }
        >
          <Route path="login" element={<LoginPage />} />
          <Route path="recuperar-password" element={<SolicitarRecuperacionPage />} />
          <Route path="restablecer-password" element={<RestablecerPasswordPage />} />
          <Route path="registro" element={<RegistroPage />} />
          <Route path="registro-empresa" element={<RegistroEmpresaPage />} />
          <Route path="verificar-email-registro" element={<RegistroEmailVerificationPage />} />
          <Route path="aceptar-invitacion" element={<AceptarInvitacionPage />} />
          <Route path="google/completar-registro" element={<GoogleCompletionPage />} />
          <Route index element={<Navigate to="login" replace />} />
        </Route>

        {/* App: pantallas protegidas */}
        <Route
          path="/app"
          element={
            <ProtectedRoute>
              <ErrorBoundary>
                <AppShell />
              </ErrorBoundary>
            </ProtectedRoute>
          }
        >
          <Route index element={<DashboardPage />} />
          <Route path="selector" element={<ContextSelectorPage />} />

          {/*
            Flota — el splat es obligatorio (frontend.md §3.2): FlotaRoutes renderiza su propio
            <Routes> interno con rutas relativas. Cubre /app/flota (redirige a vehiculos), los
            listados y detalles de vehiculos, DISPOSITIVOS y CONDUCTORES, y el wizard.

            Las 2 rutas de abajo son de OTROS slices y siguen en el placeholder: al ser segmentos
            estaticos, el router las rankea POR ENCIMA del splat y no las captura FlotaRoutes.

            ⚠️ Esa misma precedencia es una trampa: mientras existio `flota/dispositivos` aca, el
            placeholder ganaba y las 2 pantallas de dispositivos —que ya existian en el modulo—
            eran INALCANZABLES, sin error ni warning. Al montar una ruta en FlotaRoutes hay que
            BORRAR su linea de esta lista, no solo agregarla alla. `flota/conductores` se borro de
            aca al montar sus 2 rutas en FlotaRoutes (slice-04), por esta misma razon.
          */}
          <Route path="flota/*" element={<FlotaRoutes />} />
          <Route path="flota/mapa" element={<AppComingSoonPage />} />
          <Route path="flota/geozonas" element={<AppComingSoonPage />} />

          {/* Configuracion */}
          <Route path="configuracion/empresa" element={<AppComingSoonPage />} />
          <Route path="configuracion/modulos" element={<AppComingSoonPage />} />
          <Route path="configuracion/facturacion" element={<AppComingSoonPage />} />
          <Route path="configuracion/notificaciones" element={<AppComingSoonPage />} />
          <Route path="configuracion/integraciones" element={<AppComingSoonPage />} />
          <Route path="configuracion/seguridad" element={<AppComingSoonPage />} />
          <Route path="configuracion/apariencia" element={<AppComingSoonPage />} />
          <Route path="configuracion/roles" element={<AppComingSoonPage />} />

          {/* Sistema */}
          <Route path="usuarios" element={<AppComingSoonPage />} />
          <Route path="perfil" element={<AppComingSoonPage />} />

          {/* Catch-all dentro de /app */}
          <Route path="*" element={<AppComingSoonPage />} />
        </Route>

        <Route path="/reset-password" element={<LegacyResetPasswordRedirect />} />

        {/* Fallback */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  )
}

function LegacyResetPasswordRedirect() {
  const location = useLocation()
  return <Navigate to={`/auth/restablecer-password${location.search}`} replace />
}
