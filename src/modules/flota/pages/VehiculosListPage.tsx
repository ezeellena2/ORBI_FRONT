import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import { Plus, SearchX, Truck } from 'lucide-react'
import { TablaVehiculos } from '../components/vehiculos/TablaVehiculos'
import { VehiculoFiltros } from '../components/vehiculos/VehiculoFiltros'
import { AvisoDatosDeConexion } from '../components/AvisoDatosDeConexion'
import { Aviso } from '@/shared/ui/Aviso'
import { AvisoDeSenales } from '../components/senales/AvisoDeSenales'
import { useEliminarVehiculo } from '../hooks/useEliminarVehiculo'
import { useSenales } from '../hooks/useSenales'
import { useVehiculos } from '../hooks/useVehiculos'
import {
  claveDeVacioPorFiltroDeConexion,
  coberturaDeConexion,
} from '../vocabulario-conexion'
import { QUERY_DE_SENALES, avisoDeSenales, indiceDeSenales } from '../vocabulario-senales'
import type { VehiculoListItemDto } from '@/services/contracts/flota'
import { parseApiError, resolveApiErrorMessage } from '@/shared/errors/parse-api-error'
import { Boton } from '@/shared/ui/Boton'
import { DialogoConfirmacion } from '@/shared/ui/DialogoConfirmacion'
import { EstadoError } from '@/shared/ui/EstadoError'
import { EstadoVacio } from '@/shared/ui/EstadoVacio'
import { Paginacion } from '@/shared/ui/Paginacion'
import { SinAccesoOverlay } from '@/shared/ui/SinAccesoOverlay'
import type { EstadoOrden } from '@/shared/ui/Columna'
import {
  aQueryVehiculos,
  hayFiltrosVehiculosActivos,
  PAGE_SIZE_DEFAULT,
  useFlotaFiltersStore,
} from '@/stores/flota-filters-store'
import { useSessionStore } from '@/stores/session-store'

