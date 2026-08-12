import { z } from 'zod'
import type { SubirDocumentoRequest } from '@/services/contracts/flota'

/**
 * Schema del modal "Cargar documento" del conductor
 * (`POST /api/flota/conductores/{id}/documentos`, permiso `flota.conductores.gestionar-documentos`).
 *
 * ── FASE 1 = URL EXTERNA (D-C2). NO HAY FILE-PICKER ───────────────────────────────────────────
 * El request es **`application/json`** con `urlExterna` + metadatos: **nunca** `multipart/form-data`,
 * nunca un `<input type="file">`. Flota no recibe binarios en v1 y `Platform.Storage` **no existe**.
 * El formulario pide el **enlace al archivo ya alojado**. El upload real llega en fase 2.
 *
 * `urlExterna` es **OPCIONAL** por contrato: se admite cargar los metadatos ahora y adjuntar el
 * archivo despues (la columna es `url_externa text NULL`, donde NULL = "todavia sin archivo").
 *
 * ── QUE VALIDA EL BACKEND, Y QUE NO ───────────────────────────────────────────────────────────
 * `SubirDocumentoRequestValidator` tiene **solo 2 reglas de forma**, y las dos estan replicadas acá
 * con su `WithErrorCode`: `validation.tipo_documento.required` y `validation.numero.max_length`
 * (100). El resto lo resuelve el SERVICE, no el Validator, y por eso no tiene `validation.*`:
 *  - **el tipo** se valida contra la TABLA del catalogo de la organizacion → 400
 *    `flota.documento.tipo_invalido`;
 *  - **la URL**, con la regla anti-SSRF (exige `https`, rechaza IP privada/loopback/link-local y
 *    hostname que resuelva a rango privado, con resolucion DNS real) → 400
 *    `flota.documento.url_no_permitida`.
 *
 * El chequeo local de `https` es **ergonomia**: evita el viaje de ida y vuelta para el error mas
 * obvio. **No reemplaza** al del servidor, que es el unico que puede resolver el hostname — por eso
 * el modal muestra igual el 400 traducido cuando llega.
 *
 * ── LA CATEGORIA DE LICENCIA NO SE PIDE ───────────────────────────────────────────────────────
 * Acá se carga la licencia (`tipoDocumento: 'licencia'`), que es la FUENTE del objeto `licencia` del
 * conductor: escribe `numero`, `fechaEmision` y `fechaVencimiento`. **`categoria` sigue sin destino**
 * mientras **B-21** siga abierta, asi que un campo "Categoria" perderia el dato en silencio.
 */

const NUMERO_LARGO_MAXIMO = 100

/** Fecha `YYYY-MM-DD` de un `<input type="date">`; el contrato la espera como ISO date. */
const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/

export const cargarDocumentoConductorSchema = z
  .object({
    tipoDocumento: z.string().min(1, 'validation.tipo_documento.required'),
    numero: z.string().trim().max(NUMERO_LARGO_MAXIMO, 'validation.numero.max_length'),
    fechaEmision: z.string().trim(),
    fechaVencimiento: z.string().trim(),
    urlExterna: z.string().trim(),
  })
  .superRefine((valores, ctx) => {
    if (valores.urlExterna.length > 0 && !valores.urlExterna.toLowerCase().startsWith('https://')) {
      ctx.addIssue({
        code: 'custom',
        path: ['urlExterna'],
        message: 'validation.url_externa.https_required',
      })
    }

    if (valores.fechaEmision.length > 0 && !ISO_DATE.test(valores.fechaEmision)) {
      ctx.addIssue({
        code: 'custom',
        path: ['fechaEmision'],
        message: 'validation.fecha_emision.invalid',
      })
    }

    if (valores.fechaVencimiento.length > 0 && !ISO_DATE.test(valores.fechaVencimiento)) {
      ctx.addIssue({
        code: 'custom',
        path: ['fechaVencimiento'],
        message: 'validation.fecha_vencimiento.invalid',
      })
    }
  })

export type CargarDocumentoConductorFormulario = z.infer<typeof cargarDocumentoConductorSchema>

export function valoresInicialesCargarDocumento(
  tipoDocumento = '',
): CargarDocumentoConductorFormulario {
  return {
    tipoDocumento,
    numero: '',
    fechaEmision: '',
    fechaVencimiento: '',
    urlExterna: '',
  }
}

/**
 * Los opcionales vacios se OMITEN (`undefined`), no viajan como `''`: `JSON.stringify` descarta las
 * propiedades `undefined`, y una fecha `''` seria un 400 de forma por no haber completado algo que el
 * contrato declara opcional.
 */
export function aSubirDocumentoRequest(
  valores: CargarDocumentoConductorFormulario,
): SubirDocumentoRequest {
  const texto = (valor: string) => (valor.trim().length > 0 ? valor.trim() : undefined)

  return {
    tipoDocumento: valores.tipoDocumento,
    numero: texto(valores.numero),
    fechaEmision: texto(valores.fechaEmision),
    fechaVencimiento: texto(valores.fechaVencimiento),
    urlExterna: texto(valores.urlExterna),
  }
}
