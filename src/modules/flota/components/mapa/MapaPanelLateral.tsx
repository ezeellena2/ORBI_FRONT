import { useTranslation } from 'react-i18next'
import { ChevronLeft, ChevronRight, MapPinOff, Search, SearchX } from 'lucide-react'
import { MapaChipVehiculo } from './MapaChipVehiculo'
import { PistaDeFueraDelMapa } from './PistaDeFueraDelMapa'
import { AvisoDatosDeConexion } from '../AvisoDatosDeConexion'
import {
  coberturaDeConexion,
  VALORES_FILTRO_CONEXION,
  claveDeConexion,
  claveDeVacioPorFiltroDeConexion,
} from '../../vocabulario-conexion'
import type { EstadoConexion, MapaItemDto } from '@/services/contracts/flota'
import { Boton } from '@/shared/ui/Boton'
import { BotonIcono } from '@/shared/ui/BotonIcono'
import { Icono } from '@/shared/ui/Icono'
import { Input } from '@/shared/ui/Input'
import { Select } from '@/shared/ui/Select'
import { Skeleton } from '@/shared/ui/Skeleton'

/**
 * Panel izquierdo: buscador, filtro de conexion y la lista de vehiculos que **si** estan en el mapa.
 *
 * ══ LA LINEA MAS IMPORTANTE DE ESTA PANTALLA ═══════════════════════════════════════════════════
 * `AvisoFueraDelMapa`. El endpoint del mapa devuelve solo los vehiculos con posicion conocida, asi
 * que la lista puede tener 3 filas sobre una flota de 20 — y sin explicacion eso se lee como "perdi
 * 17 vehiculos". El aviso dice **cuantos** faltan y **por que puede ser**, sin elegir una causa (no
 * hay dato que permita distinguirlas) y sin arriesgar un numero cuando todavia no lo sabe.
 *
 * ── LOS 4 FILTROS DEL MOCKUP QUE NO ESTAN ─────────────────────────────────────────────────────
 * El select del mockup ofrece "En ruta / Detenido / Alerta / Offline". Ninguno de los 3 primeros es
 * un codigo del contrato: **Alerta** necesita `alertasActivasCount`, que viaja siempre `null`
 * (B-33), y **En ruta / Detenido** son la frontera de **DA-MV-05**, abierta. Lo que se ofrece es el
 * estado de **conexion**, que es vocabulario cerrado, ya esta implementado en los 3 listados y usa
 * el mismo `VALORES_FILTRO_CONEXION` (3 de 4 valores: `incompleto` no se ofrece, B-31).
 *
 * Los conteos por estado de la leyenda del mockup tampoco se dibujan como "tablero": lo unico que se
 * puede afirmar es la cobertura DE LO QUE SE ESTA VIENDO, y de eso ya se encarga
 * `AvisoDatosDeConexion` — que ademas lo dice en su copy.
 */

export interface MapaPanelLateralProps {
  items: readonly MapaItemDto[]
  /** Items despues de aplicar busqueda y filtro; son los que se listan (y los que se dibujan). */
  visibles: readonly MapaItemDto[]
  cargando: boolean
  colapsado: boolean
  busqueda: string
  estado: EstadoConexion | ''
  seleccionadoId: string | null
  /** `null` mientras no se conozca el total de la flota. */
  fueraDelMapa: number | null
  totalDeLaFlota: number | null | undefined
  hayFiltros: boolean
  onAlternar: () => void
  onBusqueda: (texto: string) => void
  onEstado: (estado: EstadoConexion | '') => void
  onLimpiar: () => void
  onSeleccionar: (vehiculoFlotaId: string) => void
  onVerVehiculos: () => void
  ahoraMs: number
}

