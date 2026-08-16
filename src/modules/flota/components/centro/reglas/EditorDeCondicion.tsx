import { useTranslation } from 'react-i18next'
import { Plus, Trash2 } from 'lucide-react'
import { AccionConMotivo } from '../../AccionConMotivo'
import { Boton } from '@/shared/ui/Boton'
import { BotonIcono } from '@/shared/ui/BotonIcono'
import { Campo } from '@/shared/ui/Campo'
import { Input } from '@/shared/ui/Input'
import { Select, type OpcionSelect } from '@/shared/ui/Select'
import { claveDeMotivoCondicionInvalida } from '../../../vocabulario-centro-problemas'
import {
  CAMPOS_DSL,
  LIMITES_CONDICION,
  VALORES_DTC_CRITICIDAD,
  campoDsl,
  claveDeAyudaDeCampoDsl,
  claveDeCampoDsl,
  claveDeOperadorDsl,
  operadoresAdmitidos,
  type VeredictoCondicion,
} from '../../../vocabulario-reglas-problemas'
import {
  FILA_CONDICION_INICIAL,
  type FilaCondicionFormulario,
} from '../../../schemas/regla-problema'
import type { CampoCondicionRegla, OperadorCondicionRegla } from '@/services/contracts/flota'

/**
 * Editor **estructurado** de la condicion de una regla — produce el **DSL v1 y nada mas**.
 *
 * ── POR QUE NO ES UN TEXTAREA ─────────────────────────────────────────────────────────────────
 * `f-10` paso 7 lo dice literal: el diseno del editor es PENDIENTE (resto de DA-PR-02), y hasta
 * cerrarlo el v1 es un editor **que solo puede producir el shape §2.1**. Un textarea de JSON libre
 * deja al usuario adivinar 13 campos, 7 operadores y una tabla de compatibilidad que no viaja por
 * ningun endpoint — y convierte cada error de tipeo en un round-trip.
 *
 * ── LO QUE ESTA UI HACE IMPOSIBLE, POR CONSTRUCCION ───────────────────────────────────────────
 *  - **`combinador: "or"` y anidar**: no hay control. El "y" entre filas es texto, no un select. v1
 *    es una lista plana AND (`motor-de-reglas.md` §2.1) y ofrecer el "o" seria ofrecer `version: 2`.
 *  - **Un operador que el campo no admite**: el select de operador se rearma con
 *    `operadoresAdmitidos(campo)`, asi que la causa 5 solo puede llegar de una regla creada por otra
 *    via.
 *  - **`umbral_minutos` sin `sostenido_por`**: el control aparece **solo** con ese operador.
 *
 * ── LO QUE SIGUE PUDIENDO FALLAR, Y POR ESO EL VEREDICTO ENTRA POR PROP ───────────────────────
 * El **valor** es texto libre (un numero mal tipeado, una lista `in` con repetidos, un campo vacio).
 * Eso lo decide `validarCondicionEnCliente` con **las mismas 9 causas y el mismo orden** que el
 * dominio, y el mensaje que se muestra es **el mismo** que resuelve el 400 del backend
 * (`condicionInvalida.motivo.*`): el usuario lee el mismo texto venga de donde venga.
 */
export function EditorDeCondicion({
  filas,
  onCambio,
  veredicto,
  deshabilitado,
}: {
  filas: FilaCondicionFormulario[]
  onCambio: (filas: FilaCondicionFormulario[]) => void
  /** `null` = todavia no se intento guardar; no se pinta nada. */
  veredicto: VeredictoCondicion | null
  deshabilitado: boolean
}) {
  const { t } = useTranslation('flota')

  const enElMaximo = filas.length >= LIMITES_CONDICION.maximoCondiciones
  const motivoDeTope = enElMaximo
    ? t('centro.reglas.modal.maximoCondiciones', { maximo: LIMITES_CONDICION.maximoCondiciones })
    : undefined

  function cambiarFila(indice: number, fila: FilaCondicionFormulario) {
    onCambio(filas.map((actual, posicion) => (posicion === indice ? fila : actual)))
  }

  return (
    <div className="flex flex-col gap-3 rounded-lg border border-borde bg-superficie-2 p-3">
      {filas.map((fila, indice) => (
        <FilaDeCondicion
          // El indice ES la identidad de la fila acá: el DSL es posicional (`args.indice` del 400
          // apunta a la posicion) y las filas no tienen id propio.
          key={indice}
          fila={fila}
          indice={indice}
          esPrimera={indice === 0}
          puedeQuitar={filas.length > LIMITES_CONDICION.minimoCondiciones}
          deshabilitado={deshabilitado}
          error={mensajeDeError(veredicto, indice, t)}
          onCambio={(nueva) => cambiarFila(indice, nueva)}
          onQuitar={() => onCambio(filas.filter((_, posicion) => posicion !== indice))}
        />
      ))}

      {mensajeGeneral(veredicto, t) === null ? null : (
        <p role="alert" className="text-xs text-peligro">
          {mensajeGeneral(veredicto, t)}
        </p>
      )}

      <AccionConMotivo motivo={motivoDeTope}>
        <Boton
          variante="secundaria"
          tamano="sm"
          iconoIzq={Plus}
          deshabilitado={deshabilitado || enElMaximo}
          onClick={() => onCambio([...filas, { ...FILA_CONDICION_INICIAL }])}
        >
          {t('centro.reglas.modal.agregarCondicion')}
        </Boton>
      </AccionConMotivo>
    </div>
  )
}

