# TracAutoFrontV2 - Reglas para agentes IA

> Este archivo es la fuente de verdad para cualquier agente IA que trabaje en este repositorio.
> Su contenido se replica en AGENTS.md.

---

## 🔴 LEER PRIMERO — la fundación de UI cambió (2026-08-07)

El sistema de diseño y la capa de primitivas de UI se rearquitecturaron. **Lo que
este archivo dice más abajo sobre estilos, tokens y `shared/ui/` quedó viejo** y
está marcado como tal en cada sección. Manda la arquitectura del repo hermano:

```
../TracAutoV2/docsv2/02-arquitectura/frontend/
  README.md                       ← vocabulario, regla de oro, decisiones D1–D11
  01-sistema-de-diseno.md         ← tokens, escalas, temas, puente Tailwind v4
  02-primitivas.md                ← catálogo de primitivas de UI (los 32 P0)
  03-estructura-y-convenciones.md ← dónde va cada archivo
  04-patrones-de-pantalla.md · 05-datos-y-estado.md · 06-capa-0-frontend.md
```

### La regla de oro

> **Un color se escribe UNA sola vez, en `src/styles/primitivas.css`.**
> Es el ÚNICO archivo del frontend con permiso de contener un hex. Un hex en
> cualquier otro archivo es un bug con el mismo peso que un test que falla — y
> el lint lo hace fallar.

### Lo mínimo que hay que saber antes de tocar una línea de UI

| | |
|---|---|
| **Estilos** | `src/styles/{primitivas,semanticas,base}.css` + `temas/*.css`. `base.css` es el ÚNICO entrypoint y el único que Tailwind ve. **`src/index.css` ya no existe.** |
| **Cómo se pinta** | Solo utilidades semánticas: `bg-superficie-1`, `text-fg-primario`, `border-borde`, `bg-accion`. **La paleta default de Tailwind está APAGADA**: `bg-red-500` no genera nada y falla el lint. |
| **Primitivas de UI** | `src/shared/ui/`. Se **adoptan** de shadcn/ui + Base UI (`npx shadcn@latest add <x>`), aterrizan en `src/shared/ui/base/` y se envuelven con la API en español. **No se escriben a mano** (D5). |
| **Vocabulario de shadcn** | `bg-primary`, `text-muted-foreground`, `border-input` solo pueden aparecer **dentro de `src/shared/ui/base/`**. Afuera, lint en rojo. |
| **Tema** | Viaja por `data-theme` en `<html>`. Los 4 temas están declarados; solo `dark` está expuesto. Ningún componente pregunta cuál es el tema. |
| **Verificación** | `npm run lint` (ESLint + reglas ORBI + script de tokens) · `npm run typecheck` · `npm test` · `npm run build` · `npm run build-storybook`. Corren en CI: `.github/workflows/ci.yml`. |
| **Deuda congelada** | `eslint-suppressions.json` congela las violaciones preexistentes del scaffold legacy. El CI falla si el número **crece**. Para bajarlo: `npm run lint:baseline:podar`. |

### Si necesitás un token que no existe

**No lo inventes en el componente.** Pedilo: `01-sistema-de-diseno.md` §10 tiene
el procedimiento. Un token inventado en una pantalla es el origen del drift.

### Si algo no está definido

Escribí `PENDIENTE (DA-FE-xx): <qué falta, quién decide>`. No lo rellenes con
algo plausible.

---

## Documentacion autoritativa

### Repositorio normativo

- El repo hermano **`TracAutoV2`** (clonado al lado, misma carpeta padre) es el
  autoritativo para arquitectura, contratos y mockups. Se referencia como
  `../TracAutoV2/...`.
  > ⚠️ Las rutas absolutas tipo `C:\Users\...\source\repos\TracAutoV2` que
  > aparecen más abajo en este archivo están **derogadas**: el repo se clona en
  > dos máquinas con paths distintos y ninguna ruta absoluta sobrevive a eso.
- `TracAutoFrontV2` es solo la implementacion frontend React.

