import { useTranslation } from 'react-i18next'
import { Link, useLocation } from 'react-router-dom'
import { cn } from '@/shared/utils/cn'
import { ColumnaLateral } from '@/shared/ui/ColumnaLateral'
import { useSessionStore } from '@/stores/session-store'
import { esItemActivo, moduloDeLaRuta, type ItemDeModulo } from './registro'

/**
 * Columna secundaria del módulo. Port del `docs/mockupsv2/_shared/module-shell.js`.
 *
 * Se renderiza sola: mira la ruta, resuelve a qué módulo pertenece y pinta sus grupos. Una pantalla
 * no la invoca ni le pasa nada — por eso agregar un módulo al registro le da columna sin tocar
 * ningún componente.
 *
 * El CROMO (ancho, colapso, borde, encabezado, botón que monta sobre el borde) vive en
 * `shared/ui/ColumnaLateral`, compartido con la columna que arma cada pantalla — así las dos se
 * ven iguales por construcción y no por disciplina.
 */
export function ColumnaDeModulo() {
  const { pathname } = useLocation()
  const modulo = moduloDeLaRuta(pathname)

  if (modulo === null) return null

  return <Columna key={modulo.key} modulo={modulo} pathname={pathname} />
}

function Columna({
  modulo,
  pathname,
}: {
  modulo: NonNullable<ReturnType<typeof moduloDeLaRuta>>
  pathname: string
}) {
  const { t } = useTranslation()

  return (
    <ColumnaLateral
      titulo={t(modulo.labelKey)}
      subtitulo={modulo.subtituloKey === undefined ? undefined : t(modulo.subtituloKey)}
      etiquetaAria={t(modulo.labelKey)}
      etiquetaAlternar={t('shell.nav.alternarColumna')}
      // Por módulo, igual que el mockup: colapsar en Flota no colapsa Taller.
      claveColapso={`tracauto-v2-modulo-${modulo.key}-colapsado`}
    >
      {(colapsada) => (
        <div className="flex flex-col gap-3">
          {modulo.grupos.map((grupo, indice) => (
            <div key={grupo.tituloKey ?? `grupo-${indice}`} className="flex flex-col">
              {grupo.tituloKey !== undefined && !colapsada ? (
                <p className="px-4 pb-1 text-[0.625rem] font-semibold tracking-wider text-fg-terciario uppercase">
                  {t(grupo.tituloKey)}
                </p>
              ) : null}
              <ul className="flex flex-col">
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
        </div>
      )}
    </ColumnaLateral>
  )
}

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

  const clases = cn(
    'flex h-9 w-full items-center gap-2.5 border-l-2 text-sm transition-colors duration-150 ease-out',
    colapsada ? 'justify-center px-0' : 'px-4',
  )

  const contenido = (
    <>
      <item.icono className="size-4 shrink-0" aria-hidden />
      {colapsada ? <span className="sr-only">{etiqueta}</span> : <span className="truncate">{etiqueta}</span>}
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
          className={cn(clases, 'cursor-not-allowed border-transparent text-fg-terciario opacity-60')}
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
          clases,
          activo
            ? 'border-marca bg-marca-tenue font-medium text-marca'
            : 'border-transparent text-fg-secundario hover:bg-superficie-2 hover:text-fg-primario',
        )}
      >
        {contenido}
      </Link>
    </li>
  )
}
