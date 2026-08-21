import { createContext, use, useLayoutEffect, useState, type ReactNode } from 'react'

/**
 * Cómo una pantalla le pide al shell que le saque el `p-6` y le dé el alto completo.
 *
 * ── QUÉ PROBLEMA RESUELVE ─────────────────────────────────────────────────────────────────────
 * Casi toda pantalla de ORBI es un documento: título, contenido, aire alrededor. El mapa **no**:
 * es un tri-pane INMERSIVO que ocupa todo lo que hay, con los paneles pegados al lienzo y
 * separados por un borde. El mockup lo declara literal —`body.map-page .dashboard-content
 * { padding: 0 !important }` (`docs/mockupsv2/b2b/flota/styles.css:651`)— y sin esto la nuestra
 * quedaba como tres tarjetas flotando adentro de una página normal: el defecto de fondo que
 * separaba las dos versiones, más que cualquier control suelto.
 *
 * No es exclusivo de Flota: Municipal tiene su propia consola sobre mapa, y toda pantalla-lienzo
 * que venga después necesita lo mismo. Por eso vive en `shared/`, no en el módulo.
 *
 * ── POR QUÉ `useLayoutEffect` Y NO `useEffect` ────────────────────────────────────────────────
 * Los dos declaran lo mismo, pero `useEffect` corre **después** de que el navegador pintó: se veía
 * un frame con el mapa adentro del padding y el layout saltaba. `useLayoutEffect` corre antes del
 * paint, así que el primer frame ya sale a sangre.
 *
 * ── POR QUÉ NO SE DERIVA DE LA RUTA ───────────────────────────────────────────────────────────
 * Sería más directo que el shell mirara el `pathname` contra una lista, pero eso pone en el shell
 * una decisión que es de la pantalla, y obliga a tocar dos archivos por cada pantalla nueva. Acá
 * la pantalla lo declara sola; el shell solo obedece. (Con rutas de objeto se usaría `handle` de
 * React Router, pero `AppRouter` las declara en JSX y `useMatches` no está disponible.)
 */
const ContextoDeSangrado = createContext<((aSangre: boolean) => void) | null>(null)

export function ProveedorDeSangrado({ children }: { children: (aSangre: boolean) => ReactNode }) {
  const [aSangre, setASangre] = useState(false)

  return <ContextoDeSangrado value={setASangre}>{children(aSangre)}</ContextoDeSangrado>
}

/**
 * Se renderiza dentro de una pantalla para declararla a sangre. No dibuja nada.
 *
 * La limpieza es lo que importa tanto como el efecto: al desmontarse devuelve el padding, así que
 * navegar del mapa a Vehículos no deja la pantalla siguiente pegada al borde.
 *
 * Fuera del `AppShell` (Storybook, un test) no hay proveedor y **no falla**: no hace nada, que es
 * lo correcto — ahí tampoco hay padding del shell que sacar.
 */
export function PantallaASangre() {
  const declarar = use(ContextoDeSangrado)

  useLayoutEffect(
    function declararSangrado() {
      if (declarar === null) return
      declarar(true)
      return () => declarar(false)
    },
    [declarar],
  )

  return null
}
