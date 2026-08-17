import { useTranslation } from 'react-i18next'
import type { ProblemaPrioridadDto } from '@/services/contracts/flota'
import { BloqueDelCentro } from './BloqueDelCentro'
import {
  claveDeAyudaDeFactorPrioridad,
  claveDeFactorPrioridad,
} from '../../vocabulario-centro-problemas'
import { hayDesfasajeDePrioridad, sumaDeFactores } from '../../vocabulario-ticket-problema'

/**
 * Desglose auditable de la prioridad — los **7** factores, siempre, incluso con `puntos: 0`.
 *
 * Lo comparten el panel de contexto de la Sala y el aside del ticket.
 *
 * ══ POR QUÉ NO SE PRESENTA COMO UN CUADRE ══════════════════════════════════════════════════════
 * `f-09` paso 4 pide que *"la suma mostrada sea exactamente la `prioridad` del hero"*. **El contrato
 * dice que no cuadra siempre**: 3 de los 7 factores se recomponen al leer y no tienen snapshot en la
 * fila (DRIFT 8), así que un problema priorizado ayer puede traer factores que suman menos que su
 * prioridad guardada.
 *
 * Presentarlo como "47 = 20 + 15 + 12" haría que cada diferencia legítima se lea como un error de
 * cálculo — y empujaría a "arreglarla" inventando el resto. Se muestran **los dos números** (la
 * prioridad que ordena la bandeja y lo que los factores explican hoy) y, cuando difieren, la
 * pantalla **lo dice**. Manda `00-contrato/` sobre `03-build/`.
 *
 * Las etiquetas las resuelve el front por i18n desde `codigo`: `etiqueta` y `explicacion` del DTO
 * viajan **vacías** a propósito (son copy, y el backend tiene prohibido hardcodear copy de negocio).
 * Pintar `factor.etiqueta` directo deja la celda en blanco.
 */
export function DesgloseDePrioridad({ prioridad }: { prioridad: ProblemaPrioridadDto }) {
  const { t } = useTranslation('flota')

  const suma = sumaDeFactores(prioridad)
  const desfasada = hayDesfasajeDePrioridad(prioridad)

  return (
    <BloqueDelCentro titulo={t('prioridadDesglose.titulo')}>
      <p className="font-mono text-2xl tabular-nums text-fg-primario">{prioridad.prioridad}</p>

      <ul className="flex flex-col gap-1 text-xs">
        {prioridad.factores.map((factor) => (
          <li key={factor.codigo} className="flex items-baseline justify-between gap-2">
            <span
              className="text-fg-secundario"
              title={t(claveDeAyudaDeFactorPrioridad(factor.codigo))}
            >
              {t(claveDeFactorPrioridad(factor.codigo))}
            </span>
            <span className="font-mono tabular-nums text-fg-primario">{factor.puntos}</span>
          </li>
        ))}
      </ul>

      <div className="flex items-baseline justify-between gap-2 border-t border-borde pt-1.5 text-xs">
        <span className="text-fg-terciario">{t('prioridadDesglose.suma')}</span>
        <span className="font-mono tabular-nums text-fg-primario">{suma}</span>
      </div>

      {/*
        La aclaración general va SIEMPRE (explica que el desglose no es un cuadre) y la línea del
        desfasaje solo cuando los números efectivamente difieren: repetirla con la suma correcta
        sembraría una duda que no corresponde.
      */}
      <p className="text-xs text-fg-terciario">{t('prioridadDesglose.aclaracionSuma')}</p>

      {desfasada ? (
        <p className="text-xs text-fg-terciario">{t('prioridadDesglose.desfasaje')}</p>
      ) : null}
    </BloqueDelCentro>
  )
}