> ⚠️ **Corregido el 2026-08-17.** Esta sección mandaba leer **19 documentos que no existen**:
> `docs/planes/web/*` (6), `docs/planes/arquitectura-v3/*` (5 + su README) y `docs/mockups/*` (6).
> Las carpetas `docs/planes/` y `docs/mockups/` **fueron eliminadas del repo hermano** — su contenido
> se consolidó en `docsv2/` y los mockups vigentes viven en `docs/mockupsv2/`. Ninguno de los 19
> archivos se perdió: **todos cambiaron de carpeta**, y abajo están sus rutas reales. El daño no era
> el link roto sino el silencio: un agente que no encuentra el archivo improvisa el contrato.

### Web vigente en TracAutoV2

La arquitectura frontend vigente es la que ya lista el bloque **LEER PRIMERO** de arriba:
`../TracAutoV2/docsv2/02-arquitectura/frontend/` (7 documentos, del sistema de diseño a la Capa 0).
No hay otra: `docs/planes/web/` ya no existe.

### Arquitectura y auth a respetar

Todas bajo `../TracAutoV2/docsv2/02-arquitectura/arquitectura-v3-completa/` (mismos nombres de
archivo que antes; lo único que cambió es la carpeta):

- `02-identidad-acceso-y-contexto-activo.md`
- `05-modulos-vistas-y-superficies.md`
- `08-infraestructura-contenedores-y-despliegue.md`
- `12-patrones-de-implementacion-web-y-servicios.md`
- `13-internacionalizacion-localizacion-y-contrato-de-errores.md` — el contrato de error que consume
  `parse-api-error` (`code` / `message_key` / `args`), que esta lista omitía
- `14-cuentas-federadas-y-google-sign-in.md`
- `../../../CLAUDE.md` del backend (`TracAutoV2/CLAUDE.md`)

### Mockups obligatorios

Viven en `../TracAutoV2/docs/mockupsv2/` — **v2, no `docs/mockups/`**, que era el legacy y ya no está
en el repo (ADR-0049). Los 5 de auth conservan su nombre bajo `publico/`:

- `docs/mockupsv2/publico/login/index.html`
- `docs/mockupsv2/publico/login/selector.html`
- `docs/mockupsv2/publico/registro-b2c/index.html`
- `docs/mockupsv2/publico/registro-empresa/index.html`
- `docs/mockupsv2/publico/invitacion/index.html`

> `GUIA-MOCKUPS.md` no tiene reemplazo y no hace falta: el mockup es **referencia visual únicamente**
> y el criterio de cómo leerlo está en el bloque "Diseño y animación" de este archivo.

### Endpoints backend del slice-01

- `POST /api/auth/registro`
- `POST /api/auth/registro-empresa`
- `POST /api/auth/login`
- `POST /api/auth/refresh`
- `POST /api/auth/logout`
- `POST /api/auth/cambiar-contexto`
- `POST /api/auth/aceptar-invitacion`

Si una tarea toca `Google Sign-In`, no asumir endpoints ni contratos por fuera de:

- `../TracAutoV2/docsv2/02-arquitectura/arquitectura-v3-completa/14-cuentas-federadas-y-google-sign-in.md`
  (era una ruta absoluta a un archivo inexistente — las dos cosas que este archivo ya declaraba
  derogadas más arriba, y la única ruta absoluta que quedaba)

Backend base URL en desarrollo — **single-origin** (ADR-0081):

- El front pega a `/api/*` **relativo** (mismo origen), NO a una URL absoluta. `VITE_API_BASE_URL` vacío por defecto.
- En dev, el proxy de Vite (`server.proxy['/api']`) reenvía `/api` al **API Gateway** (`https://localhost:7101`), que
  rutea a cada microservicio (Access `7201`, PlataformaCanonica `7203`, ...). El header de cliente es `X-orbi-Client`.
- Detalle y topología de contenedores: `TracAutoV2/docsv2/adr/0081-api-gateway-yarp-single-origin.md`.

## Stack y versiones instaladas

Versiones tomadas de `package.json`:

- React `19.2.4`
- React DOM `19.2.4`
- TypeScript `5.9.3`
- Vite `8.0.1`
- TailwindCSS `4.2.2`
- TanStack React Query `5.96.1`
- Zustand `5.0.12`
- React Router DOM `7.14.0`
- i18next `26.0.3`
- react-i18next `17.0.2`
- React Hook Form `7.72.0`
- Zod `4.3.6`
- Axios `1.14.0`
- Lucide React `1.7.0`

## Estructura de carpetas

