<!--
  ═══════════════════════════════════════════════════════════════════════════
  ARCHIVO GENERADO — NO LO EDITES ACÁ.

  El original vive en el repo normativo: TracAutoV2/docsv2/00-ai-context/reglas/frontend-core.md
  Esta copia existe porque un `@import` que sale del repo queda detrás de un diálogo de
  aprobación y, si alguien lo declina una vez, se apaga para siempre y en silencio
  (DA-FE-31). Un import que no resuelve es peor que no tenerlo.

  Se regenera con:  node docsv2/scripts/sincronizar-reglas-front.mjs   (desde TracAutoV2)
  origen-sha256: f99022f73e6715ab
  sincronizado: 2026-08-19
  ═══════════════════════════════════════════════════════════════════════════
-->
<!-- FIN DEL BANNER GENERADO -->
---
tipo: regla
scope: global
alwaysApply: false
globs: "TracAutoFrontV2/src/**"
descripcion: "Las leyes no negociables del frontend React. Use when escribís, revisás o planificás cualquier pantalla, componente o módulo del front."
severidad: dura
verificable_por: "orbi-lint (5 reglas de color) + eslint no-restricted-imports (fronteras) + script:TracAutoFrontV2/scripts/verificar-tokens.mjs + script:TracAutoFrontV2/scripts/verificar-i18n.mjs (PARIDAD entre idiomas, NO ausencia de texto hardcodeado) | ninguno (solo humano) — deuda: los 4 verificadores cubren 2 de las 8 leyes de esta pagina. PRECISADO 2026-08-19: §7 atribuia a verificar-i18n.mjs el control de 'cero texto hardcodeado', que ese script no hace"
actualizado: 2026-08-18
---

# Frontend Core — leyes de toda pantalla

> La base que aplica **siempre** en `TracAutoFrontV2`, sin importar en qué módulo estés.
> Cada punto tiene su documento con el detalle. Esto es el resumen ejecutable.

> 📍 **Convención de rutas de este archivo — corregida el 2026-08-18.**
> Este archivo **se lee desde los dos repos**: el original vive en `TracAutoV2/` y una copia generada
> se lee desde `TracAutoFrontV2/docs/reglas/`. Por eso **toda ruta lleva su repo adelante**
> (`TracAutoV2/docsv2/…`, `TracAutoFrontV2/src/…`), y se interpreta desde la carpeta **que contiene a
> los dos**.
>
> *Por qué:* hasta hoy estaba escrito desde el punto de vista de `TracAutoV2` —decía cosas como *"el
> repo del front es hermano de este"* y citaba `docsv2/…` a secas—. Leído desde adentro del front,
> **la mitad de los punteros apuntaba a ninguna parte**: `docsv2/` no existe ahí, y `../TracAutoFrontV2/`
> salía del repo para volver a entrar. Una regla que llega pero cuyos punteros no resuelven degrada
> justo lo que el mecanismo de entrega vino a resolver.

## Las leyes, en una tabla

| # | Ley | Detalle en |
|---|---|---|
| 1 | Un color se escribe UNA vez, en la capa de tokens | `TracAutoV2/docsv2/02-arquitectura/frontend/01-sistema-de-diseno.md` |
| 2 | Las primitivas de UI se **adoptan**, no se escriben | `TracAutoV2/docsv2/02-arquitectura/frontend/02-primitivas.md` |
| 3 | Si la pieza compartida no existe, **se pide — no se fabrica** | `TracAutoV2/docsv2/02-arquitectura/frontend/07-capa-compartida.md` |
| 4 | Un módulo nunca importa de otro módulo | `TracAutoFrontV2/eslint.config.js` (F8/F9) |
| 5 | Un módulo se enchufa por su manifiesto, no tocando el shell | `TracAutoV2/docsv2/02-arquitectura/frontend/08-enchufe-de-modulo.md` |
| 6 | El error del backend pasa siempre por `parseApiError` | `TracAutoV2/docsv2/.../13-internacionalizacion-localizacion-y-contrato-de-errores.md` |
| 7 | Cero texto hardcodeado: i18n siempre | `TracAutoV2/docsv2/02-arquitectura/frontend/03-estructura-y-convenciones.md` |
| 8 | Lo que no está definido se declara `PENDIENTE`, no se rellena | `TracAutoV2/docsv2/02-arquitectura/frontend/DECISIONES.md` |

---

## 1. Color, medida y sombra

**El único archivo del front con permiso de contener un `#hex` es
`TracAutoFrontV2/src/styles/primitivas.css`.** Un hex en cualquier otro archivo es un bug con el
mismo peso que un test que falla, y el lint lo hace fallar.

La cadena es de una sola dirección: **A1** primitiva de color (`--p-*`, el valor crudo) → **A2**
semántica (`--s-*`, la intención) → **A3** puente Tailwind (`--color-*`, `--text-*`) → el markup.