/** El error de la fila `indice`. Las 3 causas sin indice no se pintan acá: van arriba, generales. */
function mensajeDeError(
  veredicto: VeredictoCondicion | null,
  indice: number,
  t: (clave: string, opciones?: Record<string, unknown>) => string,
): string | undefined {
  if (veredicto === null || veredicto.valida) return undefined
  if (veredicto.indice !== indice) return undefined
  // Por el helper y no por concatenacion a mano: `claveDeMotivoCondicionInvalida` cae en
  // `desconocido` si el backend manda un motivo que el front no conoce, y esa rama SI tiene copy.
  // Concatenar acá dejaría `condicionInvalida.motivo.loQueSea` en pantalla.
  return t(claveDeMotivoCondicionInvalida(veredicto.motivo ?? ''))
}

function mensajeGeneral(
  veredicto: VeredictoCondicion | null,
  t: (clave: string, opciones?: Record<string, unknown>) => string,
): string | null {
  if (veredicto === null || veredicto.valida || veredicto.indice !== null) return null
  // Por el helper y no por concatenacion a mano: `claveDeMotivoCondicionInvalida` cae en
  // `desconocido` si el backend manda un motivo que el front no conoce, y esa rama SI tiene copy.
  // Concatenar acá dejaría `condicionInvalida.motivo.loQueSea` en pantalla.
  return t(claveDeMotivoCondicionInvalida(veredicto.motivo ?? ''))
}

function FilaDeCondicion({
  fila,
  indice,
  esPrimera,
  puedeQuitar,
  deshabilitado,
  error,
  onCambio,
  onQuitar,
}: {
  fila: FilaCondicionFormulario
  indice: number
  esPrimera: boolean
  puedeQuitar: boolean
  deshabilitado: boolean
  error: string | undefined
  onCambio: (fila: FilaCondicionFormulario) => void
  onQuitar: () => void
}) {
  const { t } = useTranslation('flota')

  const definicion = campoDsl(fila.campo)
  const esSostenidoPor = fila.operador === 'sostenido_por'

  const opcionesDeCampo: OpcionSelect[] = CAMPOS_DSL.map((campo) => ({
    valor: campo.codigo,
    etiqueta: t(claveDeCampoDsl(campo.codigo)),
  }))

  const opcionesDeOperador: OpcionSelect[] = operadoresAdmitidos(fila.campo).map((operador) => ({
    valor: operador,
    etiqueta: t(claveDeOperadorDsl(operador)),
  }))

  /*
    Cambiar de campo puede dejar el operador fuera de los admitidos (pasar de `velocidad_kmh` a
    `ignicion` con `>` puesto). Se reencuadra al primer operador admitido y se VACIA el valor: el
    tipo cambia con el campo, y arrastrar un `110` a un campo booleano produce un
    `tipo_de_valor_incompatible` sobre algo que el usuario no volvio a tocar.
  */
  function cambiarCampo(codigo: string) {
    const admitidos = operadoresAdmitidos(codigo)
    const operador = admitidos.includes(fila.operador as OperadorCondicionRegla)
      ? fila.operador
      : (admitidos[0] ?? '')

    onCambio({ campo: codigo, operador, valor: '', umbralMinutos: '' })
  }

  /*
    El umbral se descarta al salir de `sostenido_por`: mandarlo con otro operador es la causa 7, y
    el control ya no esta a la vista para corregirlo.

    El VALOR se conserva, aunque entrar o salir de `in` le cambie la forma (lista vs. unico): lo que
    el usuario tipeo sigue siendo la mejor base para editar, y borrarlo en cada cambio de operador
    obligaria a retipear el codigo DTC completo.
  */
  function cambiarOperador(operador: string) {
    onCambio({
      ...fila,
      operador,
      umbralMinutos: operador === 'sostenido_por' ? fila.umbralMinutos : '',
    })
  }

  return (
    <div className="flex flex-col gap-2">
      {esPrimera ? null : (
        <p className="text-xs font-medium tracking-wide text-fg-terciario uppercase">
          {t('centro.reglas.modal.combinadorFijo')}
        </p>
      )}

      <div className="flex flex-wrap items-start gap-2">
        <Campo
          etiqueta={t('centro.reglas.modal.campo')}
          ayuda={definicion === null ? undefined : t(claveDeAyudaDeCampoDsl(definicion.codigo))}
          className="min-w-52 flex-1"
        >
          {(control) => (
            <Select
              {...control}
              opciones={opcionesDeCampo}
              valor={fila.campo}
              onCambio={cambiarCampo}
              deshabilitado={deshabilitado}
            />
          )}
        </Campo>

        <Campo etiqueta={t('centro.reglas.modal.operador')} className="min-w-40 flex-1">
          {(control) => (
            <Select
              {...control}
              opciones={opcionesDeOperador}
              valor={fila.operador}
              onCambio={cambiarOperador}
              deshabilitado={deshabilitado}
            />
          )}
        </Campo>

        <ControlDeValor
          fila={fila}
          error={error}
          deshabilitado={deshabilitado}
          onCambio={(valor) => onCambio({ ...fila, valor })}
        />

        {esSostenidoPor ? (
          <Campo
            etiqueta={t('centro.reglas.modal.umbral')}
            ayuda={t('centro.reglas.modal.umbralAyuda')}
            className="min-w-36"
          >
            {(control) => (
              <Input
                {...control}
                inputMode="numeric"
                value={fila.umbralMinutos}
                onChange={(evento) => onCambio({ ...fila, umbralMinutos: evento.target.value })}
                disabled={deshabilitado}
              />
            )}
          </Campo>
        ) : null}

        <div className="pt-6">
          <AccionConMotivo
            motivo={
              puedeQuitar ? undefined : t('centro.reglas.modal.minimoCondiciones')
            }
          >
            <BotonIcono
              icono={Trash2}
              etiqueta={t('centro.reglas.modal.quitarCondicion', { indice: indice + 1 })}
              variante="fantasma"
              tamano="sm"
              deshabilitado={deshabilitado || !puedeQuitar}
              onClick={onQuitar}
            />
          </AccionConMotivo>
        </div>
      </div>
    </div>
  )
}

