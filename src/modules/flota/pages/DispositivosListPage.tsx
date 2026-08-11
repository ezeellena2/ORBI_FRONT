import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import { Cpu, Plus, SearchX } from 'lucide-react'
import { FiltrosDispositivos } from '../components/dispositivos/FiltrosDispositivos'
import { ModalCambiarEstadoStock } from '../components/dispositivos/ModalCambiarEstadoStock'
import { ModalEditarDispositivoPorId } from '../components/dispositivos/ModalEditarDispositivo'
import { ModalRegistrarDispositivo } from '../components/dispositivos/ModalRegistrarDispositivo'
import { TablaDispositivos } from '../components/dispositivos/TablaDispositivos'
import { AccionConMotivo } from '../components/AccionConMotivo'
import { AvisoOperacion } from '../components/AvisoOperacion'
import { useDispositivos } from '../hooks/useDispositivos'
import { useEliminarDispositivo } from '../hooks/useEliminarDispositivo'
import { usePermisos } from '../hooks/usePermisos'
import type { DispositivoListItemDto } from '@/services/contracts/flota'
import { parseApiError, resolveApiErrorMessage } from '@/shared/errors/parse-api-error'
import { Boton } from '@/shared/ui/Boton'
import { DialogoConfirmacion } from '@/shared/ui/DialogoConfirmacion'
import { EstadoError } from '@/shared/ui/EstadoError'
import { EstadoVacio } from '@/shared/ui/EstadoVacio'
import { Paginacion } from '@/shared/ui/Paginacion'
import { SinAccesoOverlay } from '@/shared/ui/SinAccesoOverlay'
import type { EstadoOrden } from '@/shared/ui/Columna'
import {
  aQueryDispositivos,
  hayFiltrosDispositivosActivos,
  PAGE_SIZE_DISPOSITIVOS_DEFAULT,
  useFlotaDispositivosFiltersStore,
} from '@/stores/flota-dispositivos-filters-store'

/**
 * `/app/flota/dispositivos` — inventario de dispositivos GPS de la organizacion activa (`f-05`).
 *
 * ALCANCE: tabla, los 4 filtros que el server declara, paginacion, alta (Modo A), kebab con ver
 * detalle / asignar a vehiculo / editar / cambiar estado de stock / eliminar, y los 5 estados
 * obligatorios.
 *
 * Lo que NO entra, y por que — ninguna de estas ausencias es un olvido:
 *  - **Contadores del header** (total / en linea / desconectados / disponibles): no hay endpoint de
 *    contadores en `api.md` y el universo de "Total" es PENDIENTE (ficha §12). Slice-05.
 *  - **Columna y filtro de Conexion**: compone Telemetria y NO TIENE FUENTE (B-9). Ademas el server
 *    NI SIQUIERA DECLARA el parametro `conexion` (D-S3-33): mandarlo devuelve 200 con la lista
 *    entera SIN FILTRAR, en silencio. El chip no se dibuja hasta que la fila de `api.md` diga ✅.
 *  - **Busqueda libre**: `GET /dispositivos` no tiene param de busqueda en el contrato. El input no
 *    se pinta "por las dudas".
 *  - **Bulk bar, Importar, Exportar, Hacer ping, Compartir**: sin contrato, bloqueados (B-12) o de
 *    otro slice. **QR de instalacion y Configuracion**: DEROGADOS del contrato (D-S3-22/23), no van.
 *
 * La pagina no tiene logica de negocio: lee filtros del store, llama al hook y ensambla.
 */

const OPCIONES_TAMANO_PAGINA = [10, PAGE_SIZE_DISPOSITIVOS_DEFAULT, 50, 100]
const PERMISO_LECTURA = 'flota.dispositivos.leer'