/**
 * `/app/flota/vehiculos` — listado de vehiculos de la organizacion activa.
 *
 * ALCANCE tras `f-05` de slice-05 (paridad, no reescritura): tabla, busqueda parcial por patente,
 * los filtros `estado` (conexion) y `situacion` que este slice destrabo, `soloActivos`, orden,
 * paginacion, menu de fila con "Ver detalle" y "Eliminar" (baja logica) y los 5 estados —
 * incluido **partial-data**, que es el que define este slice.
 *
 * `f-12` (slice-06) agrego la columna **Señales** + su aviso de pantalla. Los dos van juntos y no se
 * separan: la columna esta vacia en el 100 % de las filas (GATE 2 / **B-38**, no hay escritor de
 * alertas) y sin el aviso esa tabla afirma "todos tus vehiculos estan bien". Ver `AvisoDeSenales`.
 *
 * ── LO QUE NO ENTRA, Y NO ES UN OLVIDO ────────────────────────────────────────────────────────
 *  - **Contadores del header** (total, con GPS, sin GPS, sin conductor): **B-35**. No hay endpoint
 *    agregado ni campos de conteo en el response, y derivarlos de la pagina actual daria un numero
 *    que cambia al paginar. Lo unico que si se puede afirmar es la cobertura DE LA PAGINA, y se
 *    dibuja diciendo que es eso (`AvisoDatosDeConexion`).
 *  - **Exportar**: **B-34**. `GET /vehiculos/exportar` **no esta construido** —su unico camino de
 *    error (400 por >10.000 filas) no tiene `code` y el backend paro en vez de inventarlo—, asi que
 *    hoy es un 404 de routing. Un boton para una operacion que el backend no puede completar no se
 *    dibuja, aunque `f-05` paso 7 lo pida: manda el contrato.
 *  - **Importar**: P4 abierta (shape del resultado, `code` por fila y transporte del CSV).
 *  - **Filtro `tipo`**: el server lo declara, pero `GET /catalogos/tipos-vehiculo` no existe.
 *  - **Bulk bar y "Exportar seleccion"**: sin soporte de contrato (no hay endpoints masivos ni
 *    export por ids). Por eso la tabla tampoco tiene columna de seleccion.
 *  - **Modales de alta rapida, asociar dispositivo, conductores y compartir**: alta rapida vs
 *    wizard sigue abierta (DA-VL-03) y compartir no tiene diseno canonico. Las asignaciones se
 *    hacen desde la ficha del vehiculo, que si las tiene.
 *
 * La pagina no tiene logica de negocio: lee filtros del store, llama al hook y ensambla.
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
  const estado = useFlotaFiltersStore((s) => s.estado)
  const situacion = useFlotaFiltersStore((s) => s.situacion)
  const soloActivos = useFlotaFiltersStore((s) => s.soloActivos)
  const page = useFlotaFiltersStore((s) => s.page)
  const pageSize = useFlotaFiltersStore((s) => s.pageSize)
  const sortBy = useFlotaFiltersStore((s) => s.sortBy)
  const sortDirection = useFlotaFiltersStore((s) => s.sortDirection)
  const setPatente = useFlotaFiltersStore((s) => s.setPatente)
  const setEstado = useFlotaFiltersStore((s) => s.setEstado)
  const setSituacion = useFlotaFiltersStore((s) => s.setSituacion)
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

  const filtros = { patente, estado, situacion, soloActivos, page, pageSize, sortBy, sortDirection }
  const consulta = useVehiculos(aQueryVehiculos(filtros))
  const eliminar = useEliminarVehiculo()

  /*
    ── SEÑALES EMBEBIDAS (`f-12`) — UNA request por pagina, jamas una por fila ────────────────────
    `GET /alertas` no acepta `?vehiculoId=` (es `PageQuery` pelado, B-17), asi que la unica forma de
    alimentar N filas es traer una pagina e indexar en cliente. `QUERY_DE_SENALES` es una CONSTANTE
    de modulo: la misma referencia en cada render, para que la query key no cambie de identidad.

    ⚠️ Un fallo de este request **no rompe el listado** (`f-12` paso 8: partial-data). Lo que si hace
    es cambiar el aviso: sin fuente, la columna vacia no puede leerse como "todo bien".
  */
  const senales = useSenales(QUERY_DE_SENALES)
  const indice = indiceDeSenales(senales.data)
  const avisoSenales = avisoDeSenales(indice, senales.isError)

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
  // vacio es de datos.
  const hayFiltros = hayFiltrosVehiculosActivos(filtros)

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

  const vehiculos = consulta.data?.items ?? []
  const cobertura = coberturaDeConexion(vehiculos.map((vehiculo) => vehiculo.estado))

  /*
    Filtrar por "En linea" cuando ninguna fila tiene fuente devuelve vacio, y "Ningun vehiculo
    coincide con tus filtros" es literalmente cierto y completamente enganoso: los vehiculos estan,
    lo que falta es la senal que decide si estan en linea. La explicacion REEMPLAZA a la generica
    ("proba ajustar la busqueda"), que ahi manda a hacer lo que no va a servir.

    El segundo argumento evita el error opuesto: con una patente o una situacion puestas ademas del
    chip, el vacio puede ser de ESOS filtros, y una lista vacia no trae filas que mirar para saber
    cual fue. Ahi vuelve el copy generico, que no afirma ninguna causa.
  */
  const hayOtroFiltroAdemasDeConexion = patente.trim() !== '' || situacion !== ''
  const claveVacioConexion = claveDeVacioPorFiltroDeConexion(estado, hayOtroFiltroAdemasDeConexion)

  const vacio = hayFiltros ? (
    <EstadoVacio
      variante="sin-resultados"
      icono={SearchX}
      titulo={t('vehiculosListado.vacioSinResultados.titulo')}
      descripcion={
        claveVacioConexion === null
          ? t('vehiculosListado.vacioSinResultados.descripcion')
          : t(claveVacioConexion)
      }
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

  /*
    ── UN REFETCH QUE FALLA NO BORRA LA TABLA QUE YA ESTABA LLENA ────────────────────────────────
    `useVehiculos` usa `keepPreviousData` justamente para no perder la pagina bajo el cursor del
    usuario, pero `Tabla` le da precedencia a `error` sobre `filas`: con `data` presente y un refetch
    en background fallado (red intermitente, 500 esporadico), la lista ENTERA se reemplazaba por el
    panel de error y el usuario perdia lo que estaba mirando.

    Un error CON datos en mano es partial-data, no una pantalla de error: la tabla se queda y el
    fallo se avisa arriba, con su reintento. Sin datos en mano si corresponde el panel entero, porque
    no hay nada que preservar. Es la misma correccion que ya tienen dispositivos y conductores.
  */
  const hayDatosEnMano = consulta.data !== undefined

  const error =
    errorApi && !hayDatosEnMano ? (
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

      <VehiculoFiltros
        busqueda={busqueda}
        estado={estado}
        situacion={situacion}
        soloActivos={soloActivos}
        hayFiltros={hayFiltros}
        onBusqueda={setBusqueda}
        onEstado={setEstado}
        onSituacion={setSituacion}
        onSoloActivos={setSoloActivos}
        onLimpiar={limpiarFiltros}
      />

      {errorApi && hayDatosEnMano ? (
        <Aviso
          titulo={t('vehiculosListado.error.tituloRefresco')}
          mensaje={resolveApiErrorMessage(errorApi, tComun)}
          trazaId={errorApi.traceId ?? undefined}
          accion={
            <Boton variante="secundaria" tamano="sm" onClick={() => void consulta.refetch()}>
              {t('vehiculosListado.error.reintentar')}
            </Boton>
          }
        />
      ) : null}

      {/*
        PARTIAL-DATA. Va ARRIBA de la tabla cuando ninguna fila tiene fuente, que es el caso que se
        confunde con "se me cayo la flota". No es un error y no reemplaza a la tabla: el resto de la
        fila (patente, alias, marca, estado operativo, creado) esta completo y actualizado.
      */}
      <AvisoDatosDeConexion cobertura={cobertura} />

      {/*
        La columna "Señales" va a estar vacia en TODAS las filas mientras GATE 2 siga abierto. Sin
        esta linea, una tabla de 20 filas sin badge se lee como "20 vehiculos sin problemas" — que es
        lo que la pantalla no puede afirmar, porque la deteccion no corre. Ver `AvisoDeSenales`.
      */}
      <AvisoDeSenales cual={avisoSenales} />

      <TablaVehiculos
        vehiculos={vehiculos}
        cargando={consulta.isPending}
        orden={{ clave: sortBy, direccion: sortDirection === 'Asc' ? 'asc' : 'desc' }}
        onOrden={cambiarOrden}
        vacio={vacio}
        error={error}
        puedeEliminar={puedeEliminar}
        indiceDeSenales={indice}
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
            // `count` ademas de `total`: es el nombre que i18next usa para elegir la forma plural.
            // Sin el, una flota de uno decia "de 1 vehiculos".
            rango: (desde, hasta, total) =>
              t('vehiculosListado.paginacion.rango', { desde, hasta, total, count: total }),
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
