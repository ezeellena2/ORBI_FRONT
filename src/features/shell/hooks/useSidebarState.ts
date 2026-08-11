import { useEffect, useState } from 'react'

const STORAGE_KEY = 'tracauto-v2-sidebar-collapsed'

/**
 * Estado de colapso del sidebar, persistido en localStorage.
 *
 * La escritura NO va adentro del updater de `setCollapsed`: React puede invocar un
 * updater mas de una vez (StrictMode lo hace a proposito) y puede descartar el render
 * que lo produjo. El estado descartado vuelve atras; el `setItem` ya escrito, no. Eso
 * deja el storage diciendo una cosa y la UI mostrando otra, y la mentira sobrevive al
 * refresh. El updater devuelve el proximo estado y nada mas; persistir es un efecto.
 */
export function useSidebarState() {
  const [collapsed, setCollapsed] = useState(
    () => localStorage.getItem(STORAGE_KEY) === 'true'
  )

  useEffect(function persistirColapso() {
    localStorage.setItem(STORAGE_KEY, String(collapsed))
  }, [collapsed])

  function toggle() {
    setCollapsed(prev => !prev)
  }

  return { collapsed, toggle }
}