export function MapaPanelLateral(props: MapaPanelLateralProps) {
  const { t } = useTranslation('flota')

  if (props.colapsado) {
    return (
      <aside className="flex shrink-0 items-start">
        <BotonIcono
          icono={ChevronRight}
          etiqueta={t('mapa.panel.expandir')}
          variante="superficie"
          tamano="sm"
          onClick={props.onAlternar}
        />
      </aside>
    )
  }

  return (
    <aside className="flex w-full shrink-0 flex-col gap-3 lg:w-80">
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-sm font-semibold text-fg-primario">{t('mapa.panel.titulo')}</h2>
        <BotonIcono
          icono={ChevronLeft}
          etiqueta={t('mapa.panel.colapsar')}
          variante="fantasma"
          tamano="sm"
          onClick={props.onAlternar}
        />
      </div>

      {/* Label VISIBLE, no placeholder solo: es la regla de accesibilidad del repo. */}
      <label className="flex flex-col gap-1 text-xs text-fg-secundario">
        {t('mapa.panel.buscarEtiqueta')}
        <Input
          type="search"
          iconoIzq={Search}
          autoComplete="off"
          value={props.busqueda}
          onChange={(evento) => props.onBusqueda(evento.target.value)}
          placeholder={t('mapa.panel.buscar')}
        />
      </label>

      <label className="flex flex-col gap-1 text-xs text-fg-secundario">
        {t('conexion.filtro.etiqueta')}
        <Select
          valor={props.estado}
          onCambio={(valor) => props.onEstado(valor as EstadoConexion | '')}
          opciones={[
            { valor: '', etiqueta: t('conexion.filtro.todos') },
            ...VALORES_FILTRO_CONEXION.map((codigo) => ({
              valor: codigo,
              etiqueta: t(claveDeConexion(codigo), { defaultValue: codigo }),
            })),
          ]}
        />
      </label>

      {/*
        ⚠️ EL DENOMINADOR TIENE QUE SER EL MISMO QUE EL DEL AVISO DE ABAJO.
        Este contador decia `visibles.length` (o sea, ya filtrado) y el aviso de "fuera del mapa"
        usa `items.length` (sin filtrar), y los dos se renderizan pegados: con 20 vehiculos, 12 con
        posicion y "AB" tipeado, se leia "3 vehiculos en el mapa" e inmediatamente abajo "8 de 20 no
        aparecen en el mapa". 3 + 8 = 11, y los 9 restantes no los explicaba nadie — encima el aviso
        de abajo esta redactado como una rendicion de cuentas de TODA la flota, asi que invita a la
        resta. Ahora este cuenta lo que hay en el mapa (`items`), que cierra con el aviso, y lo que
        el filtro recorta se dice **aparte**.
      */}
      <p className="text-xs text-fg-terciario">
        {t('mapa.panel.enElMapa', { count: props.items.length })}
      </p>

      {props.hayFiltros ? (
        <p className="text-xs text-fg-terciario">
          {t('mapa.panel.coinciden', {
            count: props.visibles.length,
            visibles: props.visibles.length,
            total: props.items.length,
          })}
        </p>
      ) : null}

      <AvisoDatosDeConexion
        cobertura={coberturaDeConexion(props.visibles.map((item) => item.estado))}
      />

      <AvisoFueraDelMapa
        fueraDelMapa={props.fueraDelMapa}
        totalDeLaFlota={props.totalDeLaFlota}
        onVerVehiculos={props.onVerVehiculos}
      />

      <div className="flex min-h-0 flex-1 flex-col gap-2 overflow-y-auto pr-1">
        <ListaDeChips {...props} />
      </div>
    </aside>
  )
}