- En el markup usás **solo utilidades semánticas**: `bg-superficie-1`, `text-fg-primario`,
  `border-borde`, `bg-accion`.
- **La paleta default de Tailwind está APAGADA.** `bg-red-500` no genera nada y falla el lint.
- Un componente que escribe `var(--p-…)` saltea la capa de intención: es un bug, no un atajo.
- El vocabulario de shadcn (`bg-primary`, `text-muted-foreground`, `border-input`) solo puede
  aparecer **dentro de `TracAutoFrontV2/src/shared/ui/base/`**. Afuera, lint en rojo.
- **Si necesitás un token que no existe, no lo inventes en el componente: pedilo.** El
  procedimiento está en `01-sistema-de-diseno.md` §10. Un token inventado en una pantalla es el
  origen del drift.

Lo verifican 5 reglas propias en severidad `error` (`TracAutoFrontV2/eslint-rules/orbi.js`):
`orbi/sin-color-literal`, `orbi/sin-primitiva-de-color`, `orbi/sin-paleta-default`,
`orbi/sin-clase-arbitraria-de-color`, `orbi/sin-vocabulario-shadcn`; más
`TracAutoFrontV2/scripts/verificar-tokens.mjs`.

## 2. Primitivas de UI

**No se escriben a mano: se adoptan.** Salen de shadcn/ui sobre Base UI con
`npx shadcn@latest add <x>`, aterrizan en `TracAutoFrontV2/src/shared/ui/base/` y se envuelven con la API en
español en `TracAutoFrontV2/src/shared/ui/`.

Lo que ORBI aporta encima es el estilado: **consumen nuestros tokens semánticos, cero hex**.

Antes de crear un componente, buscá en `TracAutoFrontV2/src/shared/ui/` — hay ~40. Si existe, se usa.

## 3. La pieza compartida se pide, no se fabrica

> ### 🔒 EL MAPA, EL MENÚ LATERAL, EL AVISO Y LA FICHA DE DETALLE NO SE FABRICAN DENTRO DE UN MÓDULO.

Estas piezas son **de la plataforma**, no del módulo. Un mapa sirve igual para vehículos, reclamos
municipales y paquetes. Si cada módulo hace el suyo, en doce módulos hay doce mapas y ningún arreglo
se propaga.

**Si la pieza que necesitás no existe todavía en la capa compartida:**

1. **No la fabriques dentro de tu módulo** confiando en "después la subo". No se sube nunca.
2. Escribí `PENDIENTE (DA-FE-xx): <pieza> no existe en shared/, la necesita <módulo>` y pedí el id
   en `DECISIONES.md`.
3. Declarala como **candidata a extracción** en el `CLAUDE.md` de tu módulo.
4. Si sos el **primer** consumidor, la pieza se queda en tu módulo y queda declarada como candidata.
   Si sos el **segundo**, se extrae **antes** de escribir la segunda copia. Esa es la regla vigente:
   una pieza entra a compartido cuando **dos módulos distintos** la necesitan.

El catálogo de qué está compartido, qué falta y con qué contrato: `07-capa-compartida.md`.

## 4. Fronteras entre carpetas

| Carpeta | Puede importar de | NUNCA importa de |
|---|---|---|
| `modules/<x>/` | `shared/`, `services/`, `stores/` | **otro módulo** (F8) · `features/` (F9) |
| `features/` | `shared/`, `services/`, `stores/` | **`modules/`** (F9) |
| `shared/` | `shared/` | dominio de cualquier módulo |

**Por qué F8:** los módulos se activan por organización. Un import cruzado convierte un módulo
opcional en dependencia dura.
**Por qué F9:** el shell tiene que compilar con **cero** módulos instalados. Si el sidebar importa
`modules/flota`, borrar Flota rompe el login.

Lo verifica `no-restricted-imports` en `TracAutoFrontV2/eslint.config.js`.

## 5. Enchufe de módulo

Un módulo declara sus superficies en **su propio** `modulo.manifest.ts` y el shell las descubre por
`app/registry/`. **Agregar un módulo no toca ningún archivo compartido.**

Nunca agregues tu módulo editando el sidebar, el header o la columna de módulo a mano: si tu módulo
aparece en un archivo de `features/shell/`, está mal enchufado.

⚠️ **`FlotaRoutes` es el molde y hay un invariante que voltea la app entera:** un hijo de `<Routes>`
que no sea un `<Route>` **literal** dispara un invariant incondicional de react-router 7 en
cualquier URL. Tu módulo se registra como `<Route path="<modulo>/*" element={<XRoutes />} />` —
nunca devolviendo `<Route>` desde el componente. Detalle y las otras dos trampas del routing:
`08-enchufe-de-modulo.md`.

## 6. Errores del backend

El contrato es `code` / `message_key` / `args`. **Siempre** pasa por
`TracAutoFrontV2/src/shared/errors/parse-api-error.ts`.