/**
 * El control del `valor` cambia con el par campo+operador. Son 4 formas y cada una evita un error:
 *  - **lista** (`in`): un texto con la ayuda de separacion por coma. Sin la ayuda, el usuario tipea
 *    "P0300 P0420" y recibe una lista de un elemento que nunca matchea.
 *  - **booleano**: un select de 2. Un input libre produciria `"si"`, que es `tipo_de_valor_incompatible`.
 *  - **`dtc_criticidad`**: select de los 4 valores que §2.2 enumera. ⚠️ El backend **no los valida**
 *    (solo exige texto): el select existe para que nadie tipee `critico` y arme una regla muerta.
 *  - **numero / texto libre**: input, con `inputMode` numerico cuando corresponde.
 */
function ControlDeValor({
  fila,
  error,
  deshabilitado,
  onCambio,
}: {
  fila: FilaCondicionFormulario
  error: string | undefined
  deshabilitado: boolean
  onCambio: (valor: string) => void
}) {
  const { t } = useTranslation('flota')

  const definicion = campoDsl(fila.campo)
  const esLista = fila.operador === 'in'
  const esCriticidad = fila.campo === ('dtc_criticidad' satisfies CampoCondicionRegla) && !esLista

  const opcionesBooleanas: OpcionSelect[] = [
    { valor: 'true', etiqueta: t('centro.reglas.modal.verdadero') },
    { valor: 'false', etiqueta: t('centro.reglas.modal.falso') },
  ]

  const opcionesCriticidad: OpcionSelect[] = VALORES_DTC_CRITICIDAD.map((valor) => ({
    valor,
    etiqueta: t(`severidadProblema.${valor}`),
  }))

  const ayuda = esLista ? t('centro.reglas.modal.listaAyuda') : undefined

  return (
    <Campo
      etiqueta={t('centro.reglas.modal.valor')}
      ayuda={ayuda}
      error={error}
      className="min-w-52 flex-1"
    >
      {(control) => {
        if (definicion?.tipo === 'booleano' && !esLista) {
          return (
            <Select
              {...control}
              opciones={opcionesBooleanas}
              valor={fila.valor}
              onCambio={onCambio}
              deshabilitado={deshabilitado}
              placeholder={t('centro.reglas.modal.valorPlaceholder')}
            />
          )
        }

        if (esCriticidad) {
          return (
            <Select
              {...control}
              opciones={opcionesCriticidad}
              valor={fila.valor}
              onCambio={onCambio}
              deshabilitado={deshabilitado}
              placeholder={t('centro.reglas.modal.valorPlaceholder')}
            />
          )
        }

        return (
          <Input
            {...control}
            value={fila.valor}
            onChange={(evento) => onCambio(evento.target.value)}
            inputMode={definicion?.tipo === 'numero' && !esLista ? 'numeric' : undefined}
            invalido={error !== undefined}
            disabled={deshabilitado}
          />
        )
      }}
    </Campo>
  )
}
