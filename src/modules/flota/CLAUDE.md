# Módulo Flota — reglas para agentes

> Se carga solo al tocar `src/modules/flota/**`. Las leyes transversales están en
> `docs/reglas/frontend-core.md` (se carga sola desde el `CLAUDE.md` del repo) y **no se repiten
> acá**. Esto es lo que es propio de Flota.
>
> **Es el primer módulo con este archivo: es el ejemplar que van a copiar los demás.** El molde está
> en `../TracAutoV2/docsv2/02-arquitectura/frontend/08-enchufe-de-modulo.md` §7.
>
> Desde **F-03**, lo que este módulo le aporta al shell —rutas, navegación e i18n— vive en su
> **`modulo.manifest.ts`**. Enchufarlo es una línea en `src/app/registry/index.ts`; nada más.

## Antes de escribir una línea

1. **El contrato de Flota vive co-locado con su backend**, no en `docsv2/03-modulos/flota/` (esa es
   la copia histórica, `superseded`). Entrá por `../TracAutoV2/src/Flota/docs/ESTADO.md`, después
   `00-contrato/` y la spec de frontend en `01-spec/frontend.md`.
2. La ficha de la pantalla: `../TracAutoV2/src/Flota/docs/01-spec/pantallas/<pantalla>.md`.
3. El mockup: `../TracAutoV2/docs/mockupsv2/b2b/flota/<pantalla>.html`. **Referencia visual
   únicamente** — el look sale de los tokens, no del píxel.
4. Qué piezas compartidas ya existen: `../TracAutoV2/docsv2/02-arquitectura/frontend/07-capa-compartida.md`.
5. Para mapa de impacto entre backend/frontend, usar
   `../TracAutoV2/src/Flota/docs/07-grafos/contexto-ia.md` y, si hace falta explorar, el laboratorio
   `../TracAutoV2/src/Flota/docs/07-grafos/iniciar-lab-grafos-flota.cmd`.

Graphify no decide contrato ni UX: sirve para ubicar `flotaKeys`, contratos TS, rutas protegidas,
servicios HTTP, pantallas y vecinos backend que deben revisarse antes de cambiar una pantalla.

## Superficies

Todas cuelgan de `<Route path="flota/*" element={<FlotaRoutes />} />` en `app/routing/AppRouter.tsx`
— **el splat es obligatorio** (A-13). El módulo entero está envuelto en `RequiereModulo modulo="flota"`.

| Ruta (relativa a `/app/flota`) | Pantalla | Permiso |
|---|---|---|
| `/` (índice) | → redirige a `vehiculos` | — |
| `vehiculos` | `VehiculosListPage` | `flota.vehiculos.leer` |
| `vehiculos/onboarding` | `OnboardingFlotaPage` | `flota.vehiculos.crear` |
| `vehiculos/:vehiculoFlotaId` | `VehiculoDetallePage` | `flota.vehiculos.leer` |
| `dispositivos` | `DispositivosListPage` | `flota.dispositivos.leer` |
| `dispositivos/:dispositivoId` | `DispositivoDetallePage` | `flota.dispositivos.leer` |
| `conductores` | `ConductoresListPage` | `flota.conductores.leer` |
| `conductores/:conductorId` | `ConductorDetallePage` | `flota.conductores.leer` |
| `mapa` | `MapaEnVivoPage` | `flota.vehiculos.leer` |
| `problemas` | `ProblemasOperativosPage` | `flota.problemas.leer` |
| `problemas/reglas` | `ReglasProblemasPage` | `flota.reglas.leer` |
| `integraciones` | `FlotaIntegracionesPage` | `flota.integraciones.leer` |
| `alertas` | → redirige a `../problemas` (alias histórico) | — |
| `*` | `NotFoundPage` | — |

**`geozonas` NO está acá:** la resuelve el placeholder de `AppRouter` mientras `DA-08` siga abierta.

> ⚠️ **Montar una ruta acá tiene DOS pasos.** El segundo es **borrar su línea de placeholder en
> `AppRouter`**: un segmento estático le gana al splat en el ranking de `react-router`, así que la
> pantalla montada acá queda **inalcanzable — sin error, sin warning**. Ya pasó con dispositivos: las
> 2 páginas existían y no las montaba nadie. La única línea estática que **debe** seguir bajo
> `flota/` es `flota/geozonas`.

## Enums que se muestran en la UI

16 archivos `vocabulario-*.ts`. El patrón exige **el test junto al vocabulario**: es lo que impide
que una clave i18n se caiga en silencio.

`asignacion` · `centro-problemas` · `conductor-asignacion` · `conexion` · `integraciones` ·
`kanban-problemas` · `licencia` · `mapa` · `reglas-problemas` · `sala-problemas` · `senales` ·
`situacion` · `stock` · `ticket-problema` · `timeline-problemas` · `vistas-del-centro`

Doce tienen su `vocabulario-*.test.ts` propio; `vocabularios-i18n.test.ts` cruza nueve de ellos
contra `es-AR/flota.json` y `en/flota.json` para detectar claves faltantes en un idioma.

> **PENDIENTE — `vocabulario-stock.ts` no lo toca ningún test** (los otros 15 los cubre alguno).
> Si lo tocás, agregale el test: el patrón no es opcional.