- **Nunca** leas `error.response.data` a mano.
- Nunca inventes el texto del error en la pantalla: viene del `message_key` traducido.
- Cuál de las superficies usar (toast global / aviso inline / estado de pantalla / error de campo)
  no es criterio libre: está en `07-capa-compartida.md`.

## 7. Idioma

Cero texto hardcodeado en la UI. Toda etiqueta sale de i18n. El patrón obligatorio para traducir
los valores de un enum del backend es `vocabulario-*.ts` **con su test** — el test es parte del
patrón, no un extra: es lo que impide que una clave se caiga en silencio. Está documentado en
`07-capa-compartida.md`.

Lo verifica `TracAutoFrontV2/scripts/verificar-i18n.mjs`.

## 8. Lo que no está definido

Escribí `PENDIENTE (DA-FE-xx): <qué falta, quién decide>` y pedí el id en `DECISIONES.md`.
**No lo rellenes con algo plausible.** Un contrato improvisado se propaga a los doce módulos antes
de que alguien lo note.

**Ningún documento inventa un id `DA-FE-`.** El registro único es
`TracAutoV2/docsv2/02-arquitectura/frontend/DECISIONES.md`.

---

## DO / DON'T

| Hacé | NO hagas |
|---|---|
| `bg-superficie-1`, `text-fg-primario` | `bg-slate-800`, `bg-[#181D2A]`, `bg-red-500` |
| `npx shadcn@latest add dialog` y envolver | escribir un `<Dialog>` a mano |
| pedir la pieza compartida que falta | fabricarla dentro del módulo "por ahora" |
| `import { Boton } from '@/shared/ui/Boton'` | `import ... from '@/modules/flota/...'` |
| declarar el módulo en su `modulo.manifest.ts` | agregar tu ítem al sidebar a mano |
| `<Route path="municipal/*" element={<MunicipalRoutes />} />` | `<MunicipalRoutes />` como hijo de `<Route>` |
| `parseApiError(error)` | `error.response.data.message` |
| `t('flota.vehiculos.titulo')` | `<h1>Vehículos</h1>` |
| `PENDIENTE (DA-FE-26): falta el contrato de marca` | inventar el contrato que falta |

---

## Dónde buscar profundidad

| Documento | Para qué sirve |
|---|---|
| `TracAutoV2/docsv2/02-arquitectura/frontend/ESTADO.md` | **Entrá por acá.** Estado real, qué ya está resuelto, por dónde seguir |
| `TracAutoV2/docsv2/02-arquitectura/frontend/README.md` | Vocabulario de capas, regla de oro, cómo encajan los dos ejes |
| `TracAutoV2/docsv2/02-arquitectura/frontend/01-sistema-de-diseno.md` | Tokens, rampas, escalas, temas, puente Tailwind |
| `TracAutoV2/docsv2/02-arquitectura/frontend/02-primitivas.md` | Catálogo de primitivas de UI y su contrato de props |
| `TracAutoV2/docsv2/02-arquitectura/frontend/03-estructura-y-convenciones.md` | Dónde va cada archivo, naming, alias |
| `TracAutoV2/docsv2/02-arquitectura/frontend/04-patrones-de-pantalla.md` | Anatomías de pantalla (listado, detalle, wizard) |
| `TracAutoV2/docsv2/02-arquitectura/frontend/05-datos-y-estado.md` | React Query, Zustand, cache keys, stale times |
| `TracAutoV2/docsv2/02-arquitectura/frontend/06-capa-0-frontend.md` | Lint, CI, verificadores |
| `TracAutoV2/docsv2/02-arquitectura/frontend/07-capa-compartida.md` | Qué está compartido, qué falta, con qué contrato |
| `TracAutoV2/docsv2/02-arquitectura/frontend/08-enchufe-de-modulo.md` | Contrato de módulo, manifiesto, trampas del routing |
| `TracAutoV2/docsv2/02-arquitectura/frontend/09-apariencia-y-marca.md` | Tema vs marca vs estética; qué se ofrece al cliente |
| `TracAutoV2/docsv2/02-arquitectura/frontend/10-plan-de-implementacion.md` | Los slices y su orden |
| `TracAutoV2/docsv2/02-arquitectura/frontend/DECISIONES.md` | Registro único de los `DA-FE-` |

Todos bajo `TracAutoV2/docsv2/02-arquitectura/frontend/`.

## Referencias cruzadas

- `TracAutoV2/docsv2/00-ai-context/reglas/README.md` — cómo funcionan las reglas y por qué `globs` no es un router
- `TracAutoV2/docsv2/00-ai-context/reglas/errores-y-http.md` — el formato del código de error que consume el front
- `TracAutoV2/docsv2/00-ai-context/reglas/permisos-y-autorizacion.md` — formato de permisos y gate de módulo activo
- `TracAutoV2/docsv2/00-ai-context/reglas/documentacion.md` — rutas relativas, contrato una sola vez
- `TracAutoFrontV2/CLAUDE.md` — reglas operativas del repo del front
