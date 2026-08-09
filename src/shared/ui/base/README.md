# `src/shared/ui/base/` — los componentes que copió el CLI de shadcn/ui

> **Esto NO es una carpeta de "código de terceros".** Todo lo que hay acá es
> **código nuestro**: shadcn/ui no es una dependencia que se instala, es un
> generador que **copia** el archivo al repo y ahí termina su intervención. Se
> edita, se versiona y se revisa como cualquier otro archivo del front
> (`03-estructura-y-convenciones.md` §2.3.3).

## Por qué existe la subcarpeta (desvío declarado del doc 03 §2.3.1)

`03-estructura-y-convenciones.md` §2.3.1 dice que lo que copia el CLI aterriza
en `src/shared/ui/` **sin** carpeta aparte, y su argumento es bueno: una carpeta
separada declara "esto es de otro y no se toca", y parte el catálogo en dos
mitades según su origen.

No se pudo cumplir por una razón **física**, no de gusto:

- El CLI escribe en **kebab-case** (`input.tsx`, `card.tsx`, `badge.tsx`).
- El catálogo de `02-primitivas.md` nombra a 6 primitivas de UI **envueltas** con
  el mismo nombre en PascalCase: `Input`, `Select`, `Card`, `Skeleton`, `Badge`,
  `Avatar`. Y "envolver" significa, por definición, **dos archivos**.
- Este repo se clona en **dos máquinas Windows** (NTFS, case-insensitive).
  `Input.tsx` y `input.tsx` **son el mismo archivo**. No pueden convivir en una
  carpeta, y el que escriba último pisa al otro **sin decir nada**.

Renombrar los copiados a PascalCase (lo que pide el §3.2 del mismo doc) tampoco
resuelve la colisión: la haría exacta.

Lo que sí se preservó del §2.3.1 es su objetivo real: **todas las primitivas de
UI viven bajo `src/shared/ui/`**, y quien busca el `Modal` lo encuentra ahí.
`base/` es una subcarpeta de esa misma carpeta, no un `vendor/` en otro lado.

## Reglas que aplican acá igual que en el resto del repo

| Regla | Estado |
|---|---|
| Cero `#hex`, `rgb()`, `oklch()` | Se lintea. **Esta carpeta NO está en `ignores`** — es la exclusión que se agrega sola y apaga la mitad de la Capa 0 |
| Cero `var(--p-*)` | Se lintea |
| Cero clases arbitrarias con color (`bg-[#…]`, `bg-[var(--p-…)]`) | Se lintea |
| Cero utilidades de la paleta default de Tailwind (`bg-red-500`) | Se lintea, y además la paleta está apagada |

## Lo único distinto de esta carpeta

**Acá SÍ se puede escribir el vocabulario de shadcn** (`bg-background`,
`text-muted-foreground`, `bg-primary`, `border-input`). Es el idioma interno de
estos archivos, y el mapeo a nuestras semánticas se hace **desde afuera**, en
`src/styles/semanticas.css` (`--background: var(--s-fondo-base)`) y en el puente
`@theme inline` de `base.css`.

**Por qué desde afuera y no reescribiendo las clases acá adentro:**
`shadcn add <x> --overwrite` es la única vía por la que llega un arreglo de
accesibilidad publicado upstream. Un archivo con las clases reescritas pierde
esos cambios en cada actualización. Con el mapeo desde afuera, actualizar es un
comando.

Fuera de esta carpeta ese vocabulario está **prohibido** y hay una regla de lint
que lo hace cumplir (R10 de `02-primitivas.md`). El markup de ORBI escribe
`bg-fondo-base`, no `bg-background`.

## Si editás un archivo de acá

Dejá un comentario arriba del archivo diciendo **qué cambiaste respecto del
upstream y por qué**. Es lo que hace que la próxima re-copia sea un diff legible
en vez de una arqueología (`02-primitivas.md` §1.6).

Hoy hay **tres** editados, y los tres por el mismo motivo de fondo — algo que
no funcionaba con nuestra configuración y que no se podía arreglar desde afuera:

| Archivo | Qué se cambió | Por qué no se podía desde afuera |
|---|---|---|
| `sonner.tsx` | Se quitó `useTheme` de `next-themes` | Habría metido un segundo dueño del tema. En ORBI el tema viaja por `data-theme` y el color del toast ya llega por los `--normal-*` |
| `dialog.tsx` | `bg-black/10` → `bg-modal-fondo` en el overlay | La paleta default está apagada: `bg-black/10` no genera ninguna regla y el velo del modal queda **transparente**, sin ningún error. `DialogContent` renderiza `<DialogOverlay />` sin props |
| `alert-dialog.tsx` | Ídem | Ídem |

## Lo que se trajo y después se borró

`pagination.tsx`. El mapa de cobertura de `02-primitivas.md` lo marca como
"Envolver `pagination` (solo presentación)", pero al abrirlo resultó ser
paginación **por enlaces** (`PaginationLink` renderiza un `<a href>`), pensada
para paginación navegable por URL. La `Paginacion` de ORBI es **server-side
controlada por eventos**: emite `onCambio` y no navega. Envolverla habría
significado un `<a href="#">` con `onClick`, que es un antipatrón de
accesibilidad — un enlace que no lleva a ninguna parte.

Se borró en vez de dejarlo sin usar. Volver a traerlo es un comando.

## Cómo se re-sincroniza

```bash
npx shadcn@latest add <componente> --overwrite
```

No es una actualización automática: es un **merge manual**. Revisá el diff antes
de commitear.
