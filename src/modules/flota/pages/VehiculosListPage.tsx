import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import { Plus, Search, SearchX, Truck } from 'lucide-react'
import { TablaVehiculos } from '../components/vehiculos/TablaVehiculos'
import { useEliminarVehiculo } from '../hooks/useEliminarVehiculo'
import { useVehiculos } from '../hooks/useVehiculos'
import type { VehiculoListItemDto } from '@/services/contracts/flota'
import { parseApiError, resolveApiErrorMessage } from '@/shared/errors/parse-api-error'
import { Boton } from '@/shared/ui/Boton'
import { DialogoConfirmacion } from '@/shared/ui/DialogoConfirmacion'
import { EstadoError } from '@/shared/ui/EstadoError'
import { EstadoVacio } from '@/shared/ui/EstadoVacio'
import { Input } from '@/shared/ui/Input'
import { Paginacion } from '@/shared/ui/Paginacion'
import { SinAccesoOverlay } from '@/shared/ui/SinAccesoOverlay'
import { Toggle } from '@/shared/ui/Toggle'
import type { EstadoOrden } from '@/shared/ui/Columna'
import {
  aQueryVehiculos,
  PAGE_SIZE_DEFAULT,
  useFlotaFiltersStore,
} from '@/stores/flota-filters-store'
import { useSessionStore } from '@/stores/session-store'

/**
 * `/app/flota/vehiculos` — listado de vehiculos de la organizacion activa.
 *
 * ALCANCE (f-05): tabla, busqueda parcial por patente, `soloActivos`, paginacion, menu de fila con
 * "Ver detalle" y "Eliminar" (baja logica) y los 2 empty-states. NO entran —y no se aproximan—
 * los contadores del header (no hay endpoint agregado), los filtros de estado/situacion/tipo (sin
 * fuente hasta los slices 03/04/05), la bulk bar, import/export y los modales de alta rapida,
 * asignacion y compartir.
 *
 * La pagina no tiene logica de negocio: lee filtros del store, llama el hook y ensambla.
 */

const OPCIONES_TAMANO_PAGINA = [PAGE_SIZE_DEFAULT, 50, 100]
const PERMISO_LECTURA = 'flota.vehiculos.leer'
const RUTA_ONBOARDING = '/app/flota/vehiculos/onboarding'
const MILISEGUNDOS_DEBOUNCE = 350

