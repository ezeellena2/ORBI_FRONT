import { useMutation, useQueryClient } from '@tanstack/react-query'
import { flotaKeys } from '../query-keys'
import { conductoresService } from '@/services/flota/conductores-service'
import type { DocumentoDto, SubirDocumentoRequest } from '@/services/contracts/flota'

/**
 * Carga de un documento del conductor (`POST .../{id}/documentos`, permiso
 * `flota.conductores.gestionar-documentos`).
 *
 * ⚠️ FASE 1 = URL EXTERNA (D-C2). El request es **`application/json`** con `urlExterna` + metadatos:
 * NUNCA `multipart/form-data`, nunca un `<input type="file">`. Flota no recibe binarios en v1 y
 * `Platform.Storage` no existe. El upload real llega en fase 2.
 *
 * `urlExterna` es OPCIONAL: se admite cargar metadatos y adjuntar el archivo despues.
 *
 * ⚠️ ACA SE CARGA LA LICENCIA (`tipoDocumento: 'licencia'`): es la FUENTE del objeto `licencia` del
 * conductor y el motivo por el que el alta rechaza ese bloque. Escribe numero, emision y
 * vencimiento; **`categoria` sigue sin destino** mientras B-21 siga abierta, asi que un campo
 * "Categoria" en este formulario perderia el dato en silencio. No dibujarlo.
 *
 * Errores POR `code`:
 *  - 400 `flota.documento.tipo_invalido` (`args {tipo}`) — fuera del catalogo DB de la organizacion.
 *  - 400 `flota.documento.url_no_permitida` (`args {url}`) — regla anti-SSRF: exige `https`, rechaza
 *    IP privada / loopback / link-local y hostname que resuelva a rango privado.
 *
 * Invalida el prefijo del conductor: cargar la licencia cambia `licencia`, `documentosObligatorios`
 * y el badge del listado, no solo la tabla de documentos.
 */
export function useCargarDocumentoConductor(conductorId: string) {
  const queryClient = useQueryClient()

  return useMutation<DocumentoDto, unknown, SubirDocumentoRequest>({
    mutationFn: async (data) => {
      const respuesta = await conductoresService.cargarDocumento(conductorId, data)
      return respuesta.data
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: flotaKeys.conductores() })
    },
  })
}