function ListaDeChips(props: MapaPanelLateralProps) {
  const { t } = useTranslation('flota')

  if (props.cargando) return <Skeleton variante="bloque" repetir={4} />

  if (props.visibles.length === 0) {
    // El vacio del panel NO es el vacio de la pantalla: si hay filtros puestos, lo que falta es un
    // match; si no hay ninguno, el mapa entero esta vacio y de eso se encarga el overlay de la
    // pagina, que ademas explica por que.
    if (!props.hayFiltros) return null

    /*
      ⚠️ El mismo helper que usa el banner sobre el mapa. Antes este panel decia siempre "Ningun
      vehiculo coincide con tus filtros": con Telemetria caida y el filtro en "En linea", el usuario
      leia la explicacion correcta sobre el mapa y la generica a 30 cm de distancia, al mismo tiempo,
      sobre el mismo hecho. Y la generica es exactamente la lectura que el vocabulario de conexion
      existe para impedir ("no tengo ningun vehiculo en linea", cuando lo que falta es la fuente).
    */
    const clave = claveDeVacioPorFiltroDeConexion(props.estado, props.busqueda.trim() !== '')

    return (
      <div className="flex flex-col items-start gap-2 rounded-lg border border-borde bg-superficie-2 px-3 py-4">
        <span className="text-fg-terciario">
          <Icono icono={SearchX} tamano="lg" />
        </span>
        <p className="text-sm text-fg-secundario">
          {clave === null ? t('mapa.panel.vacioSinResultados') : t(clave)}
        </p>
        <PistaDeFueraDelMapa busqueda={props.busqueda} fueraDelMapa={props.fueraDelMapa} />
        <Boton variante="secundaria" tamano="sm" onClick={props.onLimpiar}>
          {t('mapa.panel.limpiar')}
        </Boton>
      </div>
    )
  }

  return (
    <>
      {props.visibles.map((item) => (
        <MapaChipVehiculo
          key={item.vehiculoFlotaId}
          item={item}
          seleccionado={item.vehiculoFlotaId === props.seleccionadoId}
          onSeleccionar={props.onSeleccionar}
          ahoraMs={props.ahoraMs}
        />
      ))}
    </>
  )
}

/**
 * Los vehiculos que la flota tiene y el mapa no puede dibujar.
 *
 * Tres formas, y ninguna inventa nada:
 *  1. **total desconocido** (el conteo esta cargando o fallo) → solo la parte que siempre es cierta:
 *     el mapa dibuja los que tienen posicion. Sin numero.
 *  2. **total conocido y todos en el mapa** → no se dibuja nada. No hay novedad.
 *  3. **total conocido y faltan N** → el numero exacto y las tres causas posibles, que el contrato
 *     no permite distinguir: sin GPS instalado, GPS que todavia no reporto, o Telemetria sin
 *     responder (y entonces el vehiculo sale del mapa recien cuando expira la cache de 60 s).
 */
function AvisoFueraDelMapa({
  fueraDelMapa,
  totalDeLaFlota,
  onVerVehiculos,
}: {
  fueraDelMapa: number | null
  totalDeLaFlota: number | null | undefined
  onVerVehiculos: () => void
}) {
  const { t } = useTranslation('flota')

  if (fueraDelMapa === null) {
    return <p className="text-xs text-fg-terciario">{t('mapa.fueraDelMapa.siempre')}</p>
  }

  if (fueraDelMapa === 0) return null

  return (
    <div
      role="status"
      className="flex items-start gap-2 rounded-lg border border-borde bg-superficie-2 px-3 py-3"
    >
      <span className="mt-0.5 text-fg-terciario">
        <Icono icono={MapPinOff} tamano="sm" />
      </span>
      <div className="flex flex-col items-start gap-1">
        <p className="text-sm font-medium text-fg-primario">
          {t('mapa.fueraDelMapa.titulo', {
            count: fueraDelMapa,
            fuera: fueraDelMapa,
            total: totalDeLaFlota ?? fueraDelMapa,
          })}
        </p>
        <p className="text-xs text-fg-secundario">{t('mapa.fueraDelMapa.descripcion')}</p>
        <Boton variante="fantasma" tamano="sm" onClick={onVerVehiculos}>
          {t('mapa.fueraDelMapa.cta')}
        </Boton>
      </div>
    </div>
  )
}
