import type {
  DispositivosPageQuery,
  HistorialStockQuery,
  VehiculosPageQuery,
} from '@/services/contracts/flota'

/**
 * Query keys de Flota — convencion `['flota', '<recurso>', <parametros>]` de `frontend.md` §5.
 *
 * El prefijo compartido es deliberado: invalidar `['flota', 'vehiculos']` alcanza al listado con
 * cualquier filtro Y al detalle de cualquier id. Es exactamente lo que hace falta despues de un
 * alta, una edicion o una baja.
 *
 * ⚠️ REGLA DE ESTABILIDAD DE LA KEY (ya nos costo un bucle infinito de requests una vez, en
 * `TabHistorial`): todo lo que entra en una key tiene que ser estable POR VALOR entre renders. Un
 * objeto recreado en cada render —o un `new Date().toISOString()` adentro— produce una key nueva por
 * render, y React Query dispara una query nueva por render. La forma correcta es hacer el DATO
 * estable (truncar el rango al dia, leer el store con selectores por campo), NUNCA memoizarlo a
 * mano: `useMemo` esta prohibido en este repo.
 */
export const flotaKeys = {
  /** Raiz del modulo. Invalidarla tira toda la cache de Flota. */
  todo: () => ['flota'] as const,

  /** Prefijo del recurso vehiculo: listado + detalle. Es la key que invalidan las mutations. */
  vehiculos: () => ['flota', 'vehiculos'] as const,

  vehiculosListado: (query: VehiculosPageQuery) => ['flota', 'vehiculos', query] as const,

  vehiculoDetalle: (vehiculoFlotaId: string) =>
    ['flota', 'vehiculos', vehiculoFlotaId] as const,

  /** Prefijo del recurso dispositivo: listado + detalle + historial. */
  dispositivos: () => ['flota', 'dispositivos'] as const,

  dispositivosListado: (query: DispositivosPageQuery) =>
    ['flota', 'dispositivos', query] as const,

  dispositivoDetalle: (dispositivoId: string) =>
    ['flota', 'dispositivos', dispositivoId] as const,

  /**
   * Historial de transiciones de stock de UN dispositivo. Cuelga del prefijo del detalle a
   * proposito: un cambio de estado de stock invalida `dispositivoDetalle(id)` y el historial cae
   * dentro de ese prefijo, asi que se refresca con la misma invalidacion. La `query` va al final
   * para que el prefijo siga alcanzando a cualquier pagina.
   */
  dispositivoHistorialStock: (dispositivoId: string, query: HistorialStockQuery) =>
    ['flota', 'dispositivos', dispositivoId, 'historial-stock', query] as const,

  /**
   * Catalogos GROWABLES del dispositivo (`flota.modelos_dispositivo_flota` /
   * `flota.proveedores_sim_flota`). Prefijo propio: el alta de una fila propia los invalida a ellos,
   * NO al listado de dispositivos.
   *
   * NO cuelgan de `dispositivos()`: si colgaran, cada alta o edicion de un dispositivo tiraria la
   * cache de dos catalogos que no cambiaron, y estos tienen `staleTime` largo justamente porque casi
   * nunca cambian.
   */
  catalogosDispositivo: () => ['flota', 'catalogos-dispositivo'] as const,

  modelosDispositivo: () => ['flota', 'catalogos-dispositivo', 'modelos'] as const,

  proveedoresSim: () => ['flota', 'catalogos-dispositivo', 'proveedores-sim'] as const,

  /**
   * Catalogo CANONICO del vehiculo (lo sirve PlataformaCanonica, no Flota). Se namespacea bajo
   * `flota` igual porque la cache es del cliente, no del backend: lo que importa es poder
   * invalidarlo con el resto del modulo.
   */
  catalogoMarcas: (q: string | undefined) => ['flota', 'catalogo', 'marcas', q ?? ''] as const,

  catalogoTipos: () => ['flota', 'catalogo', 'tipos-vehiculo'] as const,
}

/**
 * Las keys que hay que invalidar despues de ASIGNAR o DESASIGNAR un dispositivo a un vehiculo.
 *
 * ⚠️ NO ALCANZA CON UN SOLO PREFIJO, y por eso esto es una funcion y no un comentario: una
 * asignacion mueve CUATRO superficies a la vez, en dos arboles de cache distintos.
 *  1. detalle del VEHICULO — gana o pierde su bloque `dispositivo`;
 *  2. detalle del DISPOSITIVO — cambia `vehiculoInstalado`, `estadoOperativo`
 *     (`en_stock` ⇄ `instalado`) y `historialAsignaciones`;
 *  3. listado de VEHICULOS — la columna de GPS de esa fila;
 *  4. listado de DISPOSITIVOS — la columna de vehiculo, el badge de stock y el filtro `asignacion`.
 *
 * Y en una REASIGNACION son cinco: el dispositivo SALIENTE tambien cambia (vuelve a `en_stock`), y
 * su detalle puede estar en cache. Por eso se invalidan los dos PREFIJOS enteros y no las 4 keys
 * puntuales: enumerar ids exige conocer de antemano cual era el GPS saliente, que es justo el dato
 * que la respuesta del `POST` no trae.
 */
export const flotaKeysAfectadasPorAsignacion = () =>
  [flotaKeys.vehiculos(), flotaKeys.dispositivos()] as const
