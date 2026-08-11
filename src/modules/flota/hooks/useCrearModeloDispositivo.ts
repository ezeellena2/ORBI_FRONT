import { useMutation, useQueryClient } from '@tanstack/react-query'
import { flotaKeys } from '../query-keys'
import { catalogosDispositivoService } from '@/services/flota/catalogos-dispositivo-service'
import type {
  CatalogoGrowableItemDto,
  CrearModeloDispositivoRequest,
} from '@/services/contracts/flota'

/**
 * Alta de un modelo de GPS PROPIO de la organizacion, desde el mismo modal de alta/edicion de
 * dispositivo ("¿no esta tu modelo? agregalo").
 *
 * Permiso `flota.dispositivos.crear` — no existe `flota.catalogos.*` y el catalogo de 44 permisos
 * esta cerrado (criterio P-F: un catalogo se gatea con el permiso del recurso al que alimenta).
 *
 * Invalida SOLO la key del catalogo, no la de dispositivos: agregar un modelo no cambia ningun
 * dispositivo existente.
 *
 * ⚠️ **Se siembra la fila nueva en la cache ANTES de invalidar**, y no es cosmetico: quien acaba de
 * agregarla la va a elegir en el select de inmediato. Sin esto, el formulario setea un `modeloId`
 * que todavia no esta entre las opciones y el select se ve VACIO hasta que vuelve el refetch — o
 * sea, "agregué mi modelo y no quedó seleccionado". La invalidacion sigue corriendo detras para
 * traer la version del servidor.
 *
 * Error que la UI ramifica por `code`: 409 `flota.catalogo.nombre_duplicado` con
 * `args {catalogo, nombre}`. OJO — choca solo contra las filas de la PROPIA organizacion: repetir el
 * nombre de una fila global devuelve 201 (B-14), asi que el select puede mostrar dos homonimos.
 */
export function useCrearModeloDispositivo() {
  const queryClient = useQueryClient()

  return useMutation<CatalogoGrowableItemDto, unknown, CrearModeloDispositivoRequest>({
    mutationFn: async (data) => {
      const respuesta = await catalogosDispositivoService.crearModeloDispositivo(data)
      return respuesta.data
    },
    onSuccess: (item) => {
      queryClient.setQueryData<CatalogoGrowableItemDto[]>(
        flotaKeys.modelosDispositivo(),
        (actual) => (actual === undefined ? [item] : [...actual, item]),
      )
      void queryClient.invalidateQueries({ queryKey: flotaKeys.modelosDispositivo() })
    },
  })
}
