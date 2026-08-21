import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import { Plus, SearchX, UsersRound } from 'lucide-react'
import { FiltrosConductores } from '../components/conductores/FiltrosConductores'
import { ModalAsignarVehiculo } from '../components/conductores/ModalAsignarVehiculo'
import { ModalCambiarEstadoConductor } from '../components/conductores/ModalCambiarEstadoConductor'
import { ModalCrearConductor } from '../components/conductores/ModalCrearConductor'
import { ModalEditarConductorPorId } from '../components/conductores/ModalEditarConductor'
import { ModalVincularDispositivo } from '../components/conductores/ModalVincularDispositivo'
import { TablaConductores } from '../components/conductores/TablaConductores'
import {
  DialogoBajaConductor,
  DialogoEliminarConductor,
  DialogoReactivarConductor,
} from '../components/conductores/DialogosConductor'
import { AccionConMotivo } from '../components/AccionConMotivo'
import { Aviso } from '@/shared/ui/Aviso'
import { useConductores } from '../hooks/useConductores'
import { usePermisos } from '@/shared/auth/permissions/usePermisos'
import type { ConductorListItemDto } from '@/services/contracts/flota'
import { parseApiError, resolveApiErrorMessage } from '@/shared/errors/parse-api-error'
import { Boton } from '@/shared/ui/Boton'
import { EstadoError } from '@/shared/ui/EstadoError'
import { EstadoVacio } from '@/shared/ui/EstadoVacio'
import { Paginacion } from '@/shared/ui/Paginacion'
import { SinAccesoOverlay } from '@/shared/ui/SinAccesoOverlay'
import type { EstadoOrden } from '@/shared/ui/Columna'
import {
  aQueryConductores,
  hayFiltrosConductoresActivos,
  PAGE_SIZE_CONDUCTORES_DEFAULT,
  useFlotaConductoresFiltersStore,
} from '@/stores/flota-conductores-filters-store'

/**
 * `/app/flota/conductores` — los conductores operativos de la organizacion activa.
 *
 * ALCANCE: tabla, los 3 filtros que el server declara, paginacion, alta (Modo A y Modo B), kebab con
 * ver detalle / editar / cambiar estado / asignar vehiculo / vincular dispositivo / documentos /
 * desactivar / reactivar / eliminar, y los 5 estados obligatorios.
 *
 * ── ESTE ES EL LISTADO QUE **NO** DEPENDE DE TELEMETRIA (`f-06`) ───────────────────────────────
 * Y esa es su paridad con los otros dos: sus hermanos ganaron columna de conexion en slice-05 y este
 * no, porque `ConductorListItemDto` **no tiene ningun campo de conexion** — un conductor no reporta,
 * reporta el vehiculo que conduce (D1). Consecuencia contratada (ficha §9): **con Telemetria caida
 * esta pantalla se ve exactamente igual**. No lleva aviso de datos parciales, y no llevarlo es la
 * decision correcta: un cartel que diga "todo bien" en cada carga es ruido.
 *
 * Lo que NO entra, y por que — ninguna de estas ausencias es un olvido:
 *  - **Los 4 contadores del header** (total / activos / con vehiculo / licencias por vencer):
 *    **B-35**. No hay endpoint agregado ni campos de conteo en el response, y derivarlos de la
 *    pagina actual daria un numero que cambia al paginar. El bloqueante sigue abierto: era el unico
 *    pendiente de slice-05 sin dueno, y se elevo justamente para que no se re-descubra acá.
 *  - **Chip de filtro Licencia**: el server **no declara el parametro** — la categoria no tiene
 *    columna (**B-21**). Mandarlo devuelve 200 con la lista ENTERA sin filtrar, en silencio.
 *  - **Busqueda libre**: `GET /conductores` no declara `search`.
 *  - **`GET .../stats` y `GET .../recorridos`**: responden **500 `flota.telemetria.no_disponible`**
 *    por contrato (convencion 8b, B-9: Telemetria no modela conductores ni persiste historico). El
 *    request **no se emite** desde ninguna superficie — `conductores-service` ni siquiera expone los
 *    metodos, que es lo que impide cablearlos por accidente.
 *  - **Exportar**: **B-34**. `GET /conductores/exportar` no esta construido (su unico camino de
 *    error no tiene `code`), asi que hoy es un 404 de routing. `f-06` paso 7 lo pide igual: manda el
 *    contrato. **Importar**: P4 abierta.
 *  - **Bulk bar, "Invitar por email", "Compartir"**: sin endpoint ni soporte de contrato. El
 *    `flota.conductores.invitar` que usa el mockup **no existe** en el catalogo de 44 permisos.
 *
 * La pagina no tiene logica de negocio: lee filtros del store, llama al hook y ensambla.
 */