```text
src/
  app/              # Bootstrap, providers, routing, shells, layout
  config/           # Variables de entorno y config de cliente
  features/         # access, context, profile, shell
  services/         # http, contracts, session, adapters
  stores/           # session, context, shell, preferences
  modules/          # modulos de negocio; vacio al inicio
  shared/           # ui, forms, i18n, errors, hooks, types, utils
```

## Reglas no negociables

- Web es superficie cliente, no backend.
- Web no inventa identidad, contexto, visibilidad ni permisos.
- Web no consulta directo `Traccar`.
- Web no consulta directo `Telemetria` para descubrir recursos visibles.
- No copiar DTOs, rutas ni logica del frontend v1.
- `B2B` y `B2C` se derivan de `esMicroOrg` de la org activa; no existe `tipo_contexto`.
- Todo texto visible debe pasar por i18n.
- HTTP vive centralizado en `services/`; una pantalla nunca llama `fetch` o `axios` directo.
- Estado global minimo en stores: sesion, contexto, shell, preferencias.
- Estado de feature y pantalla en React Query y estado local.
- Formularios con React Hook Form + Zod.
- Validacion de cliente con Zod; la validacion real del backend sigue en `Access`.
- No crear stores gigantes que simulen un backend.
- No duplicar navegacion por usuario `B2B` o `B2C`.
- No persistir secretos durables en `localStorage` o `sessionStorage`.
- Access token en memoria. Refresh token web en cookie HttpOnly manejada por backend.
- Si se implementa login federado, la pagina no inicializa el SDK en linea; usa adapter compartido + hook de feature.
- Si `Access` devuelve `requires_profile_completion` o `requires_account_link`, la UI ramifica por ese outcome; no lo deduce desde `detail`.

### React 19 y performance

- React 19 tiene Compiler: NO usar `React.memo`, `useMemo` ni `useCallback` manualmente — el compilador los aplica automaticamente.
- Usar `use()` en vez de `useContext()` (React 19).
- Usar `useTransition` para updates no urgentes (search, filtering).
- Lazy state initialization: `useState(() => expensiveComputation())`.
- Named functions en useEffect: `useEffect(function syncTitle() { ... }, [deps])`.
- Functional setState: `setCount(prev => prev + 1)` en vez de `setCount(count + 1)`.
- Condicionales con ternario, no con `&&` (evita renderizar `0` o valores falsy).

### Accesibilidad (obligatorio)

- Contraste minimo 4.5:1 entre texto y fondo.
- Touch targets minimo 44x44px.
- Focus rings visibles (2-4px) en todo elemento interactivo.
- Spacing scale consistente: multiplos de 4px (4, 8, 12, 16, 24, 32, 48).
- Toda animacion respeta `prefers-reduced-motion`.
- Labels visibles en formularios — no solo placeholder.
- `aria-label` en botones que solo tienen icono.

### Composicion de componentes

- Variantes explicitas en vez de props booleanos: `<PrimaryButton>` en vez de `<Button primary={true}>`.
- Componentes compuestos (compound components) con contexto para UI compleja.
- Componentes chicos (< 20 lineas de JSX). Si crece, extraer.
- Funciones con 0-2 argumentos. Si necesita mas, usar objeto de config.
- Error boundaries por feature/seccion, no uno global.

### Diseño y animacion

> ⚠️ **CORREGIDO — ver el bloque "LEER PRIMERO" del principio.**

- Los mockups de `../TracAutoV2/docs/mockupsv2/` son **referencia visual
  ÚNICAMENTE**. Se toma el lenguaje (dark-first, cyan + ámbar, las escalas, la
  firma visual); **NO se copia su CSS ni su JS**, nunca. Decisión del PO.
  El porqué —los 5 defectos estructurales de ese CSS, incluido el `zoom: 0.75`
  que rompe Leaflet y el hit-testing— está en `01-sistema-de-diseno.md` §11.
- El look sale de los TOKENS, no del mockup: si un valor no existe como token,
  se pide el token, no se copia el píxel.
- Animaciones: duraciones tokenizadas (`--duration-fast` 150ms ·
  `--duration-normal` 200ms · `--duration-slow` 300ms) y curvas `--ease-*`.
  Toda animación respeta `prefers-reduced-motion` (ya está el reset global).
- Si el mockup y la doc de arquitectura se contradicen: **manda la doc**, y se
  reporta el drift.

