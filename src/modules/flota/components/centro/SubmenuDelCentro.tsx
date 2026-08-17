import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import {
  Columns3,
  GaugeCircle,
  Inbox,
  Plug,
  SlidersHorizontal,
  type LucideIcon,
} from 'lucide-react'
import { AccionConMotivo } from '../AccionConMotivo'
import { usePermisos } from '../../hooks/usePermisos'
import { PARAM_VISTA, type VistaDelCentro } from '../../vocabulario-vistas-del-centro'
import { cn } from '@/shared/utils/cn'
import { ColumnaLateral } from '@/shared/ui/ColumnaLateral'
import { ColumnaDePantalla } from '@/shared/ui/SlotDeColumnaDePantalla'

/**
 * Submenú secundario del Centro de Problemas (ficha §1 y §6).
 *
 * Dos grupos: **Vistas** (conmutan la vista de la MISMA URL por query string) y **Configurar**
 * (navegan a otras rutas, cada una con su `.leer`).
 *
 * ── POR QUÉ LAS VISTAS SON BOTONES Y LO DE CONFIGURAR SON LINKS ───────────────────────────────
 * No es cosmético: Sala y Línea de tiempo son la misma URL con otro `?vista=`, y Reglas e
 * Integraciones son **otras rutas con otro permiso**. Un `<Link>` para cambiar de vista funcionaría,
 * pero un `<button>` deja explícito que no se cambia de pantalla — y que la vuelta del navegador
 * lleva a la vista anterior, no a otra sección.
 *
 * ── EL GRUPO "VISTAS" TIENE LOS 3 ÍTEMS DE LA FICHA ───────────────────────────────────────────
 * Sala · Línea de tiempo · Kanban. El kanban entró con `f-08`; las 3 son la misma URL con otro
 * `?vista=`. El **ticket** no está acá y no es un olvido: no es una vista de lista, es la zona a la
 * que se llega desde un caso concreto (`?ticket=`), con su propia barra de retorno.
 *
 * ── LOS 2 ÍTEMS DE CONFIGURAR VAN DESHABILITADOS SIN PERMISO, NUNCA OCULTOS ───────────────────
 * `permisos.md` §Comportamiento UX por verbo: `leer` de otra sección se muestra en modo **disable**
 * con el permiso literal en el tooltip. Ocultarlo dejaría al usuario sin saber que la sección
 * existe, y sin nada que pedirle a su admin.
 *
 * ── DESDE `f-10`/`f-11`: EL SUBMENÚ TAMBIÉN VIVE EN REGLAS E INTEGRACIONES ────────────────────
 * Son 2 rutas distintas, no 2 vistas de la misma URL, y por eso `activo` admite las 5 superficies y
 * no solo las 3 vistas. La diferencia de comportamiento es real y se nota: **desde Reglas o
 * Integraciones, tocar una vista NAVEGA**, así que ahí los ítems de Vistas son `<Link>`. Dejarlos
 * como botones habría exigido que esas 2 páginas supieran conmutar una vista que no renderizan.
 */

const RUTA_CENTRO = '/app/flota/problemas'
const RUTA_REGLAS = '/app/flota/problemas/reglas'
const RUTA_INTEGRACIONES = '/app/flota/integraciones'

const PERMISO_REGLAS = 'flota.reglas.leer'
const PERMISO_INTEGRACIONES = 'flota.integraciones.leer'

/** Mismo mecanismo que el colapso del sidebar del shell, replicado porque `modules/` no importa de `features/`. */
const CLAVE_COLAPSO = 'flota.problemas.sidebar-collapsed'

/** Las 5 superficies del Centro que el submenú puede marcar activas. */
export type SuperficieDelCentro = VistaDelCentro | 'reglas' | 'integraciones'

export function SubmenuDelCentro({
  activo,
  onVista,
}: {
  activo: SuperficieDelCentro
  /**
   * Solo lo pasa la pantalla del Centro, que conmuta la vista **sin navegar**. Ausente = las 3
   * vistas se renderizan como enlaces a `/app/flota/problemas?vista=…`.
   */
  onVista?: (vista: VistaDelCentro) => void
}) {
  const { t } = useTranslation('flota')
  const { tienePermiso } = usePermisos()

  return (
    // Se monta en el slot del shell, al lado de la columna del módulo. Dentro del contenido
    // heredaba su padding y quedaba despegada de la anterior.
    <ColumnaDePantalla>
    <ColumnaLateral
      titulo={t('centro.problemas.titulo')}
      subtitulo={t('centro.submenu.bajada')}
      etiquetaAria={t('centro.problemas.titulo')}
      etiquetaAlternar={t('centro.submenu.alternar')}
      claveColapso={CLAVE_COLAPSO}
    >
      {(colapsado) => (
        <div className="flex flex-col gap-3">
      <Grupo titulo={t('centro.submenu.vistas')} colapsado={colapsado}>
        <ItemDeVista
          icono={Inbox}
          etiqueta={t('centro.submenu.sala')}
          vista="sala"
          activo={activo === 'sala'}
          colapsado={colapsado}
          onVista={onVista}
        />
        <ItemDeVista
          icono={GaugeCircle}
          etiqueta={t('centro.submenu.timeline')}
          vista="timeline"
          activo={activo === 'timeline'}
          colapsado={colapsado}
          onVista={onVista}
        />
        <ItemDeVista
          icono={Columns3}
          etiqueta={t('centro.submenu.kanban')}
          vista="kanban"
          activo={activo === 'kanban'}
          colapsado={colapsado}
          onVista={onVista}
        />
      </Grupo>

      <Grupo titulo={t('centro.submenu.configurar')} colapsado={colapsado}>
        <ItemDeSeccion
          icono={SlidersHorizontal}
          etiqueta={t('centro.submenu.reglas')}
          destino={RUTA_REGLAS}
          permiso={PERMISO_REGLAS}
          habilitado={tienePermiso(PERMISO_REGLAS)}
          activo={activo === 'reglas'}
          colapsado={colapsado}
        />
        <ItemDeSeccion
          icono={Plug}
          etiqueta={t('centro.submenu.integraciones')}
          destino={RUTA_INTEGRACIONES}
          permiso={PERMISO_INTEGRACIONES}
          habilitado={tienePermiso(PERMISO_INTEGRACIONES)}
          activo={activo === 'integraciones'}
          colapsado={colapsado}
        />
      </Grupo>
        </div>
      )}
    </ColumnaLateral>
    </ColumnaDePantalla>
  )
}

