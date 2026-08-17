import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import { SenalBadgeSeveridad } from './SenalBadgeSeveridad'
import { AvisoDeSenales } from './AvisoDeSenales'
import { claveDeEstadoAlerta } from '../../vocabulario-centro-problemas'
import {
  avisoDeSenales,
  claveDeTipoAlerta,
  esSenalActiva,
  senalesDelVehiculo,
  type IndiceDeSenales,
} from '../../vocabulario-senales'
import type { AlertaListItemDto } from '@/services/contracts/flota'
import { Badge } from '@/shared/ui/Badge'
import { Boton } from '@/shared/ui/Boton'
import { Skeleton } from '@/shared/ui/Skeleton'

/**
 * Panel de SEÑALES del vehiculo — activas y recientes, **read-only** (`f-12` paso 4).
 *
 * ── LO QUE ESTE PANEL NO TIENE, Y NO ES UN OLVIDO ─────────────────────────────────────────────
 *  · **Ninguna accion de mutacion.** Ni reconocer, ni cerrar, ni comentar. `POST /alertas/{id}/
 *    gestionar` **no esta enrutado** —su permiso esta contradictorio entre `api.md` y `permisos.md`,
 *    sus 2 errores de negocio no tienen `code`, y con GATE 2 abierto no hay fila sobre la cual
 *    actuar—. `f-12` §Verificacion lo pide como assert: **0 acciones de mutacion de alerta en el DOM**.
 *  · **Enlace al problema correlacionado.** `f-12` paso 2 lo pide
 *    (`/app/flota/problemas?ticket=<problemaId>`) y **el dato no existe**: `AlertaListItemDto` no
 *    lleva `problemaId` y `alertas_operativas_flota` no tiene columna hacia
 *    `problemas_operativos_flota` — son 2 tablas disjuntas. El pie enlaza al Centro **sin
 *    preseleccion**, y lo dice: un `?ticket=` inventado abriria el ticket de otro.
 *  · **Geozona.** El slot existe en el DTO y viaja `null` SIEMPRE (DIFERIDO DA-08). No se dibuja el
 *    campo vacio ni se simula.
 *  · **Tab propia.** La ficha del vehiculo declara 4 tabs y ninguna es de señales; `f-12` paso 4 es
 *    explicito ("es un panel, **no** una tab nueva si la ficha no la declara").
 *
 * ── LOS 5 ESTADOS ─────────────────────────────────────────────────────────────────────────────
 * loading = skeleton **del panel**, nunca spinner global (`f-12` paso 8) · empty = el aviso que dice
 * por que esta vacio, que hoy es "la deteccion no esta conectada" y NO "sin señales" · error = el
 * panel se degrada a su aviso y **no rompe la ficha** (partial-data) · forbidden = no aplica (las
 * señales no tienen permiso propio: se leen con `flota.vehiculos.leer`, el mismo de la pagina).
 */

export interface SenalesIndicadorProps {
  indice: IndiceDeSenales
  vehiculoFlotaId: string
  cargando: boolean
  /** El request de señales fallo. El panel lo declara; la ficha sigue entera. */
  fallo: boolean
}

const RUTA_CENTRO = '/app/flota/problemas'

export function SenalesIndicador({
  indice,
  vehiculoFlotaId,
  cargando,
  fallo,
}: SenalesIndicadorProps) {
  const { t } = useTranslation('flota')

  const senales = senalesDelVehiculo(indice, vehiculoFlotaId)
  const aviso = avisoDeSenales(indice, fallo)

  return (
    <section
      aria-label={t('senales.panel.titulo')}
      className="flex flex-col gap-3 rounded-xl border border-borde bg-superficie-1 p-4"
    >
      <header className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="text-sm font-semibold text-fg-primario">{t('senales.panel.titulo')}</h2>
        <p className="text-xs text-fg-terciario">{t('senales.panel.subtitulo')}</p>
      </header>

      {cargando ? <Skeleton variante="bloque" repetir={2} /> : null}

      {/*
        El aviso va ARRIBA de la lista y no en su lugar: cuando el indice es parcial hay filas que
        mostrar Y una advertencia que dar al mismo tiempo. Hoy la lista siempre esta vacia, asi que
        el aviso es lo unico que se ve — y es exactamente lo que tiene que leerse.
      */}
      {!cargando ? <AvisoDeSenales cual={aviso} /> : null}

      {!cargando && senales.length > 0 ? (
        <ul className="flex flex-col gap-2">
          {senales.map((senal) => (
            <FilaDeSenal key={senal.id} senal={senal} />
          ))}
        </ul>
      ) : null}

      <PieDelPanel />
    </section>
  )
}

