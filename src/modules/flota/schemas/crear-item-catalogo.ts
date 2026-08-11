import { z } from 'zod'
import type {
  CrearModeloDispositivoRequest,
  CrearProveedorSimRequest,
} from '@/services/contracts/flota'

/**
 * Schema del alta de una fila de catalogo growable (`POST /api/flota/catalogos/*`).
 *
 * Replica UNA A UNA `CrearModeloDispositivoRequestValidator` /
 * `CrearProveedorSimRequestValidator` y usa LOS MISMOS `WithErrorCode`: el string
 * `validation.nombre.required` es a la vez la clave i18n del error local de Zod y la del 400 del
 * backend, asi que el usuario lee el mismo texto venga de donde venga el rechazo.
 *
 * Lo que NO se valida en cliente, a proposito: la **unicidad del nombre**. Es estado de DB y la
 * regla es una expresion (`COALESCE(organizacion_id, uuid-cero), lower(nombre)`) que el browser no
 * puede evaluar. Vuelve como 409 `flota.catalogo.nombre_duplicado`.
 *
 * ⚠️ Repetir el nombre de una fila GLOBAL es legal y devuelve 201 (B-14): el indice parcial manda
 * las dos filas a claves distintas. El select puede terminar mostrando dos homonimos. Es deliberado
 * y no se "arregla" con una validacion de cliente que el servidor no tiene.
 */

const NOMBRE_LARGO_MAXIMO = 100
const FABRICANTE_LARGO_MAXIMO = 100

export const crearItemCatalogoSchema = z.object({
  nombre: z
    .string()
    .trim()
    .min(1, 'validation.nombre.required')
    .max(NOMBRE_LARGO_MAXIMO, 'validation.nombre.max_length'),

  // Solo lo usa `modelos_dispositivo_flota`: `proveedores_sim_flota` NO tiene la columna, asi que el
  // campo no se renderiza para ese catalogo y viaja vacio (se omite del request).
  fabricante: z.string().trim().max(FABRICANTE_LARGO_MAXIMO, 'validation.fabricante.max_length'),
})

export type CrearItemCatalogoFormulario = z.infer<typeof crearItemCatalogoSchema>

export const VALORES_INICIALES_ITEM_CATALOGO: CrearItemCatalogoFormulario = {
  nombre: '',
  fabricante: '',
}

export function aCrearModeloDispositivoRequest(
  valores: CrearItemCatalogoFormulario,
): CrearModeloDispositivoRequest {
  const fabricante = valores.fabricante.trim()

  return {
    nombre: valores.nombre.trim(),
    fabricante: fabricante.length > 0 ? fabricante : undefined,
  }
}

/** `fabricante` se descarta: la tabla `proveedores_sim_flota` no tiene esa columna. */
export function aCrearProveedorSimRequest(
  valores: CrearItemCatalogoFormulario,
): CrearProveedorSimRequest {
  return { nombre: valores.nombre.trim() }
}