function Grupo({
  titulo,
  colapsado,
  children,
}: {
  titulo: string
  colapsado: boolean
  children: React.ReactNode
}) {
  return (
    <div className="flex flex-col gap-1">
      {colapsado ? null : (
        <p className="px-2 text-xs font-semibold tracking-wide text-fg-terciario uppercase">
          {titulo}
        </p>
      )}
      <ul className="flex flex-row gap-1 lg:flex-col">{children}</ul>
    </div>
  )
}

const CLASES_ITEM =
  'flex h-9 w-full items-center gap-2 rounded-sm px-2 text-sm transition-colors duration-150 ease-out'

/**
 * Un ítem del grupo *Vistas*.
 *
 * Es `<button>` **solo cuando conmuta sin navegar** (dentro del Centro). Desde Reglas o
 * Integraciones no hay vista que conmutar: ahí es un `<Link>` a `/app/flota/problemas?vista=…`, que
 * es lo que realmente pasa al tocarlo. Un botón que navega miente sobre el "atrás" del navegador.
 */
function ItemDeVista({
  icono: Icono,
  etiqueta,
  vista,
  activo,
  colapsado,
  onVista,
}: {
  icono: LucideIcon
  etiqueta: string
  vista: VistaDelCentro
  activo: boolean
  colapsado: boolean
  onVista?: (vista: VistaDelCentro) => void
}) {
  const clases = cn(
    CLASES_ITEM,
    activo
      ? 'bg-marca-tenue font-medium text-marca'
      : 'text-fg-secundario hover:bg-superficie-2 hover:text-fg-primario',
  )

  const contenido = (
    <>
      <Icono className="size-4 shrink-0" aria-hidden />
      {colapsado ? <span className="sr-only">{etiqueta}</span> : <span>{etiqueta}</span>}
    </>
  )

  if (onVista === undefined) {
    return (
      <li>
        <Link
          to={`${RUTA_CENTRO}?${PARAM_VISTA}=${vista}`}
          title={colapsado ? etiqueta : undefined}
          className={clases}
        >
          {contenido}
        </Link>
      </li>
    )
  }

  return (
    <li>
      <button
        type="button"
        onClick={() => onVista(vista)}
        aria-current={activo ? 'page' : undefined}
        title={colapsado ? etiqueta : undefined}
        className={clases}
      >
        {contenido}
      </button>
    </li>
  )
}

function ItemDeSeccion({
  icono: Icono,
  etiqueta,
  destino,
  permiso,
  habilitado,
  activo,
  colapsado,
}: {
  icono: LucideIcon
  etiqueta: string
  destino: string
  permiso: string
  habilitado: boolean
  activo: boolean
  colapsado: boolean
}) {
  const { t } = useTranslation('flota')

  const contenido = (
    <>
      <Icono className="size-4 shrink-0" aria-hidden />
      {colapsado ? <span className="sr-only">{etiqueta}</span> : <span>{etiqueta}</span>}
    </>
  )

  if (!habilitado) {
    return (
      <li>
        {/*
          Deshabilitado con el motivo visible, no oculto: el `<span>` con `aria-disabled` es lo que
          permite que el tooltip se dispare — un `<a>` deshabilitado no existe en HTML, y un elemento
          con `pointer-events: none` no recibe hover.
        */}
        <AccionConMotivo motivo={t('centro.submenu.sinPermiso', { permiso })}>
          <span
            aria-disabled="true"
            title={colapsado ? etiqueta : undefined}
            className={cn(CLASES_ITEM, 'cursor-not-allowed text-fg-terciario opacity-60')}
          >
            {contenido}
          </span>
        </AccionConMotivo>
      </li>
    )
  }

  return (
    <li>
      <Link
        to={destino}
        aria-current={activo ? 'page' : undefined}
        title={colapsado ? etiqueta : undefined}
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