export default function DispositivosListPage() {
  const { t } = useTranslation('flota')
  const { t: tComun } = useTranslation()
  const navigate = useNavigate()

  // Lectura POR CAMPO: un selector que devuelva un objeto nuevo dispara un bucle de re-render en
  // zustand 5 (compara por identidad).
  const stock = useFlotaDispositivosFiltersStore((s) => s.stock)
  const modelo = useFlotaDispositivosFiltersStore((s) => s.modelo)
  const asignacion = useFlotaDispositivosFiltersStore((s) => s.asignacion)
  const soloActivos = useFlotaDispositivosFiltersStore((s) => s.soloActivos)
  const page = useFlotaDispositivosFiltersStore((s) => s.page)
  const pageSize = useFlotaDispositivosFiltersStore((s) => s.pageSize)
  const sortBy = useFlotaDispositivosFiltersStore((s) => s.sortBy)
  const sortDirection = useFlotaDispositivosFiltersStore((s) => s.sortDirection)
  const setStock = useFlotaDispositivosFiltersStore((s) => s.setStock)
  const setModelo = useFlotaDispositivosFiltersStore((s) => s.setModelo)
  const setAsignacion = useFlotaDispositivosFiltersStore((s) => s.setAsignacion)
  const setSoloActivos = useFlotaDispositivosFiltersStore((s) => s.setSoloActivos)
  const setPage = useFlotaDispositivosFiltersStore((s) => s.setPage)
  const setPageSize = useFlotaDispositivosFiltersStore((s) => s.setPageSize)
  const setOrden = useFlotaDispositivosFiltersStore((s) => s.setOrden)
  const resetFiltros = useFlotaDispositivosFiltersStore((s) => s.resetFiltros)

  const { tienePermiso } = usePermisos()
  const puedeCrear = tienePermiso('flota.dispositivos.crear')
  const puedeEditar = tienePermiso('flota.dispositivos.editar')
  const puedeGestionarStock = tienePermiso('flota.dispositivos.gestionar-stock')
  const puedeEliminar = tienePermiso('flota.dispositivos.eliminar')
  // Permiso del grupo VEHICULOS, no del grupo dispositivos: asignar es una operacion del vehiculo.
  const puedeAsignarVehiculo = tienePermiso('flota.vehiculos.asignar-dispositivo')

  const [registrando, setRegistrando] = useState(false)
  const [aEditar, setAEditar] = useState<DispositivoListItemDto | null>(null)
  const [aCambiarStock, setACambiarStock] = useState<DispositivoListItemDto | null>(null)
  const [aEliminar, setAEliminar] = useState<DispositivoListItemDto | null>(null)

  const filtros = { stock, modelo, asignacion, soloActivos, page, pageSize, sortBy, sortDirection }
  const consulta = useDispositivos(aQueryDispositivos(filtros))
  const eliminar = useEliminarDispositivo()

  // La pagina quedo fuera de rango: pasa al borrar o dar de baja la ultima fila de la ultima pagina
  // (con `soloActivos` puesto, la baja saca la fila del resultado igual que el hard-delete). El
  // backend devuelve items vacio con totalItems > 0, y sin esto la pantalla diria "Todavia no
  // cargaste dispositivos" teniendo inventario, sin ningun control para volver. Se vuelve a la
  // ultima pagina real en vez de pintar un vacio que miente.
  useEffect(
    function volverSiLaPaginaQuedoVacia() {
      const meta = consulta.data?.pagination
      if (!meta) return
      if (meta.totalItems > 0 && meta.page > meta.totalPages) {
        setPage(Math.max(1, meta.totalPages))
      }
    },
    [consulta.data?.pagination, setPage],
  )

  const errorApi = consulta.error ? parseApiError(consulta.error) : null

  // ── FORBIDDEN ────────────────────────────────────────────────────────────────────────────────
  // El page-gate por claim lo aplica `FlotaRoutes` con `<RequierePermiso>`. Esto cubre el OTRO
  // forbidden: el backend dijo 403 igual (permiso revocado con la sesion abierta, o modulo no
  // activo). Overlay que bloquea la pantalla, NUNCA redirect (B-3): un redirect le hace creer al
  // usuario que la pantalla no existe.
  if (errorApi?.status === 403) {
    return (
      // `SinAccesoOverlay` es `absolute inset-0`: sin contenedor posicionado con alto propio se
      // colapsa a cero y el bloqueo no se ve.
      <div className="relative min-h-96 flex-1">
        <SinAccesoOverlay
          permiso={PERMISO_LECTURA}
          titulo={t('dispositivosListado.sinAcceso.titulo')}
          descripcion={t('dispositivosListado.sinAcceso.descripcion', { permiso: PERMISO_LECTURA })}
          onVolver={() => navigate('/app')}
          textoVolver={t('dispositivosListado.sinAcceso.volver')}
        />
      </div>
    )
  }

  // Los 2 vacios son problemas DISTINTOS y el CTA equivocado deja al usuario trabado. El criterio es
  // "¿hay algo que limpiar?": con los filtros en su default no hay filtro que culpar y el vacio es
  // de datos.
  const hayFiltros = hayFiltrosDispositivosActivos(filtros)

  function cambiarOrden(orden: EstadoOrden) {
    // La clave de la columna ES el `sortBy` del contrato; solo se traduce la direccion. `Imei` es el
    // unico campo ordenable ademas del default.
    setOrden(
      orden.clave === 'Imei' ? 'Imei' : 'FechaCreacion',
      orden.direccion === 'asc' ? 'Asc' : 'Desc',
    )
  }

  function confirmarEliminacion() {
    if (!aEliminar) return
    eliminar.mutate(aEliminar.id, { onSuccess: () => setAEliminar(null) })
  }

  const vacio = hayFiltros ? (
    <EstadoVacio
      variante="sin-resultados"
      icono={SearchX}
      titulo={t('dispositivosListado.vacioSinResultados.titulo')}
      descripcion={t('dispositivosListado.vacioSinResultados.descripcion')}
      acciones={
        <Boton variante="secundaria" onClick={resetFiltros}>
          {t('dispositivosListado.vacioSinResultados.cta')}
        </Boton>
      }
    />
  ) : (
    <EstadoVacio
      variante="sin-datos"
      icono={Cpu}
      titulo={t('dispositivosListado.vacioSinDatos.titulo')}
      descripcion={t('dispositivosListado.vacioSinDatos.descripcion')}
      acciones={<BotonRegistrar puedeCrear={puedeCrear} onAbrir={() => setRegistrando(true)} />}
    />
  )

  /*
    ── UN REFETCH QUE FALLA NO BORRA LA TABLA QUE YA ESTABA LLENA ────────────────────────────────
    `useDispositivos` usa `keepPreviousData` justamente para no perder la pagina bajo el cursor del
    usuario, pero `Tabla` le da precedencia a `error` sobre `filas`: con `data` presente y un refetch
    en background fallado (red intermitente, 500 esporadico), la lista ENTERA se reemplazaba por el
    panel de error y el usuario perdia lo que estaba mirando.

    Un error CON datos en mano es partial-data, no una pantalla de error: la tabla se queda y el
    fallo se avisa arriba, con su reintento. Sin datos en mano si corresponde el panel entero, porque
    no hay nada que preservar.
  */
  const hayDatosEnMano = consulta.data !== undefined

  const error =
    errorApi && !hayDatosEnMano ? (
      <EstadoError
        variante="recuperable"
        titulo={t('dispositivosListado.error.titulo')}
        mensaje={resolveApiErrorMessage(errorApi, tComun)}
        trazaId={errorApi.traceId ?? undefined}
        textoReintentar={t('dispositivosListado.error.reintentar')}
        onReintentar={() => void consulta.refetch()}
      />
    ) : undefined

  const paginacion = consulta.data?.pagination ?? null

  const errorEliminar = eliminar.error
    ? resolveApiErrorMessage(parseApiError(eliminar.error), tComun)
    : null

  return (
    <section className="flex flex-col gap-4">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold tracking-snug text-fg-primario">
            {t('dispositivosListado.titulo')}
          </h1>
          <p className="text-sm text-fg-secundario">{t('dispositivosListado.subtitulo')}</p>
        </div>

        <BotonRegistrar puedeCrear={puedeCrear} onAbrir={() => setRegistrando(true)} />
      </header>

      <FiltrosDispositivos
        stock={stock}
        modelo={modelo}
        asignacion={asignacion}
        soloActivos={soloActivos}
        hayFiltros={hayFiltros}
        onStock={setStock}
        onModelo={setModelo}
        onAsignacion={setAsignacion}
        onSoloActivos={setSoloActivos}
        onLimpiar={resetFiltros}
      />

      {errorApi && hayDatosEnMano ? (
        <AvisoOperacion
          titulo={t('dispositivosListado.error.tituloRefresco')}
          mensaje={resolveApiErrorMessage(errorApi, tComun)}
          trazaId={errorApi.traceId ?? undefined}
          accion={
            <Boton variante="secundaria" tamano="sm" onClick={() => void consulta.refetch()}>
              {t('dispositivosListado.error.reintentar')}
            </Boton>
          }
        />
      ) : null}

      <TablaDispositivos
        dispositivos={consulta.data?.items ?? []}
        cargando={consulta.isPending}
        orden={{ clave: sortBy, direccion: sortDirection === 'Asc' ? 'asc' : 'desc' }}
        onOrden={cambiarOrden}
        vacio={vacio}
        error={error}
        puedeEditar={puedeEditar}
        puedeGestionarStock={puedeGestionarStock}
        puedeEliminar={puedeEliminar}
        puedeAsignarVehiculo={puedeAsignarVehiculo}
        onVerDetalle={(dispositivo) => navigate(`/app/flota/dispositivos/${dispositivo.id}`)}
        onEditar={setAEditar}
        onCambiarEstadoStock={setACambiarStock}
        onEliminar={setAEliminar}
      />

      {paginacion !== null && paginacion.totalItems > 0 ? (
        <Paginacion
          pagina={paginacion.page}
          tamanoPagina={paginacion.pageSize}
          total={paginacion.totalItems}
          opcionesTamano={OPCIONES_TAMANO_PAGINA}
          deshabilitada={consulta.isFetching}
          onCambio={(cambio) => {
            if (cambio.tamanoPagina !== paginacion.pageSize) {
              setPageSize(cambio.tamanoPagina)
              return
            }
            setPage(cambio.pagina)
          }}
          textos={{
            anterior: t('dispositivosListado.paginacion.anterior'),
            siguiente: t('dispositivosListado.paginacion.siguiente'),
            porPagina: t('dispositivosListado.paginacion.porPagina'),
            rango: (desde, hasta, total) =>
              t('dispositivosListado.paginacion.rango', { desde, hasta, total }),
          }}
        />
      ) : null}

      {/*
        Al registrar, el modal cierra y el usuario SE QUEDA acá: la fila nueva aparece en la tabla
        con su badge "Disponible" (el hook invalida el prefijo `['flota','dispositivos']`). No se
        navega a la ficha — ver la fila aparecer es el resultado de la acción, y llevárselo a otra
        pantalla se lo esconde.
      */}
      <ModalRegistrarDispositivo abierto={registrando} onCerrar={() => setRegistrando(false)} />

      <ModalEditarDispositivoPorId
        dispositivoId={aEditar?.id}
        abierto={aEditar !== null}
        onCerrar={() => setAEditar(null)}
      />

      <ModalCambiarEstadoStock
        dispositivo={aCambiarStock}
        abierto={aCambiarStock !== null}
        onCerrar={() => setACambiarStock(null)}
      />

      <DialogoConfirmacion
        abierto={aEliminar !== null}
        onCerrar={() => {
          setAEliminar(null)
          eliminar.reset()
        }}
        onConfirmar={confirmarEliminacion}
        // Hard-delete: es irreversible, asi que se pide tipear el alias. Sin alias no hay valor
        // exacto que tipear y se degrada a la confirmacion `peligro`, nunca se pide escribir "—".
        variante={aEliminar?.alias ? 'peligro-con-tipeo' : 'peligro'}
        titulo={t('dispositivosListado.eliminar.titulo')}
        descripcion={errorEliminar ?? t('dispositivosListado.eliminar.descripcion')}
        etiquetaTipeo={t('dispositivosListado.eliminar.etiquetaTipeo')}
        valorEsperado={aEliminar?.alias ?? undefined}
        textoConfirmar={t('dispositivosListado.eliminar.confirmar')}
        textoCancelar={t('dispositivosListado.eliminar.cancelar')}
        cargando={eliminar.isPending}
      />
    </section>
  )
}