## Patrones de implementacion

### 1. Features y custom hooks

Cada feature (login, registro, invitacion) se implementa como un custom hook que encapsula:
- la llamada al servicio HTTP
- la actualizacion del store
- el manejo de errores
- el estado de loading

```
features/
  access/
    hooks/
      useLogin.ts              ← custom hook
      useRegistro.ts
      useRegistroEmpresa.ts
    pages/
      LoginPage.tsx            ← componente de pagina (UI)
      RegistroPage.tsx
    schemas/
      login-schema.ts          ← schema Zod del formulario
      registro-schema.ts
```

Ejemplo de hook:

```typescript
// features/access/hooks/useLogin.ts
export function useLogin() {
  const login = useSessionStore((s) => s.login)
  const navigate = useNavigate()

  return useMutation({
    mutationFn: (data: LoginRequest) => authService.login(data),
    onSuccess: (response) => {
      login(response.data)
      navigate('/app')
    },
  })
}
```

Reglas:
- el hook usa `useMutation` de React Query para manejar loading/error/success automaticamente
- el hook actualiza el store de Zustand en `onSuccess`
- la pagina solo llama al hook y renderiza UI
- la pagina NUNCA importa `authService` ni `useSessionStore` directo — usa el hook

### 2. Formularios con React Hook Form + Zod

Cada formulario tiene 3 piezas: schema Zod, hook de mutation, componente de pagina.

```typescript
// features/access/schemas/login-schema.ts
import { z } from 'zod'

export const loginSchema = z.object({
  email: z.string().min(1, 'auth.errors.emailRequired').email('auth.errors.emailInvalid'),
  password: z.string().min(1, 'auth.errors.passwordRequired'),
})

export type LoginFormData = z.infer<typeof loginSchema>
```

```typescript
// features/access/pages/LoginPage.tsx
const form = useForm<LoginFormData>({
  resolver: zodResolver(loginSchema),
})

const loginMutation = useLogin()

const onSubmit = (data: LoginFormData) => {
  loginMutation.mutate(data)
}
```

Reglas:
- los mensajes de error de Zod son claves i18n (ej: `auth.errors.emailRequired`), no strings sueltos
- un schema por formulario, en carpeta `schemas/`
- el schema valida formato del lado cliente; la validacion real la hace el backend
- React Hook Form maneja dirty/touched/errors automaticamente

### 3. Errores del backend a la UI

El backend devuelve errores en formato ProblemDetails:

```json
// Error de validacion (400)
{
  "type": "https://tracauto.com/errors/validation",
  "title": "Solicitud invalida",
  "status": 400,
  "code": "validation.failed",
  "message_key": "errors.validation.failed",
  "trace_id": "00-abc123...",
  "validation_errors": {
    "Email": [
      {
        "code": "validation.email.required",
        "message_key": "validation.email.required",
        "message": "El email es obligatorio.",
        "args": {}
      }
    ]
  },
  "errors": {
    "Email": ["El email es obligatorio."]
  }
}

// Error de negocio (409)
{
  "type": "https://tracauto.com/errors/conflict",
  "title": "Conflicto",
  "status": 409,
  "detail": "Ya existe una cuenta con este email.",
  "code": "auth.email_duplicado",
  "message_key": "errors.auth.email_duplicado",
  "args": {},
  "trace_id": "00-abc123..."
}
```

El frontend los maneja asi:

```typescript
// shared/errors/parse-api-error.ts
export function parseApiError(error: unknown): ApiError {
  // extrae code, messageKey, args, traceId, validationErrors y fieldErrors legacy
}
```

En el componente o hook de feature:

```typescript
if (mutation.error) {
  const apiError = parseApiError(mutation.error)
  const generalError = resolveApiErrorMessage(apiError, t)
  const fieldErrors = resolveApiFieldErrors(apiError, t)

  Object.entries(fieldErrors).forEach(([field, message]) => {
    form.setError(field as never, { message })
  })
}
```

Reglas:
- `parseApiError` en `shared/errors/` — unico lugar que parsea errores de axios
- `resolveApiFieldErrors()` es la fuente primaria para mapear errores del backend al formulario
- `resolveApiErrorMessage()` es la fuente primaria para el mensaje general
- la UI resuelve copy desde `message_key` y, si falta, desde `errors.${code}`
- `detail` y `title` son solo fallback de ultimo recurso; no son contrato UX
- `validation_errors` es el formato vigente; `errors` se mantiene como compatibilidad legacy
- errores de negocio (409, 401, 403) se muestran como alerta general arriba del form
- errores de red (sin response) se muestran como error no recuperable
- nunca mostrar mensajes tecnicos del backend directo al usuario sin mapear

