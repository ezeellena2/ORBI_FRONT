import { Car, Map, MapPin, RadioTower, TriangleAlert, UserRound } from 'lucide-react'
import FlotaRoutes from './FlotaRoutes'
import flotaEs from '@/shared/i18n/locales/es-AR/flota.json'
import flotaEn from '@/shared/i18n/locales/en/flota.json'
import type { ManifiestoDeModulo, RegistroDeModulo } from '@/shared/types/modulo'

/**
 * Todo lo que Flota le aporta al shell, en un solo archivo del módulo.
 *
 * Contrato: `TracAutoV2/docsv2/02-arquitectura/frontend/08-enchufe-de-modulo.md` §3.
 * **El shell no sabe que Flota existe**: lo descubre por `app/registry/`, que es el único archivo
 * que se toca para enchufar un módulo.
 *
 * Orden y etiquetas tomados **literalmente** de `module-nav.js` `registry['flota']`.
 * Vehículos va primero porque es el hub — coherente con que `/app/flota` redirija ahí.
 */
const navegacion: RegistroDeModulo = {
  key: 'flota',
  labelKey: 'flota:nav.modulo',
  subtituloKey: 'flota:nav.bajada',
  icono: Car,
  modulo: 'flota',
  hub: '/app/flota/vehiculos',
  grupos: [
    {
      // `grupoOperacion` se queda en `common`: es vocabulario del SHELL que varios módulos comparten
      // (el ejemplo de Municipal del contrato §3 usa la misma clave). Lo que se mudó al namespace
      // del módulo son las etiquetas propias de Flota.
      tituloKey: 'shell.nav.grupoOperacion',
      items: [
        {
          key: 'flota.vehiculos',
          labelKey: 'flota:nav.vehiculos',
          icono: Car,
          ruta: '/app/flota/vehiculos',
          permiso: 'flota.vehiculos.leer',
          // El wizard de alta y la ficha de detalle dejan resaltado el listado.
          rutasHijas: ['/app/flota/vehiculos/'],
        },
        {
          key: 'flota.mapa',
          labelKey: 'flota:nav.mapa',
          icono: Map,
          ruta: '/app/flota/mapa',
          permiso: 'flota.vehiculos.leer',
        },
        {
          key: 'flota.dispositivos',
          labelKey: 'flota:nav.dispositivos',
          icono: RadioTower,
          ruta: '/app/flota/dispositivos',
          permiso: 'flota.dispositivos.leer',
          rutasHijas: ['/app/flota/dispositivos/'],
        },
        {
          key: 'flota.conductores',
          labelKey: 'flota:nav.conductores',
          icono: UserRound,
          ruta: '/app/flota/conductores',
          permiso: 'flota.conductores.leer',
          rutasHijas: ['/app/flota/conductores/'],
        },
        {
          key: 'flota.geozonas',
          labelKey: 'flota:nav.geozonas',
          icono: MapPin,
          ruta: '/app/flota/geozonas',
          permiso: 'flota.geozonas.leer',
        },
        {
          key: 'flota.problemas',
          labelKey: 'flota:nav.problemas',
          icono: TriangleAlert,
          ruta: '/app/flota/problemas',
          permiso: 'flota.problemas.leer',
          // Reglas e Integraciones son configuración del Centro: se llega por el submenú de la
          // pantalla, y desde la columna dejan resaltado el Centro. `integraciones` va SIN barra
          // final a propósito: es un ALIAS de una ruta hermana, no un prefijo de hijas.
          rutasHijas: ['/app/flota/problemas/', '/app/flota/integraciones'],
        },
      ],
    },
  ],
}

export const manifiesto: ManifiestoDeModulo = {
  key: 'flota',
  basePath: 'flota',
  routes: FlotaRoutes,
  navegacion,
  i18n: {
    namespace: 'flota',
    recursos: { 'es-AR': flotaEs, es: flotaEs, en: flotaEn },
  },
  orden: 10,
}