/**
 * Una señal. Los 4 campos que `f-12` paso 4 nombra: severidad, tipo, fecha, estado.
 *
 * El **tipo** cae al codigo crudo por `defaultValue` y es deliberado: `tipos_alerta_flota` esta
 * VACIO (GATE 2) y el contrato publica 2 catalogos que no se solapan, asi que enumerar grafias en el
 * frontend seria consolidar la decision del PO desde acá. Ver `claveDeTipoAlerta`.
 */
function FilaDeSenal({ senal }: { senal: AlertaListItemDto }) {
  const { t, i18n } = useTranslation('flota')

  const fecha = formatearFechaHora(senal.fechaInicio, i18n.language)

  return (
    <li className="flex flex-wrap items-center gap-2 rounded-lg border border-borde bg-superficie-2 px-3 py-2">
      <SenalBadgeSeveridad severidad={senal.severidad} />

      <span className="flex-1 text-sm text-fg-primario">
        {/*
          `descripcion` es el `titulo` de la señal (DRIFT 10 / PENDIENTE #7: el evento trae
          `titulo` + `detalle?` y ningun doc dice cual de los dos es `descripcion`). Con el string
          vacio se cae al codigo del tipo, que siempre esta.
        */}
        {senal.descripcion.trim().length > 0
          ? senal.descripcion
          : t(claveDeTipoAlerta(senal.tipo), { defaultValue: senal.tipo })}
      </span>

      <Badge variante={esSenalActiva(senal) ? 'info' : 'neutro'}>
        {t(claveDeEstadoAlerta(senal.estado), { defaultValue: senal.estado })}
      </Badge>

      <span className="font-mono text-xs text-fg-terciario">
        {fecha ?? t('senales.panel.sinFecha')}
      </span>
    </li>
  )
}

/**
 * El pie: el unico enlace del panel, y la linea que explica por que no apunta a un ticket concreto.
 *
 * Se dibuja SIEMPRE (tambien con la lista vacia) porque su valor no depende de que haya señales: es
 * donde vive lo accionable. Lo que **no** hace es prometer una correlacion que no existe.
 *
 * ⚠️ El copy es incondicional a proposito. `CORRELACION_SENAL_PROBLEMA_DISPONIBLE` es `false` **por
 * ausencia de dato, no por una feature apagada**: no hay `problemaId` en el DTO ni columna en la
 * tabla, asi que no existe una rama alternativa que este componente pueda renderizar hoy. Ramificar
 * sobre una constante daria una rama muerta que ningun test puede ejercer; el dia que el contrato
 * agregue la correlacion, esto cambia junto con la fila (que ahi si podra enlazar por señal).
 */
function PieDelPanel() {
  const { t } = useTranslation('flota')

  return (
    <footer className="flex flex-wrap items-center justify-between gap-2 border-t border-borde pt-3">
      <p className="text-xs text-fg-terciario">{t('senales.panel.sinCorrelacion')}</p>
      <Boton variante="secundaria" tamano="sm" render={<Link to={RUTA_CENTRO} />}>
        {t('senales.panel.irAlCentro')}
      </Boton>
    </footer>
  )
}

/** `dd/mm/aaaa hh:mm`. `fechaInicio` es `DateTime` UTC del contrato: se convierte a hora local. */
function formatearFechaHora(fechaIso: string, idioma: string): string | null {
  const marca = Date.parse(fechaIso)
  if (Number.isNaN(marca)) return null

  return new Intl.DateTimeFormat(idioma, {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(marca))
}
