import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Link, useLocation } from 'react-router-dom'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { cn } from '@/shared/utils/cn'
import { useSessionStore } from '@/stores/session-store'
import { esItemActivo, moduloDeLaRuta, type ItemDeModulo } from './registro'

/**
 * Columna secundaria del módulo. Port del `docs/mockupsv2/_shared/module-shell.js`.
 *
 * Se renderiza sola: mira la ruta, resuelve a qué módulo pertenece y pinta sus grupos. Una pantalla
 * no la invoca ni le pasa nada — por eso agregar un módulo al registro le da columna sin tocar
 * ningún componente.
 *
 * ── EL COLAPSO ES POR MÓDULO, NO GLOBAL ───────────────────────────────────────────────────────
 * Igual que el mockup, que deriva la clave de `def.key`: colapsar en Flota no colapsa Taller. Lo
 * que sí se cambió es el FORMATO del valor — el mockup guarda `'1'`/`''` y este repo ya venía
 * usando `String(boolean)` en `useSidebarState`. Se respeta la convención del repo; convivir con
 * dos formatos de booleano en localStorage es cómo aparece el bug que nadie reproduce.
 *
 * ── EN MOBILE NO SE COLAPSA, Y ES UNA CORRECCIÓN AL MOCKUP ────────────────────────────────────
 * Abajo de `lg` el mockup apila la columna a ancho completo **y esconde el botón de colapso**: si
 * venías colapsado desde desktop quedabas con una banda sin etiquetas y sin forma de revertirlo.
 * Acá el colapso simplemente no aplica abajo de `lg` (las clases son `lg:`), así que ese estado
 * muerto no existe.
 */
export function ColumnaDeModulo() {
  const { pathname } = useLocation()
  const modulo = moduloDeLaRuta(pathname)

  if (modulo === null) return null

  return <Columna key={modulo.key} modulo={modulo} pathname={pathname} />
}

function claveDeColapso(moduloKey: string) {
  return `tracauto-v2-modulo-${moduloKey}-colapsado`
}

function Columna({
  modulo,
  pathname,
}: {
  modulo: NonNullable<ReturnType<typeof moduloDeLaRuta>>
  pathname: string
}) {
  const { t } = useTranslation()
  const clave = claveDeColapso(modulo.key)

  const [colapsada, setColapsada] = useState(() => localStorage.getItem(clave) === 'true')

  function alternar() {
    setColapsada((previo) => {
      const siguiente = !previo
      localStorage.setItem(clave, String(siguiente))
      return siguiente
    })
  }

  return (
    <nav
      aria-label={t(modulo.labelKey)}
      className={cn(
        'flex shrink-0 flex-col gap-4 border-b border-borde bg-superficie-1 p-3',
        'lg:border-r lg:border-b-0',
        colapsada ? 'lg:w-14' : 'lg:w-60',
      )}
    >
      <button
        type="button"
        onClick={alternar}
        aria-expanded={!colapsada}
        className="hidden h-8 w-8 items-center justify-center self-end rounded-sm text-fg-terciario transition-colors duration-150 ease-out hover:bg-superficie-2 hover:text-fg-primario lg:flex"
      >
        {colapsada ? (
          <ChevronRight className="size-4" aria-hidden />
        ) : (
          <ChevronLeft className="size-4" aria-hidden />
        )}
        <span className="sr-only">{t('shell.nav.alternarColumna')}</span>
      </button>

      {modulo.grupos.map((grupo, indice) => (
        <div key={grupo.tituloKey ?? `grupo-${indice}`} className="flex flex-col gap-1">
          {grupo.tituloKey !== undefined && !colapsada ? (
            <p className="px-2 text-xs font-semibold tracking-wide text-fg-terciario uppercase">
              {t(grupo.tituloKey)}
            </p>
          ) : null}
          <ul className="flex flex-row gap-1 lg:flex-col">
            {grupo.items.map((item) => (
              <Item
                key={item.key}
                item={item}
                activo={esItemActivo(item, pathname)}
                colapsada={colapsada}
              />
            ))}
          </ul>
        </div>
      ))}
    </nav>
  )
}

const CLASES_ITEM =
  'flex h-9 w-full items-center gap-2 rounded-sm px-2 text-sm transition-colors duration-150 ease-out'

function Item({
  item,
  activo,
  colapsada,
}: {
  item: ItemDeModulo
  activo: boolean
  colapsada: boolean
}) {
  const { t } = useTranslation()
  // El `?? []` va AFUERA del selector, igual que en `usePermisos` y `SidebarNav`. Zustand 5 corre
  // el selector dentro de `useSyncExternalStore`: con el default ADENTRO cada lectura construye un
  // array nuevo, React ve un snapshot distinto por render y la app cae en "Maximum update depth
  // exceeded". El sidebar y esta columna se montan en TODAS las pantallas de /app.
  const permisosDeLaOrg = useSessionStore((s) => s.organizacionActiva?.permisos)
  const permisos = permisosDeLaOrg ?? []
  const etiqueta = t(item.labelKey)

  const habilitado = item.permiso === undefined || permisos.includes(item.permiso)

  const contenido = (
    <>
      <item.icono className="size-4 shrink-0" aria-hidden />
      {colapsada ? <span className="sr-only">{etiqueta}</span> : <span>{etiqueta}</span>}
    </>
  )

  // Sin permiso NO se oculta: se deshabilita con el motivo (`permisos.md` §Comportamiento UX por
  // verbo). Un `<a>` deshabilitado no existe en HTML, por eso es un `<span>` con `aria-disabled`.
  if (!habilitado) {
    return (
      <li>
        <span
          aria-disabled="true"
          title={t('shell.nav.sinPermiso', { permiso: item.permiso })}
          className={cn(CLASES_ITEM, 'cursor-not-allowed text-fg-terciario opacity-60')}
        >
          {contenido}
        </span>
      </li>
    )
  }

  return (
    <li>
      <Link
        to={item.ruta}
        aria-current={activo ? 'page' : undefined}
        title={colapsada ? etiqueta : undefined}
        className={cn(
          CLASES_ITEM,
          activo
            ? 'bg-marca-tenue font-medium text-marca'
            : 'text-fg-secundario hover:bg-superficie-2 hover:text-fg-primario',
        )}
      >
        {contenido}
      </Link>
    </li>
  )
}