const OPCIONES_TAMANO_PAGINA = [10, PAGE_SIZE_CONDUCTORES_DEFAULT, 50, 100]
const PERMISO_LECTURA = 'flota.conductores.leer'

/** Un modal por vez. El conductor sobre el que opera va aparte, porque sobrevive al cierre. */
type ModalAbierto =
  | 'ninguno'
  | 'crear'
  | 'editar'
  | 'estado'
  | 'asignar-vehiculo'
  | 'vincular-dispositivo'
  | 'baja'
  | 'reactivar'
  | 'eliminar'

export default function ConductoresListPage() {
  const { t } = useTranslation('flota')
  const { t: tComun } = useTranslation()
  const navigate = useNavigate()

  // Lectura POR CAMPO: un selector que devuelva un objeto nuevo dispara un bucle de re-render en
  // zustand 5 (compara por identidad).
  const estado = useFlotaConductoresFiltersStore((s) => s.estado)
  const asignacion = useFlotaConductoresFiltersStore((s) => s.asignacion)
  const soloActivos = useFlotaConductoresFiltersStore((s) => s.soloActivos)
  const page = useFlotaConductoresFiltersStore((s) => s.page)
  const pageSize = useFlotaConductoresFiltersStore((s) => s.pageSize)
  const sortBy = useFlotaConductoresFiltersStore((s) => s.sortBy)
  const sortDirection = useFlotaConductoresFiltersStore((s) => s.sortDirection)
  const setEstado = useFlotaConductoresFiltersStore((s) => s.setEstado)
  const setAsignacion = useFlotaConductoresFiltersStore((s) => s.setAsignacion)
  const setSoloActivos = useFlotaConductoresFiltersStore((s) => s.setSoloActivos)
  const setPage = useFlotaConductoresFiltersStore((s) => s.setPage)
  const setPageSize = useFlotaConductoresFiltersStore((s) => s.setPageSize)
  const setOrden = useFlotaConductoresFiltersStore((s) => s.setOrden)
  const resetFiltros = useFlotaConductoresFiltersStore((s) => s.resetFiltros)

  const { tienePermiso } = usePermisos()
  const puedeCrear = tienePermiso('flota.conductores.crear')
  const puedeEditar = tienePermiso('flota.conductores.editar')
  const puedeEliminar = tienePermiso('flota.conductores.eliminar')
  const puedeGestionarDocumentos = tienePermiso('flota.conductores.gestionar-documentos')
  const puedeAsignarDispositivo = tienePermiso('flota.conductores.asignar-dispositivo')
  // Permiso del grupo VEHICULOS, no del de conductores: la accion vive sobre el vinculo.
  const puedeAsignarVehiculo = tienePermiso('flota.vehiculos.asignar-conductor')

  const [modal, setModal] = useState<ModalAbierto>('ninguno')
  const [seleccionado, setSeleccionado] = useState<ConductorListItemDto | null>(null)

  const filtros = { estado, asignacion, soloActivos, page, pageSize, sortBy, sortDirection }
  const consulta = useConductores(aQueryConductores(filtros))

  // La pagina quedo fuera de rango: pasa al dar de baja o eliminar la ultima fila de la ultima
  // pagina (con `soloActivos` puesto, la baja saca la fila del resultado igual que el hard-delete).
  // El backend devuelve items vacio con totalItems > 0, y sin esto la pantalla diria "Aun no
  // cargaste conductores" teniendo conductores, sin ningun control para volver.
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
  // activo). Overlay que BLOQUEA la pantalla, nunca redirect (B-3): un redirect le hace creer al
  // usuario que la pantalla no existe.
  if (errorApi?.status === 403) {
    return (
      // `SinAccesoOverlay` es `absolute inset-0`: sin contenedor posicionado con alto propio se
      // colapsa a cero y el bloqueo no se ve.
      <div className="relative min-h-96 flex-1">
        {/*
          `permiso` es SIEMPRE el permiso literal, nunca `apiError.code`: el 403 del gate de modulo
          trae `code: flota.modulo.no_activo`, que no existe en el catalogo de 44 permisos. Mostrarlo
          mandaria al admin a buscar un permiso inexistente.
        */}
        <SinAccesoOverlay
          permiso={PERMISO_LECTURA}
          titulo={t('conductoresListado.sinAcceso.titulo')}
          descripcion={t('conductoresListado.sinAcceso.descripcion')}
          onVolver={() => navigate('/app')}
          textoVolver={t('conductoresListado.sinAcceso.volver')}
        />
      </div>
    )
  }

  // Los 2 vacios son problemas DISTINTOS y el CTA equivocado deja al usuario trabado. El criterio es
  // "¿hay algo que limpiar?": con los filtros en su default no hay filtro que culpar y el vacio es
  // de datos.
  const hayFiltros = hayFiltrosConductoresActivos(filtros)

  function cambiarOrden(orden: EstadoOrden) {
    // La clave de la columna ES el `sortBy` del contrato; solo se traduce la direccion. `Nombre` es
    // el unico campo ordenable con columna visible.
    setOrden(
      orden.clave === 'Nombre' ? 'Nombre' : 'FechaCreacion',
      orden.direccion === 'asc' ? 'Asc' : 'Desc',
    )
  }

  function abrir(nuevo: ModalAbierto, conductor: ConductorListItemDto) {
    setSeleccionado(conductor)
    setModal(nuevo)
  }

  const vacio = hayFiltros ? (
    <EstadoVacio
      variante="sin-resultados"
      icono={SearchX}
      titulo={t('conductoresListado.vacioSinResultados.titulo')}
      descripcion={t('conductoresListado.vacioSinResultados.descripcion')}
      acciones={
        <Boton variante="secundaria" onClick={resetFiltros}>
          {t('conductoresListado.vacioSinResultados.cta')}
        </Boton>
      }
    />
  ) : (
    <EstadoVacio
      variante="sin-datos"
      icono={UsersRound}
      titulo={t('conductoresListado.vacioSinDatos.titulo')}
      descripcion={t('conductoresListado.vacioSinDatos.descripcion')}
      acciones={
        <BotonNuevoConductor
          puedeCrear={puedeCrear}
          etiqueta={t('conductoresListado.vacioSinDatos.cta')}
          onAbrir={() => setModal('crear')}
        />
      }
    />
  )

  /*
    ── UN REFETCH QUE FALLA NO BORRA LA TABLA QUE YA ESTABA LLENA ────────────────────────────────
    `useConductores` usa `keepPreviousData` para no perder la pagina bajo el cursor del usuario, pero
    `Tabla` le da precedencia a `error` sobre `filas`: con `data` presente y un refetch en background
    fallado (red intermitente, 500 esporadico), la lista ENTERA se reemplazaba por el panel de error.

    Un error CON datos en mano es partial-data, no una pantalla de error: la tabla se queda y el
    fallo se avisa arriba, con su reintento.
  */
  const hayDatosEnMano = consulta.data !== undefined

  const error =
    errorApi && !hayDatosEnMano ? (
      <EstadoError
        variante="recuperable"
        titulo={t('conductoresListado.error.titulo')}
        mensaje={resolveApiErrorMessage(errorApi, tComun)}
        trazaId={errorApi.traceId ?? undefined}
        textoReintentar={t('conductoresListado.error.reintentar')}
        onReintentar={() => void consulta.refetch()}
      />
    ) : undefined

  const paginacion = consulta.data?.pagination ?? null

  return (
    <section className="flex flex-col gap-4">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold tracking-snug text-fg-primario">
            {t('conductoresListado.titulo')}
          </h1>
          <p className="text-sm text-fg-secundario">{t('conductoresListado.subtitulo')}</p>
        </div>

        <BotonNuevoConductor
          puedeCrear={puedeCrear}
          etiqueta={t('conductoresListado.nuevoConductor')}
          onAbrir={() => setModal('crear')}
        />
      </header>

      <FiltrosConductores
        estado={estado}
        asignacion={asignacion}
        soloActivos={soloActivos}
        hayFiltros={hayFiltros}
        onEstado={setEstado}
        onAsignacion={setAsignacion}
        onSoloActivos={setSoloActivos}
        onLimpiar={resetFiltros}
      />

      {errorApi && hayDatosEnMano ? (
        <Aviso
          titulo={t('conductoresListado.error.tituloRefresco')}
          mensaje={resolveApiErrorMessage(errorApi, tComun)}
          trazaId={errorApi.traceId ?? undefined}
          accion={
            <Boton variante="secundaria" tamano="sm" onClick={() => void consulta.refetch()}>
              {t('conductoresListado.error.reintentar')}
            </Boton>
          }
        />
      ) : null}

      <TablaConductores
        conductores={consulta.data?.items ?? []}
        cargando={consulta.isPending}
        orden={{ clave: sortBy, direccion: sortDirection === 'Asc' ? 'asc' : 'desc' }}
        onOrden={cambiarOrden}
        vacio={vacio}
        error={error}
        puedeEditar={puedeEditar}
        puedeEliminar={puedeEliminar}
        puedeAsignarVehiculo={puedeAsignarVehiculo}
        puedeAsignarDispositivo={puedeAsignarDispositivo}
        puedeGestionarDocumentos={puedeGestionarDocumentos}
        onVerDetalle={(conductor) => navigate(`/app/flota/conductores/${conductor.id}`)}
        onEditar={(conductor) => abrir('editar', conductor)}
        onCambiarEstado={(conductor) => abrir('estado', conductor)}
        onAsignarVehiculo={(conductor) => abrir('asignar-vehiculo', conductor)}
        onAsignarDispositivo={(conductor) => abrir('vincular-dispositivo', conductor)}
        // "Renovar licencia" / "Documentos" no dispara un toast como el mockup (DA-CL-08): va al
        // destino REAL, el tab de documentos de la ficha, que es el unico lugar donde la licencia se
        // puede cargar.
        onRenovarLicencia={(conductor) =>
          navigate(`/app/flota/conductores/${conductor.id}?tab=documentos`)
        }
        onDesactivar={(conductor) => abrir('baja', conductor)}
        onReactivar={(conductor) => abrir('reactivar', conductor)}
        onEliminar={(conductor) => abrir('eliminar', conductor)}
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
            anterior: t('conductoresListado.paginacion.anterior'),
            siguiente: t('conductoresListado.paginacion.siguiente'),
            porPagina: t('conductoresListado.paginacion.porPagina'),
            rango: (desde, hasta, total) =>
              t('conductoresListado.paginacion.rango', { desde, hasta, total }),
          }}
        />
      ) : null}

      {/*
        Al crear, el modal cierra y el usuario SE QUEDA acá: la fila nueva aparece con su badge
        "Pendiente" (el hook invalida el prefijo `['flota','conductores']`). No se navega a la ficha
        — ver la fila aparecer ES el resultado de la accion.
      */}
      <ModalCrearConductor abierto={modal === 'crear'} onCerrar={() => setModal('ninguno')} />

      <ModalEditarConductorPorId
        conductorId={seleccionado?.id}
        abierto={modal === 'editar'}
        onCerrar={() => setModal('ninguno')}
      />

      <ModalCambiarEstadoConductor
        conductor={seleccionado}
        abierto={modal === 'estado'}
        onCerrar={() => setModal('ninguno')}
      />

      <ModalAsignarVehiculo
        conductor={seleccionado}
        abierto={modal === 'asignar-vehiculo'}
        onCerrar={() => setModal('ninguno')}
      />

      <ModalVincularDispositivo
        conductor={seleccionado}
        abierto={modal === 'vincular-dispositivo'}
        onCerrar={() => setModal('ninguno')}
      />

      <DialogoBajaConductor
        conductor={seleccionado}
        abierto={modal === 'baja'}
        onCerrar={() => setModal('ninguno')}
      />

      <DialogoReactivarConductor
        conductor={seleccionado}
        abierto={modal === 'reactivar'}
        onCerrar={() => setModal('ninguno')}
      />

      <DialogoEliminarConductor
        conductor={seleccionado}
        abierto={modal === 'eliminar'}
        onCerrar={() => setModal('ninguno')}
      />
    </section>
  )
}

