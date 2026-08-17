/**
 * El reloj del navegador, detrás de una función propia.
 *
 * ══ POR QUÉ EXISTE ═════════════════════════════════════════════════════════════════════════════
 * Casi todo lo que necesita "ahora" en este módulo lo resuelve **sin reloj**: las antigüedades del
 * mapa y la línea "ahora" del timeline salen de los sellos de React Query (`dataUpdatedAt` /
 * `errorUpdatedAt`), que además son más correctos —todos los valores de una misma tanda se rinden
 * contra el mismo origen— y no son impuros.
 *
 * Queda **un** caso donde eso no alcanza: el `silenciarHastaUtc` del modal de Silenciar. El request
 * lleva un instante **absoluto** (el silencio arranca ahora y solo viaja el "hasta"), así que hay
 * que leer el reloj en el momento de enviar. No es un valor que se muestre: es un dato que viaja al
 * servidor una sola vez, cuando el usuario aprieta el botón.
 *
 * `react-hooks/purity` frena `Date.now()` escrito adentro de un componente, y hace bien: no puede
 * distinguir el cuerpo de un `handleSubmit` del cuerpo del render, y un reloj leído en render
 * produce valores distintos en cada re-render sin que haya cambiado ningún dato. Aislarlo acá es la
 * salida correcta y no un rodeo para callar al linter — deja el reloj en **un solo lugar**,
 * sustituible, y hace que cualquier lectura nueva sea visible en el diff.
 *
 * ⚠️ **No usar para formatear ni para posicionar nada en pantalla.** Para eso están los sellos de
 * React Query. Si aparece un segundo llamador que dibuja algo con esto, es una revisión, no un
 * import más.
 */
export function ahoraDelNavegadorMs(): number {
  return Date.now()
}