### 4. Routing y guards

3 shells separados:

```
AppRouter
  ├── BootstrapShell      → ruta "/" — verifica si hay sesion recuperable
  ├── AuthShell            → rutas "/auth/*" — login, registro, invitacion (publicas)
  └── AppShell             → rutas "/app/*" — shell autenticado (protegidas)
```

Guard de proteccion:

```typescript
// app/routing/ProtectedRoute.tsx
export function ProtectedRoute({ children }: PropsWithChildren) {
  const isAuthenticated = useSessionStore((s) => s.isAuthenticated)

  if (!isAuthenticated) {
    return <Navigate to="/auth/login" replace />
  }

  return <>{children}</>
}
```

Guard de redireccion (si ya esta autenticado, no mostrar login):

```typescript
// app/routing/PublicOnlyRoute.tsx
export function PublicOnlyRoute({ children }: PropsWithChildren) {
  const isAuthenticated = useSessionStore((s) => s.isAuthenticated)

  if (isAuthenticated) {
    return <Navigate to="/app" replace />
  }

  return <>{children}</>
}
```

Reglas:
- las rutas protegidas SIEMPRE pasan por `ProtectedRoute`
- si un usuario autenticado intenta ir a `/auth/login`, se redirige a `/app`
- el bootstrap verifica si hay cookie de refresh y puede rehidratar la sesion
- no hay guards por "tipo de usuario" — solo autenticado o no

### 5. Stores Zustand

Solo 2 stores globales para el slice-01:

**SessionStore** (ya creado):
- `accessToken`, `snapshot`, `isAuthenticated`, `esContextoPersonal`
- `login()`, `updateContext()`, `logout()`

**Regla de lectura desde componentes:**

```typescript
// Correcto: selector especifico (solo re-renderiza si cambia ese valor)
const nombre = useSessionStore((s) => s.snapshot?.nombre)
const isAuth = useSessionStore((s) => s.isAuthenticated)

// Incorrecto: leer todo el store (re-renderiza con cualquier cambio)
const session = useSessionStore()
```

Reglas:
- los componentes leen del store con selectores especificos
- solo los hooks de features escriben en el store (nunca un componente de UI directo)
- si un dato solo lo necesita una pantalla, no va en el store global — va en React Query o estado local

### 6. Servicios HTTP

Estructura:

```
services/
  http/
    http-client.ts          ← axios instance con interceptors (ya creado)
  auth/
    auth-service.ts         ← funciones que llaman endpoints de Access (ya creado)
  session/
    http-session-bridge.ts  ← bridge token store → http client (ya creado)
    setup-session-bridge.ts ← conexion bridge → Zustand (ya creado)
  contracts/
    auth.ts                 ← tipos TypeScript de requests/responses (ya creado)
```

Regla: cuando se agreguen modulos (flota, taller, etc.), cada uno agrega su service:

```
services/
  flota/
    flota-service.ts        ← funciones HTTP del modulo Flota
  contracts/
    auth.ts
    flota.ts                ← tipos de Flota
```

Un servicio es un objeto con funciones puras que hacen HTTP. No tiene estado, no actualiza stores.

### 7. i18n — organizacion de claves

```
shared/i18n/locales/
  es-AR/
    common.json             ← textos genericos (botones, labels, errores comunes)
    auth.json               ← textos de auth (login, registro, errores de auth)
```

Convenciones:
- namespace por area funcional: `common`, `auth`, `flota`, etc.
- claves jerarquicas: `auth.login.title`, `auth.errors.emailRequired`, `auth.registro.step1.title`
- errores de Zod usan claves i18n que se resuelven en el componente con `t()`
- cada feature puede tener su propio namespace

### 8. Componentes de UI compartidos

> ⚠️ **SECCIÓN DEROGADA — ver el bloque "LEER PRIMERO" del principio.**
> Los cinco componentes de abajo son el scaffold del slice-01 y se movieron a
> `src/shared/ui/legacy/`. Se conservan porque el plan de migración del scaffold
> es una decisión abierta (`DA-FE-07` de `06-capa-0-frontend.md`), no porque
> sean el patrón.

