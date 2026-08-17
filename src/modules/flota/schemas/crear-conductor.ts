import { z } from 'zod'
import type { CrearConductorRequest } from '@/services/contracts/flota'

/**
 * Schema del modal "Nuevo conductor" (`POST /api/flota/conductores`, `f-05` §4).
 *
 * Replica UNA A UNA `Flota.Application/Validators/CrearConductorRequestValidator.cs` y usa LOS
 * MISMOS `WithErrorCode`: `validation.numero_legajo.max_length` es a la vez la clave i18n del error
 * local de Zod y la del 400 del backend, asi que el usuario lee el mismo texto venga de donde venga
 * el rechazo. **Nada de limites inventados**: un tope de cliente que el servidor no tiene es una
 * regla fantasma. Por eso `notas`, `nombre` y `apellido` NO llevan maximo — el validator del backend
 * tampoco se los pone (van a columnas `text`).
 *
 * ── LOS DOS MODOS ─────────────────────────────────────────────────────────────────────────────
 *  - **Modo A** (`personaId`): la persona ya existe **y esta proyectada en esta organizacion**. Flota
 *    no puede verificar el uuid contra el Canonico (su superficie interna no tiene un `GET` de
 *    persona por id, solo el find-or-create POR DOCUMENTO), asi que valida contra la unica evidencia
 *    que posee y devuelve 404 `flota.conductor.persona_no_existe` si no la tiene.
 *  - **Modo B** (`persona` por documento): es el **camino real** — el operador tiene el documento en
 *    la mano, no un uuid. Ya no degrada: `find-or-create-por-documento` existe desde el 2026-08-11.
 *    Si la persona ya existe en ORBI **se REUSA, no se duplica**, y el Canonico **no pisa** su
 *    identidad.
 *
 * El backend exige **exactamente uno** de los dos (`validation.persona.modo_invalido`), asi que el
 * formulario es un discriminante: nunca se mandan los dos ni ninguno.
 *
 * ── QUE NO ENTRA, Y POR QUE NO ES UN OLVIDO ───────────────────────────────────────────────────
 *  - **Bloque de licencia** (categoria, numero, vencimiento): el Validator lo **RECHAZA con 400**
 *    `validation.licencia.sin_destino` — no lo descarta en silencio. No tiene donde persistirse
 *    (**B-21**). Se carga despues como documento con `tipoDocumento: 'licencia'`.
 *  - **Toggle "Enviar invitacion por email"**: idem, 400 `validation.enviar_invitacion.no_soportado`.
 *    **No hay canal de invitacion contratado**: Flota no invoca Notificaciones. Dibujarlo prometeria
 *    un mail que nadie manda.
 *  - **`email` y `fechaNacimiento` del Modo B**: el contrato firme del Canonico es
 *    `{tipoDocumento, numeroDocumento, nombre?, apellido?}` y **se DESCARTAN en silencio**. Un campo
 *    de formulario cuyo valor se pierde sin aviso es peor que su ausencia.
 */

/**
 * Cota del documento COMPUESTO, no de cada campo.
 *
 * `ResolverModoB` puebla `proyeccion_personas_canonicas_flota.documento_resumen varchar(50)` con
 * `"{tipoDocumento} {numeroDocumento}"`. El backend valida la concatenacion por eso mismo, y repartir
 * los 50 entre los dos campos a ojo seria el numero inventado que acá no hay.
 */
const DOCUMENTO_LARGO_MAXIMO = 50

/** `telefono_principal varchar(30)` de la misma proyeccion. */
const TELEFONO_LARGO_MAXIMO = 30

/** `conductores_flota.numero_legajo` (mismo tope en alta y en edicion). */
const LEGAJO_LARGO_MAXIMO = 50

export const crearConductorSchema = z
  .object({
    /** Discriminante del formulario. No viaja al backend: elige QUE se manda. */
    modo: z.enum(['existente', 'nuevo']),

    // ── Modo A
    personaId: z.string().trim(),

    // ── Modo B
    tipoDocumento: z.string().trim(),
    numeroDocumento: z.string().trim(),
    nombre: z.string().trim(),
    apellido: z.string().trim(),
    telefono: z.string().trim().max(TELEFONO_LARGO_MAXIMO, 'validation.telefono.max_length'),

    // ── Operativos (los dos modos)
    numeroLegajo: z.string().trim().max(LEGAJO_LARGO_MAXIMO, 'validation.numero_legajo.max_length'),
    notas: z.string().trim(),
  })
  .superRefine((valores, ctx) => {
    if (valores.modo === 'existente') {
      if (valores.personaId.length === 0) {
        ctx.addIssue({
          code: 'custom',
          path: ['personaId'],
          message: 'validation.persona_id.required',
        })
      }
      return
    }

    if (valores.tipoDocumento.length === 0) {
      ctx.addIssue({
        code: 'custom',
        path: ['tipoDocumento'],
        message: 'validation.tipo_documento.required',
      })
    }

    if (valores.numeroDocumento.length === 0) {
      ctx.addIssue({
        code: 'custom',
        path: ['numeroDocumento'],
        message: 'validation.numero_documento.required',
      })
    }

    if (valores.nombre.length === 0) {
      ctx.addIssue({ code: 'custom', path: ['nombre'], message: 'validation.nombre.required' })
    }

    if (valores.apellido.length === 0) {
      ctx.addIssue({ code: 'custom', path: ['apellido'], message: 'validation.apellido.required' })
    }

    // El error se ancla en `numeroDocumento` porque es el campo que el usuario puede acortar; el tipo
    // sale de un select cerrado.
    if (`${valores.tipoDocumento} ${valores.numeroDocumento}`.trim().length > DOCUMENTO_LARGO_MAXIMO) {
      ctx.addIssue({
        code: 'custom',
        path: ['numeroDocumento'],
        message: 'validation.documento.max_length',
      })
    }
  })

export type CrearConductorFormulario = z.infer<typeof crearConductorSchema>

export const VALORES_INICIALES_CREAR_CONDUCTOR: CrearConductorFormulario = {
  // El default es el Modo B: es el camino real del operador, que tiene el documento y no un uuid.
  modo: 'nuevo',
  personaId: '',
  tipoDocumento: 'dni',
  numeroDocumento: '',
  nombre: '',
  apellido: '',
  telefono: '',
  numeroLegajo: '',
  notas: '',
}

/**
 * Arma el request del modo elegido. Los campos opcionales vacios se OMITEN (`undefined`), no viajan
 * como `''`: `JSON.stringify` descarta las propiedades `undefined`, asi que el backend recibe el
 * campo ausente. Un `personaId: ''` seria un uuid invalido y produciria un 400 de forma por no haber
 * completado algo que en ese modo ni siquiera aplica.
 *
 * Los campos del modo NO elegido no se mandan **nunca**: el backend exige exactamente uno y mandar
 * los dos es 400 `validation.persona.modo_invalido`.
 */
export function aCrearConductorRequest(
  valores: CrearConductorFormulario,
): CrearConductorRequest {
  const texto = (valor: string) => (valor.trim().length > 0 ? valor.trim() : undefined)

  const operativos = {
    numeroLegajo: texto(valores.numeroLegajo),
    notas: texto(valores.notas),
  }

  if (valores.modo === 'existente') {
    return { personaId: valores.personaId.trim(), ...operativos }
  }

  return {
    persona: {
      tipoDocumento: valores.tipoDocumento.trim(),
      numeroDocumento: valores.numeroDocumento.trim(),
      nombre: valores.nombre.trim(),
      apellido: valores.apellido.trim(),
      telefono: texto(valores.telefono),
    },
    ...operativos,
  }
}
