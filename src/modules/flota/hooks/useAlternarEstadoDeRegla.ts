import { useMutation, useQueryClient } from '@tanstack/react-query'
import { flotaKeys } from '../query-keys'
import { reglasService } from '@/services/flota/reglas-service'
import type { ReglaProblemaDto } from '@/services/contracts/flota'

/**
 * Pausar / activar una regla desde el **kebab de la fila** —
 * `PATCH /api/flota/problemas/reglas/{reglaId}` con `{ activa }`, permiso `flota.reglas.gestionar`.
 *
 * ── POR QUE EXISTE, TENIENDO `useActualizarRegla` ─────────────────────────────────────────────
 * `useActualizarRegla(reglaId)` fija el id **en la construccion del hook**, y eso sirve para el
 * modal, donde hay una sola regla. En una **tabla** el id lo trae la fila que el usuario toco, y un
 * hook por fila no se puede llamar (las reglas de hooks lo prohiben) ni conviene (una mutacion viva
 * por fila renderizada). Acá el id viaja como **variable de la mutacion**, que es la forma correcta
 * para una accion de fila.
 *
 * No duplica la capa HTTP: llama al mismo `reglasService.actualizar` y invalida el mismo prefijo.
 *
 * ── ES LA BAJA OPERATIVA, NO UN BORRADO ───────────────────────────────────────────────────────
 * No existe `DELETE` de regla en el contrato (DA-PR-03) y no es un olvido: una regla borrada dejaria
 * problemas huerfanos de su origen. `activa: false` **detiene futuras evaluaciones** y nada mas — la
 * fila sigue en el listado con badge `Inactiva`, su historial y sus senales quedan, y **los problemas
 * ya abiertos no se silencian** (pausar es sobre la regla; silenciar es sobre un problema).
 *
 * ⚠️ La ACCION se llama "Pausar" y el ESTADO se lee "Inactiva": las 2 palabras salen de la ficha §4
 * y §6, no son un desprolijo. Si alguien las unifica, que sea cambiando la ficha primero.
 */
export function useAlternarEstadoDeRegla() {
  const queryClient = useQueryClient()

  return useMutation<ReglaProblemaDto, unknown, { reglaId: string; activa: boolean }>({
    mutationFn: async ({ reglaId, activa }) => {
      const respuesta = await reglasService.actualizar(reglaId, { activa })
      return respuesta.data
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: flotaKeys.reglasProblemas() })
    },
  })
}