La capa vigente:

```
src/shared/ui/
  base/                   ← lo que copia `npx shadcn@latest add`. Es CÓDIGO NUESTRO.
                            Idioma interno: el vocabulario de shadcn. Ver su README.
  Boton.tsx  Input.tsx  Tabla.tsx  Modal.tsx  …   ← las primitivas de ORBI
  *.stories.tsx           ← una story POR CADA ESTADO (R3 de `02-primitivas.md`)
  legacy/                 ← el scaffold viejo. Se borra al cerrar DA-FE-07.
```

Reglas:
- los componentes de `shared/ui/` no importan de `features/`, `modules/`, `app/`
  ni `stores/` — hay una regla de lint que lo hace fallar
- son puros: reciben props, renderizan UI. Sin `fetch`, sin router, sin permisos
- **cero valores de pintura**: ni hex, ni `rgba()`, ni `rounded-[10px]`, ni
  `var(--p-*)`. Solo utilidades semánticas
- si falta un componente base, **no se escribe a mano**: se trae con el CLI de
  shadcn y se envuelve

<details>
<summary>Lo que decía esta sección (histórico)</summary>

```
shared/
  ui/
    Button.tsx              ← boton con variantes (primary, secondary, danger)
    Input.tsx               ← input controlado con label + error
    Alert.tsx               ← alerta para mensajes de error/exito
    LoadingSpinner.tsx      ← spinner de carga
    FormField.tsx           ← wrapper input + label + error + React Hook Form
```

</details>

### 9. Antipatrones

Se consideran antipatrones:

- importar `authService` o `useSessionStore` directo desde un componente de pagina (usar el custom hook)
- hacer `fetch` o `axios.post` desde un componente de pagina
- crear un store para datos que solo usa una pantalla
- poner logica de negocio en componentes de UI
- hardcodear texto visible sin i18n
- crear rutas separadas para "B2B" y "B2C"
- guardar el access token en localStorage
- mostrar mensajes de error del backend sin parsear
- crear un formulario sin schema Zod
- leer todo el store sin selector (`useSessionStore()` sin arrow function)
- usar `React.memo`, `useMemo` o `useCallback` manualmente (React 19 Compiler lo hace)
- usar `useContext()` en vez de `use()` (React 19)
- usar `&&` para conditional rendering (usar ternario)
- crear componentes con props booleanos tipo `<Button primary={true}>` (usar variantes explicitas)
- formularios con placeholder como unico label (siempre label visible)
- elementos interactivos sin focus ring visible
- ignorar `prefers-reduced-motion` en animaciones
- componentes de mas de 20 lineas de JSX sin extraer
- barrel imports (`index.ts` que re-exporta todo) en carpetas grandes

### 10. Checklist

Antes de aprobar un cambio:

#### Funcionalidad
- todo formulario tiene schema Zod con mensajes i18n?
- toda feature tiene custom hook con useMutation/useQuery?
- el hook actualiza el store, no el componente?
- los errores del backend se parsean con `parseApiError`?
- errores de validacion se mapean a campos del form?
- rutas protegidas pasan por `ProtectedRoute`?

#### Calidad de codigo
- no hay texto visible hardcodeado?
- selectores de store son especificos (no leer todo)?
- componentes < 20 lineas de JSX?
- no hay `React.memo`, `useMemo` ni `useCallback` manual?
- condicionales con ternario, no con `&&`?

#### Accesibilidad
- labels visibles en formularios (no solo placeholder)?
- focus rings visibles en elementos interactivos?
- touch targets minimo 44x44px?
- contraste texto/fondo >= 4.5:1?
- animaciones respetan `prefers-reduced-motion`?
- botones con solo icono tienen `aria-label`?

#### Build
- `npm run typecheck` pasa?
- `npm run lint` pasa? (incluye las reglas de color de ORBI + el script de tokens)
- `npm test` pasa?
- `npm run build` y `npm run build-storybook` pasan?
- ¿hay una story por cada estado nuevo?
- ¿la UI sale de los TOKENS del sistema (`bg-superficie-1`, `text-fg-primario`),
  no de valores copiados del mockup?

## Antes de codear

