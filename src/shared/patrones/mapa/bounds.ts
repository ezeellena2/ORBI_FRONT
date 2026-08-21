import type { LatLngBoundsExpression } from 'leaflet'
import type { LimitesDelMapa } from './geometria'

/**
 * Traduce los límites del dominio al tipo que espera Leaflet.
 *
 * Vive en su propio módulo y no dentro de `MapaORBI.tsx` por una regla del repo: un archivo que
 * exporta componentes no puede exportar además funciones, porque rompe el fast refresh de Vite
 * (`react-refresh/only-export-components`). Lo usan el encuadre inicial y el botón "centrar".
 *
 * Separado de `geometria.ts` a propósito: **ese archivo no puede importar Leaflet** (el proyecto
 * `unit` corre en Node y Leaflet toca `window` al cargarse), y este solo importa el TIPO.
 */
export function aBoundsDeLeaflet(limites: LimitesDelMapa): LatLngBoundsExpression {
  return [
    [limites[0][0], limites[0][1]],
    [limites[1][0], limites[1][1]],
  ]
}
