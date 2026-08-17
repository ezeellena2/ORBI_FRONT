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
 * ⚠️ MONTAR UNA RUTA ACA TIENE UN SEGUNDO PASO OBLIGATORIO: borrar su placeholder de `AppRouter`.
 * `<Route path="flota/dispositivos" element={<AppComingSoonPage />} />` es un segmento ESTATICO y el
 * ranking de `react-router` lo pone POR ENCIMA del splat `flota/*`, asi que gana siempre y la
 * pantalla montada aca queda inalcanzable — sin error, sin warning, sin nada que lo delate salvo
 * abrir la URL. Es lo que paso con dispositivos: las 2 paginas existian y no las montaba nadie.
 *
 * Rutas de otros slices: **geozonas** sigue resuelta por el `AppRouter` con su placeholder
 * (DIFERIDO DA-08). Las del **Centro de Problemas** entraron acá con slice-06.
 *
 * ⚠️ Verificado antes de montarlas (2026-08-15): `AppRouter` **no tenia** ninguna linea estatica
 * `flota/problemas`, `flota/problemas/reglas`, `flota/integraciones` ni `flota/alertas`, asi que no
 * hubo placeholder que borrar y estas 3 rutas son alcanzables. `grep "flota/problemas\|flota/
 * integraciones"` sobre `src/` daba 0 hits fuera de este archivo. La unica linea estatica que queda
 * bajo `flota/` es `flota/geozonas`, y esa **tiene que seguir ahi** hasta que DA-08 cierre.
 */

const VehiculosListPage = lazy(() => import('./pages/VehiculosListPage'))
const VehiculoDetallePage = lazy(() => import('./pages/VehiculoDetallePage'))
const OnboardingFlotaPage = lazy(() => import('./pages/OnboardingFlotaPage'))
const DispositivosListPage = lazy(() => import('./pages/DispositivosListPage'))
const DispositivoDetallePage = lazy(() => import('./pages/DispositivoDetallePage'))
const ConductoresListPage = lazy(() => import('./pages/ConductoresListPage'))
const ConductorDetallePage = lazy(() => import('./pages/ConductorDetallePage'))
const MapaEnVivoPage = lazy(() => import('./pages/MapaEnVivoPage'))
const ProblemasOperativosPage = lazy(() => import('./pages/ProblemasOperativosPage'))
const ReglasProblemasPage = lazy(() => import('./pages/ReglasProblemasPage'))
const FlotaIntegracionesPage = lazy(() => import('./pages/FlotaIntegracionesPage'))
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

          {/*
            Dispositivos GPS (slice-03). Mismo par listado/detalle que vehiculos y el MISMO gate:
            `RequierePermiso` bloquea con overlay y muestra el permiso literal, nunca redirige (B-3).
            El backend valida igual y responde 403; esto solo evita pintar una pantalla que va a
            fallar entera.
          */}
          <Route
            path="dispositivos"
            element={
              <RequierePermiso permiso="flota.dispositivos.leer">
                <DispositivosListPage />
              </RequierePermiso>
            }
          />

          <Route
            path="dispositivos/:dispositivoId"
            element={
              <RequierePermiso permiso="flota.dispositivos.leer">
                <DispositivoDetallePage />
              </RequierePermiso>
            }
          />

          {/*
            Conductores operativos (slice-04). Mismo par listado/detalle y el MISMO gate que los
            otros dos recursos: `RequierePermiso` bloquea con overlay y muestra el permiso literal,
            nunca redirige (B-3).

            ⚠️ Al montar esto se BORRO `<Route path="flota/conductores" ...>` de `AppRouter`: ese
            segmento estatico rankeaba por encima del splat `flota/*` y habria dejado estas 2 rutas
            inalcanzables, sin error ni warning.
          */}
          <Route
            path="conductores"
            element={
              <RequierePermiso permiso="flota.conductores.leer">
                <ConductoresListPage />
              </RequierePermiso>
            }
          />

          <Route
            path="conductores/:conductorId"
            element={
              <RequierePermiso permiso="flota.conductores.leer">
                <ConductorDetallePage />
              </RequierePermiso>
            }
          />

          {/*
            Mapa en vivo (slice-05 f-08). El permiso de pagina es el MISMO del listado de vehiculos:
            **no existe `flota.mapa.*`** en el catalogo de 44 permisos, y no se inventa.

            ⚠️ Al montar esto se BORRO `<Route path="flota/mapa" ...>` de `AppRouter`: ese segmento
            estatico rankeaba por encima del splat `flota/*` y habria dejado esta ruta inalcanzable,
            sin error ni warning — con el agravante de que ya habia 2 botones de la ficha del
            vehiculo y la entrada del menu lateral apuntando aca.
          */}
          <Route
            path="mapa"
            element={
              <RequierePermiso permiso="flota.vehiculos.leer">
                <MapaEnVivoPage />
              </RequierePermiso>
            }
          />

          {/*
            CENTRO DE PROBLEMAS (slice-06). Las 3 rutas comparten el gate de siempre:
            `RequierePermiso` bloquea con overlay y muestra EL PERMISO literal, nunca redirige (B-3).

            El segmento literal "problemas/reglas" se declara ANTES que "problemas", con la misma
            convencion que el wizard de vehiculos: un literal siempre arriba de lo que pueda
            capturarlo. Hoy no hay ninguna ruta dinamica bajo `problemas` que pueda comerselo — y
            justamente por eso el orden importa, para que el dia que alguien agregue una la trampa
            este a la vista en el mismo bloque.

            ⚠️ El detalle del problema NO es una ruta: es `?ticket=<problemaId>` sobre
            `/app/flota/problemas` (C-10, query string y nunca hash). Por eso acá hay 1 ruta y no 2.

            ⚠️ NO se monta `problemas/alertas` ni ninguna ruta de senales, y no es un olvido: las
            alertas son SENALES y lo accionable vive en el Centro (B-20 — no hay pantalla propia ni
            item de menu). Ademas su listado devuelve 0 items siempre mientras GATE 2 siga abierto.
          */}
          <Route
            path="problemas/reglas"
            element={
              <RequierePermiso permiso="flota.reglas.leer">
                <ReglasProblemasPage />
              </RequierePermiso>
            }
          />

          <Route
            path="problemas"
            element={
              <RequierePermiso permiso="flota.problemas.leer">
                <ProblemasOperativosPage />
              </RequierePermiso>
            }
          />

          {/*
            `alertas` REDIRIGE al Centro y no tiene pantalla propia (B-20 + `frontend.md` §3.1). Las
            alertas son SEÑALES: lo accionable vive en el Centro de Problemas, no existe
            `flota.alertas.*` en el catálogo de 44 permisos, y su listado devuelve 0 items siempre
            mientras GATE 2 siga abierto. La ruta existe igual porque `alertas.html` es superficie de
            transición del mockup y puede haber links viejos apuntando ahí: mejor redirigir que dar
            un 404 interno.

            `replace` para que el "atrás" del navegador no rebote entre `/alertas` y `/problemas`.
          */}
          <Route path="alertas" element={<Navigate to="../problemas" replace />} />

          {/*
            Integraciones cuelga de `/app/flota/integraciones` y no de `/app/flota/problemas/...`:
            asi lo fija `f-11`, y su permiso es de otro grupo (`flota.integraciones.*`), que
            `supervisor` —quien si tiene `reglas.leer`— no necesariamente tiene.
          */}
          <Route
            path="integraciones"
            element={
              <RequierePermiso permiso="flota.integraciones.leer">
                <FlotaIntegracionesPage />
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
