import { useTranslation } from 'react-i18next'
import { RadioTower } from 'lucide-react'
import type { AvisoDeSenales as Cual } from '../../vocabulario-senales'
import { Icono } from '@/shared/ui/Icono'

/**
 * Lo que la pantalla DECLARA sobre su capa de señales, una sola vez, arriba de la superficie.
 *
 * ══ POR QUE ESTE COMPONENTE ES EL NUCLEO DE `f-12` ══════════════════════════════════════════════
 * Las 3 superficies embebidas (columna del listado, panel de la ficha, anillo del marcador) van a
 * estar **vacias el 100 % de las veces** mientras GATE 2 siga abierto: no existe ni un escritor de
 * alertas en el backend. Sin este aviso, una tabla de 20 filas sin badge —o un mapa de 20 pines sin
 * anillo— se lee como *"20 vehiculos sin problemas"*, que es una afirmacion que la pantalla **no
 * puede hacer**: nadie miro.
 *
 * La celda sola no alcanza para arreglarlo. Una celda tiene un `title` y nadie lee 20 tooltips; la
 * lectura de conjunto la da la pantalla, y por eso la explicacion tiene que estar donde se lee de un
 * vistazo. Es el mismo mecanismo con el que `AvisoDatosDeConexion` resolvio el `sin_dato` de
 * slice-05, y por eso comparte su forma: `role="status"`, sin boton de reintentar (no hay nada que
 * reintentar) y **sin tono de error** — que la deteccion no este conectada no es una falla de esta
 * organizacion.
 *
 * ── LOS 4 CASOS, Y POR QUE NINGUNO SE PUEDE COLAPSAR ──────────────────────────────────────────
 *  · `deteccion_sin_conectar` — hoy, siempre. El catalogo `tipos_alerta_flota` esta vacio a proposito
 *    (**B-38**) y la FK rechaza toda insercion.
 *  · `indice_parcial` — la deteccion corre, pero se trajo una pagina y hay mas. Las filas sin badge
 *    pueden tener señales en la pagina que no vino.
 *  · `sin_fuente` — el request de señales fallo. La pantalla NO se rompe (partial-data, `f-12` paso
 *    8), pero callarse seria volver a la lectura de "todo bien".
 *  · `ninguno` — no se dibuja nada. Recien ahi la ausencia de badge significa algo bueno.
 */

export interface AvisoDeSenalesProps {
  cual: Cual
  /** `compacto` para paneles angostos (el lateral del mapa): una linea, sin caja. */
  variante?: 'caja' | 'compacto'
}

export function AvisoDeSenales({ cual, variante = 'caja' }: AvisoDeSenalesProps) {
  const { t } = useTranslation('flota')

  if (cual === 'ninguno') return null

  const titulo = t(`senales.aviso.${cual}.titulo`)
  const descripcion = t(`senales.aviso.${cual}.descripcion`)

  if (variante === 'compacto') {
    return (
      <p role="status" className="text-xs text-fg-terciario">
        {titulo} {descripcion}
      </p>
    )
  }

  return (
    <div
      role="status"
      className="flex items-start gap-2 rounded-lg border border-borde bg-superficie-2 px-4 py-3"
    >
      <span className="mt-0.5 text-fg-terciario">
        <Icono icono={RadioTower} tamano="sm" />
      </span>
      <div className="flex flex-col gap-1">
        <p className="text-sm font-medium text-fg-primario">{titulo}</p>
        <p className="text-sm text-fg-secundario">{descripcion}</p>
      </div>
    </div>
  )
}
