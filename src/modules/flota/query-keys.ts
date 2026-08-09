import type { VehiculosPageQuery } from '@/services/contracts/flota'

/**
 * Query keys de Flota — convencion `['flota', '<recurso>', <parametros>]` de `frontend.md` §5.
 *
 * El prefijo compartido es deliberado: invalidar `['flota', 'vehiculos']` alcanza al listado con
 * cualquier filtro Y al detalle de cualquier id. Es exactamente lo que hace falta despues de un
 * alta, una edicion o una baja.
 */
export const flotaKeys = {
  /** Raiz del modulo. Invalidarla tira toda la cache de Flota. */
  todo: () => ['flota'] as const,

  /** Prefijo del recurso vehiculo: listado + detalle. Es la key que invalidan las mutations. */
  vehiculos: () => ['flota', 'vehiculos'] as const,

  vehiculosListado: (query: VehiculosPageQuery) => ['flota', 'vehiculos', query] as const,

  vehiculoDetalle: (vehiculoFlotaId: string) =>
    ['flota', 'vehiculos', vehiculoFlotaId] as const,

  /**
   * Catalogo CANONICO (lo sirve PlataformaCanonica, no Flota). Se namespacea bajo `flota` igual
   * porque la cache es del cliente, no del backend: lo que importa es poder invalidarlo con el
   * resto del modulo.
   */
  catalogoMarcas: (q: string | undefined) => ['flota', 'catalogo', 'marcas', q ?? ''] as const,

  catalogoTipos: () => ['flota', 'catalogo', 'tipos-vehiculo'] as const,
}