## Lo que este módulo NO tiene permitido inventar

- **Colores** → solo utilidades semánticas. Un hex acá rompe el build.
- **Ítem de menú** → sale de **`modulo.manifest.ts`**, el manifiesto de este módulo (F-03). El shell
  lo descubre por `app/registry/`. **Nunca** editando el sidebar ni `features/shell/` a mano: si
  Flota aparece nombrada en un archivo del shell, está mal enchufada.
- **Etiquetas de navegación** → namespace propio, `flota:nav.*` en `flota.json`. No van a
  `common.json`: ese es del shell, y un módulo que escribe ahí obliga a editar un archivo compartido.
- **Tabla, filtros, columna lateral, pantalla a sangre** → ya están en `@/shared/ui/`
  (`Tabla`, `BarraDeFiltros`, `ColumnaLateral`, `PantallaASangre`, `SlotDeColumnaDePantalla`).
- **El mapa** → `@/shared/patrones/mapa` (`MapaORBI`, extraído en **F-02**). Flota le pasa
  `VehiculoEnMapa` (ver `aEntidadDelMapa` en `vocabulario-mapa.ts`) y le entrega su vocabulario como
  funciones: `claseDeEstado` pinta el relleno por conexión, `claseDeRealce` el anillo por severidad.
  **El mapa no conoce `EstadoConexion` ni `SeveridadAlerta`.** Si para hacer algo tenés que meterle
  dominio al componente compartido, la abstracción está mal: se reporta, no se parchea.
- **Aviso de error dentro de un form o modal** → `@/shared/ui/Aviso` (extraído en **F-02**). Cuál
  superficie usar —`Aviso` / `EstadoError` / toast / error de campo— lo decide
  `04-patrones-de-pantalla.md` §4, no el criterio de quien escribe la pantalla.
- **Gate de permisos** → `@/shared/auth/permissions/usePermisos` (extraído en **F-02**, junto a
  `RequiereModulo` y `RequierePermiso`, que ya vivían ahí). El predicado puro `tienePermisoEn` está
  exportado aparte para que el proyecto `unit` de Vitest —que corre sin DOM— pueda testearlo.
- **Importar de otro módulo** → prohibido por lint (F8). Si dos módulos necesitan lo mismo, sube a
  `shared/`.
- **Texto visible** → todo por i18n, namespace `flota`.

Si necesitás una pieza compartida que no existe: **se pide, no se fabrica.** Procedimiento en
`07-capa-compartida.md` §2.

## Candidatas a extracción

Piezas que Flota escribió **primero** y que el módulo 2 va a necesitar igual. La regla: cuando
aparece el **segundo** consumidor, se extraen **antes** de escribir la segunda copia. La lista
canónica con destinos y momento está en `07-capa-compartida.md` §3 — acá va solo lo que vive en esta
carpeta, para que quien la toca sepa que **no es código de Flota, es código de la plataforma que
todavía no se mudó**.

| Pieza | Dónde vive hoy | Por qué es transversal |
|---|---|---|
| ~~**Mapa**~~ | ✅ **extraído en F-02** → `@/shared/patrones/mapa` (`MapaORBI`). En `components/mapa/` quedan las 5 piezas que SÍ son de Flota: los 2 paneles, el chip, la pista y la leyenda | — |
| ~~**`Aviso`**~~ | ✅ **extraído en F-02** → `@/shared/ui/Aviso` (31 importadores migrados) | — |
| **Molde de formulario** | copiado ~9 veces acá adentro | `src/shared/forms/` existe y está **vacía** |
| ~~**`usePermisos`**~~ | ✅ **extraído en F-02** → `@/shared/auth/permissions/usePermisos` | — |
| **`useDebounce`** | `pages/VehiculosListPage.tsx:107` — el `setTimeout` del filtro de búsqueda, inline. Es el **único** `setTimeout` de todo `pages/` | `src/shared/hooks/` tiene 4 hooks y no lo incluye. **NO se extrajo en F-02 a propósito**: con **un** consumidor la API se diseña adivinando (`07-capa-compartida.md` §9). Cuando el segundo listado lo necesite, se extrae **antes** de escribir la segunda copia |
| **Ficha de detalle** | `components/detalle/` + gemelos en `conductores/` y `dispositivos/` | Toda ficha de detalle. **Se extrae DURANTE el módulo 2**, no antes: con un solo caso la API sale mal |

**Los stores de filtros de Flota están FUERA del módulo** (`src/stores/flota-*-filters-store.ts`, 3
archivos). No es una decisión de este módulo: es `DA-FE-30`, abierta.

## Decisiones abiertas

Con prefijo propio, registradas en `../TracAutoV2/docsv2/02-arquitectura/frontend/DECISIONES.md`.
**Ningún archivo inventa un id: se pide ahí.** Hoy Flota no tiene ids `DA-FE-FLO-*` propios; lo que
lo afecta son decisiones transversales (`DA-FE-30` stores, `DA-FE-35` variantes de `Aviso`) y las
`DA-*` de su contrato, que viven en `../TracAutoV2/src/Flota/docs/02-plan/decisiones.md`.
