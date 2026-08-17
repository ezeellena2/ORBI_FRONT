import { useMutation, useQueryClient } from '@tanstack/react-query'
import { flotaKeys } from '../query-keys'
import { reglasService } from '@/services/flota/reglas-service'
import type { CrearReglaProblemaRequest, ReglaProblemaDto } from '@/services/contracts/flota'

/**
 * Alta de regla — `POST /api/flota/problemas/reglas`, permiso `flota.reglas.gestionar`.
 *
 * Devuelve **200 con la regla creada** (no 201): `api.md` no declara `GET /reglas/{id}`, asi que un
 * `Location` apuntaria a una URL rota. El id sale del cuerpo.
 *
 * ⚠️ El **alcance no se envia** — el request no acepta `vehiculosIds`, `conductoresIds`,
 * `geozonasIds`, `destinatarios` ni `canalesInternos` (PENDIENTE #2). El modal **no ofrece el
 * selector y lo DICE**: la regla que se acaba de crear alcanza a **toda la organizacion**. Un
 * selector deshabilitado sin explicacion se lee como "todavia no lo cargue".
 *
 * ⚠️ Errores que la pantalla distingue **por `code`**:
 *  - 400 `flota.regla.condicion_invalida` con `args {indice, motivo}` — es de **campo**: va al editor
 *    de condicion, no al banner. `indice` viaja `null` en las 3 causas que no son de una condicion
 *    concreta (version, combinador, cantidad). **Nada se persistio**: no existe "regla rota" en DB.
 *  - **Nombre duplicado NO tiene `code`** (DA-PR-07) y tampoco hay indice unico: no anticipar uno.
 *
 * ⚠️ `condiciones[].umbral_minutos` viaja en **snake_case**. Camelizarlo lo deja en `null` y la
 * regla se rechaza con `motivo: 'umbral_minutos_invalido'`, sin ninguna pista de que el nombre
 * estaba mal.
 */
export function useCrearRegla() {
  const queryClient = useQueryClient()

  return useMutation<ReglaProblemaDto, unknown, CrearReglaProblemaRequest>({
    mutationFn: async (data) => {
      const respuesta = await reglasService.crear(data)
      return respuesta.data
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: flotaKeys.reglasProblemas() })
    },
  })
}