1. Leer el plan que corresponda en `../TracAutoV2/docsv2/04-implementacion/`. Si la tarea es de un
   módulo **con doc co-locada** (hoy solo Flota), su plan manda y vive en
   `../TracAutoV2/src/<Modulo>/docs/` — arrancando por su `ESTADO.md`.
   (Decía `docs/implementacion/slice-01-auth-identidad/`: esa carpeta ya no existe en ninguno de los
   dos repos.)
2. Releer los docs normativos de frontend del backend — los 7 de
   `../TracAutoV2/docsv2/02-arquitectura/frontend/`.
3. Abrir el mockup HTML si la tarea toca UI (`../TracAutoV2/docs/mockupsv2/`).
4. Si falta un contrato backend, dejar el hueco visible y no inventarlo.

## Despues de codear

Verificar siempre:

- `npm run typecheck` · `npm run lint` · `npm test` · `npm run build` ·
  `npm run build-storybook` (es lo mismo que corre el CI)
- que no haya texto visible fuera de i18n
- que no haya `fetch` o `axios` ad hoc en pantallas
- que `esMicroOrg` sea la unica base para derivar contexto personal/empresa
- que **ningún** color venga de un literal, de la paleta default de Tailwind, de
  una clase arbitraria ni del vocabulario de shadcn fuera de `shared/ui/base/`
  — el lint lo verifica, pero si te lo bloqueó, la respuesta NO es agregar una
  excepción: es usar el token, o pedirlo
- que `eslint-suppressions.json` **no haya crecido**. Si crece, se metió una
  violación nueva en un archivo que ya tenía deuda congelada

## Evidencia obligatoria de lectura

Antes de implementar cualquier cambio, el agente DEBE crear un artefacto `pre-implementacion.md` con:

1. **Archivos normativos leidos** — nombre del archivo + cantidad de lineas (como evidencia de lectura real)
2. **Skills consultados** — nombre del skill + motivo de consulta
3. **Backend duenio** de cada pantalla involucrada en el cambio
4. **Restricciones arquitectonicas** que aplican al cambio especifico
5. **Huecos documentales** encontrados (contratos no cerrados, ambiguedades, etc.)

> ⚠️ **Honestidad sobre el enforcement (2026-08-17).** Esta sección decía *"si el agente no puede
> producir este artefacto, el cambio se rechaza"*, y **nadie rechaza nada**: no hay script, hook ni
> job de CI que busque un `pre-implementacion.md`. Es la misma corrección que ya lleva
> `TracAutoV2/CLAUDE.md` en su sección equivalente. El preflight vale igual —es lo que evita arrancar
> sobre terreno equivocado— pero **hoy lo sostiene tu criterio, no una puerta**.

## Skills disponibles y mapeo por tipo de tarea

> ⚠️ **Verificado el 2026-08-17: 4 de los 9 skills que esta tabla declaraba obligatorios no existen
> con ese nombre** (`solid`, `architecture-patterns`, `react-best-practices`,
> `verification-before-completion`), y la segunda tabla —«nombres comunes → skill real instalado»—
> mapeaba cada nombre **a sí mismo**, así que no resolvía nada. Un agente que intenta invocarlos
> falla y sigue de largo. Abajo quedan solo los que están instalados de verdad.

| Tipo de tarea | Skills disponibles |
|---------------|--------------------|
| Crear componente React / formulario | `frontend-design` |
| Accesibilidad y auditoría visual | `web-design-guidelines`, `frontend-design` |
| Diseño de UI (estilos, paletas, tipografía) | `ui-ux-pro-max` |
| Refactoring | `clean-code` |
| Planificación de tareas | `writing-plans` o `implementation-planner` |
| Ejecutar un plan ya escrito | `executing-plans` |
| Premisas de ORBI (tenancy, permisos, eventos) | `orbi-premisas` |

Los que la tabla vieja pedía y **no** están instalados: `solid`, `architecture-patterns`,
`react-best-practices`, `verification-before-completion`, `code-review`. Hay equivalentes provistos
por plugins, que se invocan con su prefijo (`superpowers:verification-before-completion`,
`superpowers:test-driven-development`, `code-review:code-review`) — **si el plugin está activo en esa
sesión**, cosa que este archivo no puede garantizar. Instalar los faltantes como skills propios del
repo es decisión del PO, no de un agente.
