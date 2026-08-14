import { describe, expect, it } from 'vitest'
import es from '@/shared/i18n/locales/es-AR/flota.json'
import en from '@/shared/i18n/locales/en/flota.json'
import {
  asignarDispositivoSchema,
  asignarVehiculoADispositivoSchema,
  VALORES_INICIALES_ASIGNAR,
  VALORES_INICIALES_ASIGNAR_VEHICULO,
} from './asignar-dispositivo'

/**
 * Los 2 sentidos de la MISMA operacion (`POST .../vehiculos/{id}/asignaciones/dispositivo`):
 *  - desde la ficha del vehiculo / el wizard, falta elegir el DISPOSITIVO;
 *  - desde el inventario (`f-07`), falta elegir el VEHICULO.
 *
 * ── QUE ANCLA ESTE ARCHIVO, Y POR QUE NINGUN OTRO GATE LO CUBRE ───────────────────────────────
 * El mensaje del campo requerido **es una clave i18n**, no un texto. Si esa clave no existe, `t()`
 * devuelve la clave cruda y el usuario lee `validation.vehiculo_flota_id.required` debajo de la
 * lista. Ese modo de falla pasa **todos** los gates: `tsc` ve un string valido, ESLint tambien, y
 * `verificar-i18n.mjs` compara es-AR contra en — una clave ausente en los DOS idiomas esta
 * parejamente ausente y el verificador la deja pasar. Es el defecto que ya se cobro dos veces en
 * este modulo (`resolucion-de-errores.test.ts`, `vocabularios-i18n.test.ts`).
 *
 * La clave **no se repite acá**: se lee del propio schema y se resuelve contra los JSON reales, asi
 * que un typo en el schema no puede "coincidir" con el typo del test.
 */

/** Resuelve `a.b.c` contra el JSON del locale. `undefined` = la clave no existe. */
function resolver(diccionario: unknown, clave: string): unknown {
  return clave
    .split('.')
    .reduce<unknown>(
      (nodo, tramo) =>
        typeof nodo === 'object' && nodo !== null
          ? (nodo as Record<string, unknown>)[tramo]
          : undefined,
      diccionario,
    )
}

const LOCALES = [
  ['es-AR', es],
  ['en', en],
] as const

function esperarTexto(clave: string) {
  for (const [idioma, diccionario] of LOCALES) {
    const valor = resolver(diccionario, clave)
    expect(typeof valor, `${clave} falta o no es texto en ${idioma}`).toBe('string')
    expect((valor as string).length, `${clave} esta vacia en ${idioma}`).toBeGreaterThan(0)
  }
}

/** El mensaje del primer issue de un parse fallido — que es la clave i18n que la UI va a resolver. */
function claveDelRequerido(resultado: { success: boolean; error?: { issues: { message: string }[] } }) {
  expect(resultado.success).toBe(false)
  return resultado.error!.issues[0]!.message
}

describe('asignar dispositivo <-> vehiculo: los 2 sentidos', () => {
  it('sin dispositivo elegido rechaza, y su mensaje es una clave que existe en los 2 idiomas', () => {
    const clave = claveDelRequerido(asignarDispositivoSchema.safeParse({ dispositivoFlotaId: '' }))
    esperarTexto(clave)
  })

  it('sin vehiculo elegido rechaza, y su mensaje es una clave que existe en los 2 idiomas', () => {
    const clave = claveDelRequerido(
      asignarVehiculoADispositivoSchema.safeParse({ vehiculoFlotaId: '' }),
    )
    esperarTexto(clave)
  })

  it('con un id elegido, los 2 schemas aceptan', () => {
    expect(
      asignarDispositivoSchema.safeParse({ dispositivoFlotaId: 'e2f1…' }).success,
    ).toBe(true)
    expect(
      asignarVehiculoADispositivoSchema.safeParse({ vehiculoFlotaId: 'e2f1…' }).success,
    ).toBe(true)
  })

  /*
    `''` y NO `undefined`. Es un invariante de render, no una preferencia: el valor inicial va al
    `GrupoRadio` del selector, y `undefined` lo hace nacer NO CONTROLADO para pasar a controlado al
    primer click — el warning que Base UI ya reporto una vez en este modulo. `''` es un valor
    controlado valido y significa exactamente lo mismo: nada elegido.
  */
  it('los valores iniciales son cadena vacia, no undefined', () => {
    expect(VALORES_INICIALES_ASIGNAR.dispositivoFlotaId).toBe('')
    expect(VALORES_INICIALES_ASIGNAR_VEHICULO.vehiculoFlotaId).toBe('')
  })
})
