import { useTranslation } from 'react-i18next'
import { ESTADOS_CONEXION, claveDeConexion, varianteDeConexion } from '../../vocabulario-conexion'
import type { EstadoConexion, MapaItemDto } from '@/services/contracts/flota'

/**
 * Qué significa cada color de pin, abajo a la izquierda del lienzo.
 *
 * ── POR QUÉ HACE FALTA ────────────────────────────────────────────────────────────────────────
 * El mapa codifica el estado de conexión SOLO en el color del marcador. Sin leyenda, un pin gris
 * al lado de uno verde no se puede interpretar: hay que ir al panel, encontrar el chip de ese
 * vehículo y leer su badge. Es además el único canal no-cromático de esa información en el lienzo,
 * lo que importa para daltonismo — la lectura por texto existía solo en el chip.
 *
 * ── EL VOCABULARIO ES EL NUESTRO, NO EL DEL MOCKUP, Y ESO ES DELIBERADO ───────────────────────
 * El mockup lista "En ruta (5) · Detenido (2) · Alerta (1) · Offline (2)"
 * (`docs/mockupsv2/b2b/flota/mapa.html:356-360`). Tres de esas cuatro **no se pueden afirmar**:
 * "En ruta" y "Detenido" son la frontera de **DA-MV-05**, abierta; y "Alerta" necesita
 * `alertasActivasCount`, que viaja siempre `null` (**B-33**). Copiarlas produciría una leyenda que
 * explica colores que el mapa no dibuja.
 *
 * Lo que el mapa sí codifica es **estado de conexión**, que es vocabulario cerrado y ya alimenta el
 * color del pin, el badge del chip y el filtro. La leyenda dice eso.
 *
 * ── LOS CONTEOS SON DE LO QUE SE ESTÁ VIENDO ──────────────────────────────────────────────────
 * Se cuentan los `visibles` —lo que hay dibujado ahora, ya filtrado—, no la flota entera. Un
 * conteo sobre la flota entera al lado de un mapa filtrado no cerraría con lo que el ojo ve, que es
 * el mismo defecto de denominador que ya corregimos en el panel. Los vehículos **sin posición** no
 * entran acá por definición (no tienen pin que explicar): de esos habla `AvisoFueraDelMapa`.
 *
 * Un estado con cero vehículos **no se dibuja**: una leyenda que enumera lo que no está en pantalla
 * es ruido, y con `incompleto` —que ninguna capa emite hoy (B-31)— sería una fila permanente en 0.
 */
export function LeyendaDelMapa({ visibles }: { visibles: readonly MapaItemDto[] }) {
  const { t } = useTranslation('flota')

  const conteo = new Map<EstadoConexion, number>()
  for (const item of visibles) {
    conteo.set(item.estado, (conteo.get(item.estado) ?? 0) + 1)
  }

  const filas = ESTADOS_CONEXION.filter((estado) => (conteo.get(estado) ?? 0) > 0)
  if (filas.length === 0) return null

  return (
    <div
      // `z-(--z-dropdown)`: los panes de Leaflet llegan a 400 y taparían la leyenda.
      className="pointer-events-none absolute bottom-3 left-3 z-(--z-dropdown) flex flex-col gap-1 rounded-md border border-borde bg-superficie-1/95 px-3 py-2 shadow-sm"
    >
      {filas.map((estado) => (
        <div key={estado} className="flex items-center gap-2 text-xs text-fg-secundario">
          {/*
            El punto se pinta por la MISMA `varianteDeConexion` que decide el color del marcador y
            el del badge del chip, no por un color propio. Si mañana `sin_dato` deja de ser gris,
            cambia en los tres lados o en ninguno; una leyenda con su propia paleta es exactamente
            cómo se desincroniza de lo que explica.
          */}
          <span
            className={`leyenda-punto leyenda-punto--${varianteDeConexion(estado)}`}
            aria-hidden
          />
          <span>
            {t(claveDeConexion(estado), { defaultValue: estado })} ({conteo.get(estado)})
          </span>
        </div>
      ))}
    </div>
  )
}