/**
 * CTA de alta — `flota.dispositivos.crear`.
 *
 * Verbo `crear` = DESHABILITADO + tooltip sin permiso (permisos.md §Comportamiento UX por verbo),
 * nunca oculto: el usuario tiene que poder pedirle el permiso a su admin, y para eso necesita ver
 * que la accion existe.
 *
 * El alta que abre es **SOLO Modo A** (IMEI ya dado de alta en el registro canonico). El Modo B
 * sigue BLOQUEADO —exige un `traccar_device_id` que nada en el sistema genera (B-7) y el backend
 * responde 400 `flota.dispositivo.alta_modo_b_no_soportado`—, asi que el modal no dibuja el bloque
 * de "equipo nuevo".
 */
function BotonRegistrar({
  puedeCrear,
  onAbrir,
}: {
  puedeCrear: boolean
  onAbrir: () => void
}) {
  const { t } = useTranslation('flota')

  const motivo = puedeCrear
    ? undefined
    : t('dispositivosListado.acciones.sinPermiso', { permiso: 'flota.dispositivos.crear' })

  return (
    <AccionConMotivo motivo={motivo}>
      <Boton iconoIzq={Plus} deshabilitado={!puedeCrear} onClick={onAbrir}>
        {t('dispositivosListado.registrar')}
      </Boton>
    </AccionConMotivo>
  )
}
