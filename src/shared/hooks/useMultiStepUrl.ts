import { useCallback, useState } from 'react'
import { useSearchParams } from 'react-router-dom'

interface UseMultiStepUrlOptions {
  totalSteps: number
  paramName?: string
}

/**
 * Sincroniza el paso actual de un formulario multi-step con ?step=N en la URL.
 *
 * - Browser back/forward navega entre pasos.
 * - Refresh mantiene el paso actual en la URL (aunque los datos del form se pierden).
 * - Guard contra skip: no permite ir a un step mayor que maxReachedStep + 1.
 * - Si el step en la URL es invalido o mayor al maximo alcanzado, se corrige a 1.
 *
 * El techo del guard (`maxReachedStep`) es ESTADO, no una ref. Importa porque esta
 * variable ES el guard anti-skip: React puede empezar un render y descartarlo
 * (transicion interrumpida, StrictMode, Suspense), y una ref NO se revierte con el
 * render que la escribio. Como ref subida en pleno render, un render descartado dejaba
 * el techo arriba sin que el usuario hubiera llegado nunca a ese paso — y como se
 * permite `maxReached + 1`, un techo inflado en 1 es un paso salteado. El estado se
 * revierte junto con el render, que es exactamente lo que el guard necesita.
 *
 * El `setMaxReachedStep` durante el render es el ajuste que React documenta en
 * "You Might Not Need an Effect": React descarta el render en curso y re-renderiza con
 * el valor nuevo antes de tocar el DOM, sin commit intermedio ni parpadeo. Es la unica
 * forma soportada de derivar esto; en un effect seria un render en cascada, y la regla
 * `react-hooks/set-state-in-effect` lo rechaza.
 */
export function useMultiStepUrl({ totalSteps, paramName = 'step' }: UseMultiStepUrlOptions) {
  const [searchParams, setSearchParams] = useSearchParams()
  const [maxReachedStep, setMaxReachedStep] = useState(1)

  const rawStep = parseInt(searchParams.get(paramName) || '1', 10)
  const currentStep = isValidStep(rawStep, totalSteps, maxReachedStep) ? rawStep : 1

  if (currentStep > maxReachedStep) {
    setMaxReachedStep(currentStep)
  }

  const goToStep = useCallback(
    (step: number) => {
      const clamped = Math.max(1, Math.min(step, totalSteps))
      if (clamped > maxReachedStep + 1) return

      setSearchParams({ [paramName]: String(clamped) }, { replace: false })
    },
    [totalSteps, paramName, setSearchParams, maxReachedStep],
  )

  const goBack = useCallback(() => {
    if (currentStep > 1) {
      setSearchParams({ [paramName]: String(currentStep - 1) }, { replace: false })
    }
  }, [currentStep, paramName, setSearchParams])

  const resetToFirstStep = useCallback(() => {
    setMaxReachedStep(1)
    setSearchParams({ [paramName]: '1' }, { replace: true })
  }, [paramName, setSearchParams])

  return { currentStep, goToStep, goBack, resetToFirstStep } as const
}

function isValidStep(step: number, totalSteps: number, maxReached: number): boolean {
  return Number.isInteger(step) && step >= 1 && step <= totalSteps && step <= maxReached + 1
}