export default function VehiculosListPage() {
  const { t } = useTranslation('flota')
  const { t: tComun } = useTranslation()
  const navigate = useNavigate()

  // Lectura POR CAMPO: un selector que devuelva un objeto nuevo dispara un bucle de re-render en
  // zustand 5 (compara por identidad).
  const patente = useFlotaFiltersStore((s) => s.patente)
  const soloActivos = useFlotaFiltersStore((s) => s.soloActivos)
  const page = useFlotaFiltersStore((s) => s.page)
  const pageSize = useFlotaFiltersStore((s) => s.pageSize)
  const sortBy = useFlotaFiltersStore((s) => s.sortBy)
  const sortDirection = useFlotaFiltersStore((s) => s.sortDirection)
  const setPatente = useFlotaFiltersStore((s) => s.setPatente)
  const setSoloActivos = useFlotaFiltersStore((s) => s.setSoloActivos)
  const setPage = useFlotaFiltersStore((s) => s.setPage)
  const setPageSize = useFlotaFiltersStore((s) => s.setPageSize)
  const setOrden = useFlotaFiltersStore((s) => s.setOrden)
  const resetFiltros = useFlotaFiltersStore((s) => s.resetFiltros)

  const permisos = useSessionStore((s) => s.organizacionActiva?.permisos)
  const puedeCrear = permisos?.includes('flota.vehiculos.crear') ?? false
  const puedeEliminar = permisos?.includes('flota.vehiculos.eliminar') ?? false

  // Texto tipeado ANTES del debounce: es UI de un solo componente, no filtro persistido.
  const [busqueda, setBusqueda] = useState(patente)
  const [aEliminar, setAEliminar] = useState<VehiculoListItemDto | null>(null)

  useEffect(
    function propagarBusquedaConDebounce() {
      if (busqueda === patente) return
      const temporizador = window.setTimeout(() => setPatente(busqueda), MILISEGUNDOS_DEBOUNCE)
      return () => window.clearTimeout(temporizador)
    },
    [busqueda, patente, setPatente],
  )

  const consulta = useVehiculos(
    aQueryVehiculos({ patente, soloActivos, page, pageSize, sortBy, sortDirection }),
  )
  const eliminar = useEliminarVehiculo()

  // La pagina quedo fuera de rango: pasa al borrar la ultima fila de la ultima pagina. El backend
  // devuelve items vacio con totalItems > 0, y sin esto la pantalla decia "Aun no cargaste
  // vehiculos" con 20 vehiculos vivos, mas una paginacion que mostraba "2/1" y "21-20 de 20".
  // Se corrige volviendo a la ultima pagina real en vez de pintar un vacio que miente.
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
  // El page-gate por claim ya lo aplica `FlotaRoutes`. Esto cubre el otro forbidden: el backend
  // dijo 403 igual (permiso revocado con la sesion abierta, o modulo no activo). Overlay que
  // bloquea la pantalla, NUNCA redirect (B-3): un redirect le hace creer al usuario que la
  // pantalla no existe.
  if (errorApi?.status === 403) {
    return (
      // `SinAccesoOverlay` es `absolute inset-0`: sin contenedor posicionado con alto propio se
      // colapsa a cero y el bloqueo no se ve.
      <div className="relative min-h-96 flex-1">
        <SinAccesoOverlay
          permiso={PERMISO_LECTURA}
          titulo={t('vehiculosListado.sinAcceso.titulo')}
          descripcion={t('vehiculosListado.sinAcceso.descripcion', { permiso: PERMISO_LECTURA })}
          onVolver={() => navigate('/app')}
          textoVolver={t('vehiculosListado.sinAcceso.volver')}
        />
      </div>
    )
  }

  // Los 2 vacios son problemas DISTINTOS y el CTA equivocado deja al usuario trabado. El criterio
  // es "¿hay algo que limpiar?": si los filtros estan en su default, no hay filtro que culpar y el
  // vacio es de datos. Sin endpoint de conteo no hay forma mas precisa (PENDIENTE de ficha §3).
  const hayFiltrosActivos = patente.trim().length > 0 || soloActivos !== true

  function limpiarFiltros() {
    setBusqueda('')
    resetFiltros()
  }

  function cambiarOrden(orden: EstadoOrden) {
    // La clave de la columna ES el `sortBy` del contrato; solo se traduce la direccion.
    setOrden(
      orden.clave === 'Patente' ? 'Patente' : 'FechaCreacion',
      orden.direccion === 'asc' ? 'Asc' : 'Desc',
    )
  }

  function confirmarEliminacion() {
    if (!aEliminar) return
    eliminar.mutate(aEliminar.id, { onSuccess: () => setAEliminar(null) })
  }

  const vacio = hayFiltrosActivos ? (
    <EstadoVacio
      variante="sin-resultados"
      icono={SearchX}
      titulo={t('vehiculosListado.vacioSinResultados.titulo')}
      descripcion={t('vehiculosListado.vacioSinResultados.descripcion')}
      acciones={
        <Boton variante="secundaria" onClick={limpiarFiltros}>
          {t('vehiculosListado.vacioSinResultados.cta')}
        </Boton>
      }
    />
  ) : (
    <EstadoVacio
      variante="sin-datos"
      icono={Truck}
      titulo={t('vehiculosListado.vacioSinDatos.titulo')}
      descripcion={t('vehiculosListado.vacioSinDatos.descripcion')}
      acciones={
        puedeCrear ? (
          <Boton iconoIzq={Plus} onClick={() => navigate(RUTA_ONBOARDING)}>
            {t('vehiculosListado.vacioSinDatos.cta')}
          </Boton>
        ) : null
      }
    />
  )

  const error = errorApi ? (
    <EstadoError
      variante="recuperable"
      titulo={t('vehiculosListado.error.titulo')}
      mensaje={resolveApiErrorMessage(errorApi, tComun)}
      trazaId={errorApi.traceId ?? undefined}
      textoReintentar={t('vehiculosListado.error.reintentar')}
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
            {t('vehiculosListado.titulo')}
          </h1>
          <p className="text-sm text-fg-secundario">{t('vehiculosListado.subtitulo')}</p>
        </div>

        {/*
          Verbo `crear` sin permiso = DESHABILITADO + motivo (permisos.md §Comportamiento UX).
          El `title` va en el `span` y no en el boton porque un boton deshabilitado no dispara
          eventos de puntero, y el motivo se repite en `sr-only` para lectores de pantalla.
        */}
        <span title={puedeCrear ? undefined : t('vehiculosListado.sinPermisoCrear')}>
          <Boton
            iconoIzq={Plus}
            deshabilitado={!puedeCrear}
            onClick={() => navigate(RUTA_ONBOARDING)}
          >
            {t('vehiculosListado.nuevoVehiculo')}
          </Boton>
          {puedeCrear ? null : (
            <span className="sr-only">{t('vehiculosListado.sinPermisoCrear')}</span>
          )}
        </span>
      </header>

      <div className="flex flex-wrap items-center gap-3 rounded-lg border border-borde bg-superficie-1 p-3">
        <label className="flex min-w-56 flex-1 flex-col gap-1 text-xs text-fg-secundario">
          {t('vehiculosListado.buscar.etiqueta')}
          <Input
            type="search"
            mono
            iconoIzq={Search}
            autoComplete="off"
            placeholder={t('vehiculosListado.buscar.placeholder')}
            value={busqueda}
            onChange={(evento) => setBusqueda(evento.target.value)}
          />
        </label>

        <Toggle
          etiqueta={t('vehiculosListado.soloActivos')}
          activo={soloActivos}
          onCambio={setSoloActivos}
        />

        <Boton
          variante="fantasma"
          tamano="sm"
          deshabilitado={!hayFiltrosActivos}
          onClick={limpiarFiltros}
        >
          {t('vehiculosListado.limpiar')}
        </Boton>
      </div>

      <TablaVehiculos
        vehiculos={consulta.data?.items ?? []}
        cargando={consulta.isPending}
        orden={{ clave: sortBy, direccion: sortDirection === 'Asc' ? 'asc' : 'desc' }}
        onOrden={cambiarOrden}
        vacio={vacio}
        error={error}
        puedeEliminar={puedeEliminar}
        onVerDetalle={(vehiculo) => navigate(`/app/flota/vehiculos/${vehiculo.id}`)}
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
            anterior: t('vehiculosListado.paginacion.anterior'),
            siguiente: t('vehiculosListado.paginacion.siguiente'),
            porPagina: t('vehiculosListado.paginacion.porPagina'),
            rango: (desde, hasta, total) =>
              t('vehiculosListado.paginacion.rango', { desde, hasta, total }),
          }}
        />
      ) : null}

      <DialogoConfirmacion
        abierto={aEliminar !== null}
        onCerrar={() => {
          setAEliminar(null)
          eliminar.reset()
        }}
        onConfirmar={confirmarEliminacion}
        // Sin patente no hay valor exacto que tipear (la proyeccion canonica puede no estar
        // vigente): se degrada a la confirmacion `peligro`, nunca se pide escribir "—".
        variante={aEliminar?.patente ? 'peligro-con-tipeo' : 'peligro'}
        titulo={t('vehiculosListado.eliminar.titulo')}
        // El copy NO dice "no se puede deshacer": la baja es logica (correccion del mockup, §11).
        descripcion={errorEliminar ?? t('vehiculosListado.eliminar.descripcion')}
        etiquetaTipeo={t('vehiculosListado.eliminar.etiquetaTipeo')}
        valorEsperado={aEliminar?.patente ?? undefined}
        textoConfirmar={t('vehiculosListado.eliminar.confirmar')}
        textoCancelar={t('vehiculosListado.eliminar.cancelar')}
        cargando={eliminar.isPending}
      />
    </section>
  )
}
