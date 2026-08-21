import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useMap } from 'react-leaflet'
import { Crosshair, Maximize2, Minimize2, Minus, Plus } from 'lucide-react'
import { cn } from '@/shared/utils/cn'
import { limitesDe, ZOOM_AL_SELECCIONAR, type EntidadUbicada } from './geometria'
import { aBoundsDeLeaflet } from './bounds'

/**
 * Controles flotantes sobre el lienzo: acercar, alejar, centrar y pantalla completa.
 *
 * ── POR QUÉ PROPIOS Y NO EL `zoomControl` DE LEAFLET ──────────────────────────────────────────
 * El control nativo de Leaflet trae su propio CSS —fondo blanco, borde gris, tipografía del
 * navegador— y en un mapa oscuro se ve como un parche pegado. Estos usan los tokens del sistema,
 * así que siguen el tema como cualquier otro control de la app. Por eso el `MapContainer` declara
 * `zoomControl={false}`: dos juegos de botones haciendo lo mismo es peor que ninguno.
 *
 * ── EL DE "CENTRAR" NO ES UN ZOOM-OUT ─────────────────────────────────────────────────────────
 * Reusa `limitesDe` —el mismo encuadre del primer render— así que vuelve exactamente a la vista
 * que el usuario vio al entrar, no a un zoom arbitrario. Si no hay ni una posición conocida, el
 * botón va **deshabilitado**: centrar sobre nada dejaría el mapa en medio del océano.
 *
 * ── I18N: NAMESPACE `common`, NO EL DEL MÓDULO ────────────────────────────────────────────────
 * "Acercar" / "Alejar" / "Centrar" / "Pantalla completa" son cromo del mapa, no vocabulario de
 * dominio: no hablan de vehículos ni de reclamos. Sus claves viven en `common.json` porque este
 * componente es compartido y no puede leer el namespace de un módulo. Ver el bloque de decisión en
 * `MapaORBI.tsx`.
 */
export function ControlesDelMapa({ items }: { items: readonly EntidadUbicada[] }) {
  const { t } = useTranslation('common')
  const map = useMap()
  const [pantallaCompleta, setPantallaCompleta] = useState(false)

  const limites = limitesDe(items)
  const puedeCentrar = limites !== null

  // El navegador puede salir de pantalla completa por Escape, sin pasar por nuestro botón: sin
  // escuchar el evento, el icono se queda mostrando "salir" cuando ya salió.
  useEffect(function seguirElEstadoReal() {
    function alCambiar() {
      setPantallaCompleta(document.fullscreenElement !== null)
    }
    document.addEventListener('fullscreenchange', alCambiar)
    return () => document.removeEventListener('fullscreenchange', alCambiar)
  }, [])

  async function alternarPantallaCompleta() {
    // El contenedor del mapa, no el `<canvas>`: si se expande solo el lienzo, los marcadores quedan
    // fuera del elemento en pantalla completa.
    const contenedor = map.getContainer().closest('.mapa-orbi') ?? map.getContainer()
    try {
      if (document.fullscreenElement === null) {
        await contenedor.requestFullscreen()
      } else {
        await document.exitFullscreen()
      }
      // Leaflet mide el viewport al montar: sin esto, tras cambiar de tamaño quedan tiles grises.
      window.setTimeout(() => map.invalidateSize(), 120)
    } catch {
      // Algunos navegadores lo niegan sin gesto de usuario o en iframes. No es un error de la app:
      // el mapa sigue andando, solo que sin pantalla completa.
    }
  }

  function centrarEnLasEntidades() {
    if (limites === null) return
    map.fitBounds(aBoundsDeLeaflet(limites), {
      padding: [48, 48],
      maxZoom: ZOOM_AL_SELECCIONAR,
    })
  }

  return (
    // `z-[400]` porque los panes de Leaflet llegan hasta 400; abajo de eso los tiles tapan los
    // botones. `pointer-events-none` en el contenedor deja que el arrastre del mapa siga pasando
    // entre los grupos, y cada grupo lo vuelve a habilitar para sí.
    <div className="pointer-events-none absolute top-3 right-3 z-[400] flex flex-col items-end gap-2">
      <Grupo>
        <BotonDeControl
          icono={Plus}
          etiqueta={t('mapa.controles.acercar')}
          onClick={() => map.zoomIn()}
        />
        <BotonDeControl
          icono={Minus}
          etiqueta={t('mapa.controles.alejar')}
          onClick={() => map.zoomOut()}
        />
        <BotonDeControl
          icono={Crosshair}
          etiqueta={t('mapa.controles.centrar')}
          onClick={centrarEnLasEntidades}
          deshabilitado={!puedeCentrar}
          motivo={puedeCentrar ? undefined : t('mapa.controles.centrarSinPosiciones')}
        />
      </Grupo>

      <Grupo>
        <BotonDeControl
          icono={pantallaCompleta ? Minimize2 : Maximize2}
          etiqueta={
            pantallaCompleta
              ? t('mapa.controles.salirPantallaCompleta')
              : t('mapa.controles.pantallaCompleta')
          }
          onClick={() => void alternarPantallaCompleta()}
        />
      </Grupo>
    </div>
  )
}

function Grupo({ children }: { children: React.ReactNode }) {
  return (
    <div className="pointer-events-auto flex flex-col overflow-hidden rounded-md border border-borde bg-superficie-1 shadow-sm">
      {children}
    </div>
  )
}

function BotonDeControl({
  icono: Icono,
  etiqueta,
  onClick,
  deshabilitado = false,
  motivo,
}: {
  icono: typeof Plus
  etiqueta: string
  onClick: () => void
  deshabilitado?: boolean
  motivo?: string
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={deshabilitado}
      title={motivo ?? etiqueta}
      className={cn(
        'flex size-8 items-center justify-center transition-colors duration-150 ease-out',
        'not-last:border-b not-last:border-borde',
        deshabilitado
          ? 'cursor-not-allowed text-fg-terciario opacity-50'
          : 'text-fg-secundario hover:bg-superficie-2 hover:text-fg-primario',
      )}
    >
      <Icono className="size-4" aria-hidden />
      <span className="sr-only">{etiqueta}</span>
    </button>
  )
}