/**
 * CTA de alta — `flota.conductores.crear`.
 *
 * Verbo `crear` = DESHABILITADO + tooltip sin permiso (`permisos.md` §Comportamiento UX por verbo),
 * nunca oculto: el usuario tiene que poder pedirle el permiso a su admin, y para eso necesita ver
 * que la accion existe.
 *
 * El mismo boton sirve al header y al empty-state (la ficha pide 2 CTAs, "Invitar por email" y
 * "Crear primer conductor", **ambos con `flota.conductores.crear`**): "Invitar por email" NO se
 * dibuja porque el toggle `enviarInvitacion` **se rechaza con 400** y no hay canal contratado —
 * seria un boton que promete un mail que nadie manda.
 */
function BotonNuevoConductor({
  puedeCrear,
  etiqueta,
  onAbrir,
}: {
  puedeCrear: boolean
  /** Ya resuelto por i18n: el header y el empty-state usan copys distintos. */
  etiqueta: string
  onAbrir: () => void
}) {
  const { t } = useTranslation('flota')

  const motivo = puedeCrear
    ? undefined
    : t('conductoresListado.acciones.sinPermiso', { permiso: 'flota.conductores.crear' })

  return (
    <AccionConMotivo motivo={motivo}>
      <Boton iconoIzq={Plus} deshabilitado={!puedeCrear} onClick={onAbrir}>
        {etiqueta}
      </Boton>
    </AccionConMotivo>
  )
}
