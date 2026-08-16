import type { ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { Copy, MoreHorizontal, Pause, Pencil, Play, Send, Users } from 'lucide-react'
import { Badge } from '@/shared/ui/Badge'
import { BotonIcono } from '@/shared/ui/BotonIcono'
import { MenuAcciones, type ItemMenuAcciones } from '@/shared/ui/MenuAcciones'
import { Tabla } from '@/shared/ui/Tabla'
import type { Columna } from '@/shared/ui/Columna'
import type { ReglaProblemaDto } from '@/services/contracts/flota'
import {
  claveDeSeveridadProblema,
  claveDeTipoRegla,
  varianteDeSeveridadProblema,
} from '../../../vocabulario-centro-problemas'
import {
  accionesDeRegla,
  claveDeAccionDeRegla,
  formatoDePlazo,
  type AccionDeRegla,
} from '../../../vocabulario-reglas-problemas'

/**
 * Tabla de reglas del motor — ficha §4.
 *
 * ── SIN COLUMNA ORDENABLE, Y NO ES UN OLVIDO ──────────────────────────────────────────────────
 * La ficha §4 dice que el `th` "Regla" invierte `sortDirection`. **`ReglasPageQuery` es `PageQuery`
 * pelado** (B-17): el backend no declara `sortBy` ni `sortDirection` y el binder los descarta, asi
 * que un header clickeable pintaria una flecha y devolveria **el mismo orden**. El unico ORDER BY es
 * nombre ASC, id ASC, resuelto por el server, y la tabla lo dice en su aclaracion.
 *
 * ── LA COLUMNA "OPERACION" DICE UN HECHO, NO UN CONTEO ────────────────────────────────────────
 * La ficha la deriva de `vehiculosAlcanzadosCount` / `conductoresAlcanzadosCount` /
 * `geozonasAlcanzadasCount`, y los **3 viajan en 0 SIEMPRE** (PENDIENTE #2: no hay tabla puente).
 * Pintar "0 vehiculos" diria que la regla no alcanza a nada, que es lo contrario de la verdad:
 * alcanza a **toda la organizacion**. Por eso la celda muestra eso y no un numero. El
 * "responsable" de la segunda linea sale de `destinatarios[]`, que tambien viaja vacio: no se dibuja.
 *
 * ── LA COLUMNA "WEBHOOK" ES LA OPCION DEGRADADA QUE LA FICHA ENUMERA ─────────────────────────
 * `ReglaProblemaDto` solo trae `webhookEndpointId`. Resolver el **nombre** exige
 * `flota.integraciones.leer`, que **supervisor no tiene** — y supervisor es justamente quien tiene
 * `reglas.leer`. Badge neutro con/sin webhook, sin nombre y **sin color de estado de entrega**
 * (eso exigiria ademas la ultima entrega del endpoint). Queda la PENDIENTE de denormalizar
 * `webhookEndpointNombre` en `dtos.ts`.
 *
 * ── SIN CODIGO DE REGLA ───────────────────────────────────────────────────────────────────────
 * `DTC-CRIT-01` y companía **no existen en el contrato** (DA-PR-11): eran display del mockup.
 *
 * Sin seleccion multiple ni bulk bar: no hay endpoints masivos.
 */

export interface TablaDeReglasProps {
  reglas: ReglaProblemaDto[]
  cargando: boolean
  vacio: ReactNode
  error?: ReactNode
  puedeGestionar: boolean
  puedeProbarWebhook: boolean
  onAccion: (accion: AccionDeRegla, regla: ReglaProblemaDto) => void
}

export function TablaDeReglas({
  reglas,
  cargando,
  vacio,
  error,
  puedeGestionar,
  puedeProbarWebhook,
  onAccion,
}: TablaDeReglasProps) {
  const { t } = useTranslation('flota')

  const columnas: Columna<ReglaProblemaDto>[] = [
    {
      clave: 'nombre',
      titulo: t('centro.reglas.columnas.regla'),
      tipo: 'nodo',
      render: (regla) => (
        <div className="flex flex-col">
          <span className="font-medium text-fg-primario">{regla.nombre}</span>
          <span className="text-xs text-fg-terciario">{t(claveDeTipoRegla(regla.tipo))}</span>
        </div>
      ),
    },
    {
      clave: 'estado',
      titulo: t('centro.reglas.columnas.estado'),
      tipo: 'nodo',
      render: (regla) => (
        <Badge variante={regla.activa ? 'exito' : 'neutro'} punto>
          {/*
            "Inactiva", no "Pausada": la ficha §4 fija esas 2 etiquetas para el badge y `f-10`
            §Verificacion las vuelve a nombrar ("2 con badge `Inactiva`"). "Pausar" es la ACCION del
            kebab; usar su participio como estado obliga al usuario a traducir entre 2 palabras para
            la misma fila.
          */}
          {t(regla.activa ? 'centro.reglas.activa' : 'centro.reglas.inactiva')}
        </Badge>
      ),
    },
    {
      clave: 'severidad',
      titulo: t('centro.reglas.columnas.severidad'),
      tipo: 'nodo',
      render: (regla) => (
        <Badge variante={varianteDeSeveridadProblema(regla.severidadBase)}>
          {t(claveDeSeveridadProblema(regla.severidadBase))}
        </Badge>
      ),
    },
    {
      clave: 'condicion',
      titulo: t('centro.reglas.columnas.condicion'),
      tipo: 'nodo',
      render: (regla) => (
        <span className="text-xs text-fg-secundario">
          {/*
            `condicion` es la representacion legible que arma el SERVER al leer; el JSON es la
            verdad. Puede venir vacia si el server no la compuso: ahi se dice, no se pinta un guion
            que se confundiria con "sin condicion".
          */}
          {regla.condicion.length > 0 ? regla.condicion : t('centro.reglas.condicionSinTexto')}
        </span>
      ),
    },
    {
      clave: 'operacion',
      titulo: t('centro.reglas.columnas.operacion'),
      tipo: 'nodo',
      render: () => (
        <span className="text-xs text-fg-secundario">
          {t('centro.reglas.alcanceTodaLaOrganizacion')}
        </span>
      ),
    },
    {
      clave: 'plazo',
      titulo: t('centro.reglas.columnas.plazo'),
      tipo: 'nodo',
      render: (regla) => <PlazoDeLaRegla minutos={regla.slaMinutos} />,
    },
    {
      clave: 'webhook',
      titulo: t('centro.reglas.columnas.webhook'),
      tipo: 'nodo',
      render: (regla) => (
        <Badge variante="neutro">
          {t(regla.webhookEndpointId === null ? 'centro.reglas.sinWebhook' : 'centro.reglas.conWebhook')}
        </Badge>
      ),
    },
    {
      clave: 'acciones',
      titulo: t('centro.reglas.columnas.acciones'),
      tipo: 'acciones',
      render: (regla) => (
        <MenuDeRegla
          regla={regla}
          puedeGestionar={puedeGestionar}
          puedeProbarWebhook={puedeProbarWebhook}
          onAccion={onAccion}
        />
      ),
    },
  ]

  return (
    <Tabla
      columnas={columnas}
      filas={reglas}
      claveFila={(regla) => regla.id}
      cargando={cargando}
      vacio={vacio}
      error={error}
    />
  )
}

function PlazoDeLaRegla({ minutos }: { minutos: number }) {
  const { t } = useTranslation('flota')
  const formato = formatoDePlazo(minutos)

  return (
    <span className="font-mono text-xs tabular-nums text-fg-secundario">
      {t(formato.clave, { count: formato.cantidad })}
    </span>
  )
}

const ICONOS: Record<AccionDeRegla, typeof Pencil> = {
  editar: Pencil,
  duplicar: Copy,
  pausar: Pause,
  activar: Play,
  probarWebhook: Send,
  verConductores: Users,
}

/** Las acciones de LECTURA no piden `reglas.gestionar`; las 4 mutadoras si, en modo **disable**. */
const ACCIONES_DE_GESTION: readonly AccionDeRegla[] = ['editar', 'duplicar', 'pausar', 'activar']

function MenuDeRegla({
  regla,
  puedeGestionar,
  puedeProbarWebhook,
  onAccion,
}: {
  regla: ReglaProblemaDto
  puedeGestionar: boolean
  puedeProbarWebhook: boolean
  onAccion: (accion: AccionDeRegla, regla: ReglaProblemaDto) => void
}) {
  const { t } = useTranslation('flota')

  const items: ItemMenuAcciones[] = accionesDeRegla(regla).map((accion) => {
    const esDeGestion = ACCIONES_DE_GESTION.includes(accion)
    const permiso = esDeGestion ? 'flota.reglas.gestionar' : 'flota.integraciones.gestionar'
    const habilitada = esDeGestion
      ? puedeGestionar
      : accion === 'probarWebhook'
        ? puedeProbarWebhook
        : true

    return {
      clave: accion,
      etiqueta: t(claveDeAccionDeRegla(accion)),
      icono: ICONOS[accion],
      deshabilitado: !habilitada,
      motivo: habilitada ? undefined : t('centro.reglas.acciones.sinPermiso', { permiso }),
      // `pausar` no es destructivo (la regla no se borra y su historial queda), pero SI apaga la
      // deteccion: se pinta como danger para que no se confunda con "guardar".
      tono: accion === 'pausar' ? 'peligro' : 'normal',
      separadorAntes: accion === 'pausar' || accion === 'activar',
      onSelect: () => onAccion(accion, regla),
    }
  })

  return (
    <MenuAcciones
      disparador={
        <BotonIcono
          icono={MoreHorizontal}
          etiqueta={t('centro.reglas.acciones.abrir', { nombre: regla.nombre })}
          variante="fantasma"
          tamano="sm"
        />
      }
      items={items}
      alineacion="end"
    />
  )
}
