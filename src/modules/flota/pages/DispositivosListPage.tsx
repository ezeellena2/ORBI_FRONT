import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import { Cpu, Plus, SearchX } from 'lucide-react'
import { FiltrosDispositivos } from '../components/dispositivos/FiltrosDispositivos'
import { ModalAsociarAVehiculo } from '../components/dispositivos/ModalAsociarAVehiculo'
import { ModalCambiarEstadoStock } from '../components/dispositivos/ModalCambiarEstadoStock'
import { ModalEditarDispositivoPorId } from '../components/dispositivos/ModalEditarDispositivo'
import { ModalRegistrarDispositivo } from '../components/dispositivos/ModalRegistrarDispositivo'
import { TablaDispositivos } from '../components/dispositivos/TablaDispositivos'
import { AccionConMotivo } from '../components/AccionConMotivo'
import { AvisoDatosDeConexion } from '../components/AvisoDatosDeConexion'
import { Aviso } from '@/shared/ui/Aviso'
import { useDispositivos } from '../hooks/useDispositivos'
import { useEliminarDispositivo } from '../hooks/useEliminarDispositivo'
import { usePermisos } from '@/shared/auth/permissions/usePermisos'
import {
  claveDeVacioPorFiltroDeConexionDeEquipo,
  coberturaDeConexion,
} from '../vocabulario-conexion'
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
 * `/app/flota/dispositivos` — inventario de dispositivos GPS de la organizacion activa.
 *
 * ALCANCE tras `f-07` de slice-05 (paridad, no reescritura): tabla con la **columna Conexion**, los
 * **5** filtros que el server declara —incluido el de conexion, que es el que este slice destraba—,
 * paginacion, alta (Modo A), kebab con ver detalle / asignar a vehiculo / editar / cambiar estado de
 * stock / eliminar, y los 5 estados — incluido **partial-data**, que es el que define este slice.
 *
 * ── LA SEGUNDA COSA QUE ESTE SLICE DESTRABO ───────────────────────────────────────────────────
 * "Asignar a vehiculo" estaba **deshabilitado** desde slice-03, y su motivo era que el filtro
 * `situacion` de `GET /vehiculos` no existia: sin el no habia forma de listar los vehiculos sin GPS
 * (`VehiculoListItemDto.dispositivo` viene `null` en el 100% de las respuestas, y sigue viniendo).
 * slice-05 `f-02` lo implemento con sus 4 valores, y `sin_dispositivo_gps` describe **exacto** a los
 * candidatos porque el vinculo es 1:1. La accion pasa a estar viva: `ModalAsociarAVehiculo`.
 *
 * ── LA TRAMPA DE ESTA PANTALLA ────────────────────────────────────────────────────────────────
 * En un inventario, `sin_dato` es el caso NORMAL: un GPS `en_stock` nunca aparece en la fuente batch
 * de Telemetria, asi que no tiene senal **porque no esta instalado**, no porque falle. Y cuando
 * Telemetria no responde, TODAS las filas caen en `sin_dato` (partial-data D-C1 a: 200 con los
 * campos tecnicos en `null` y todo lo propio servido igual). Los dos casos se pintan **neutros** y
 * cada uno tiene su explicacion; el unico rojo es `desconectado`, que si es una afirmacion del
 * upstream sobre un equipo que venia reportando.
 *
 * ── LO QUE NO ENTRA, Y NO ES UN OLVIDO ────────────────────────────────────────────────────────
 *  - **Contadores del header** (total / en linea / desconectados / disponibles en stock): **B-35**.
 *    No hay endpoint agregado ni campos de conteo, y derivarlos de la pagina actual daria un numero
 *    que cambia al paginar. Lo unico afirmable es la cobertura DE LA PAGINA, y se dibuja diciendo
 *    que es eso (`AvisoDatosDeConexion`). ⚠️ La ficha §9 los da por existentes y dice que degradan a
 *    "—" con Telemetria caida: no degradan, **no existen**.
 *  - **`conexion = incompleto`**: inalcanzable para un equipo (B-32). Ver `FiltrosDispositivos`.
 *  - **Busqueda libre**: `GET /dispositivos` no tiene param de busqueda en el contrato. El input no
 *    se pinta "por las dudas".
 *  - **Exportar**: **B-34**. `GET /dispositivos/exportar` **no esta construido** —su unico camino de
 *    error (400 por >10.000 filas) no tiene `code` y el backend paro en vez de inventarlo—, asi que
 *    hoy es un 404 de routing. Un boton para una operacion que el backend no puede completar no se
 *    dibuja, aunque `f-07` paso 7 lo pida: manda el contrato.
 *  - **Importar**: no existe endpoint de importacion de dispositivos en `api.md` (PENDIENTE ficha
 *    §12). **Bulk bar**: sin endpoints masivos. **Hacer ping**: BLOQUEADO (B-12), y un stub jamas
 *    simula exito. **Compartir**: permiso sin endpoint.
 *  - **QR de instalacion y Configuracion**: DEROGADOS del contrato (D-S3-22/23), no van.
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
  const conexion = useFlotaDispositivosFiltersStore((s) => s.conexion)
  const soloActivos = useFlotaDispositivosFiltersStore((s) => s.soloActivos)
  const page = useFlotaDispositivosFiltersStore((s) => s.page)
  const pageSize = useFlotaDispositivosFiltersStore((s) => s.pageSize)
  const sortBy = useFlotaDispositivosFiltersStore((s) => s.sortBy)
  const sortDirection = useFlotaDispositivosFiltersStore((s) => s.sortDirection)
  const setStock = useFlotaDispositivosFiltersStore((s) => s.setStock)
  const setModelo = useFlotaDispositivosFiltersStore((s) => s.setModelo)
  const setAsignacion = useFlotaDispositivosFiltersStore((s) => s.setAsignacion)
  const setConexion = useFlotaDispositivosFiltersStore((s) => s.setConexion)
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
  const [aAsignarVehiculo, setAAsignarVehiculo] = useState<DispositivoListItemDto | null>(null)
  const [aEliminar, setAEliminar] = useState<DispositivoListItemDto | null>(null)

  const filtros = {
    stock,
    modelo,
    asignacion,
    conexion,
    soloActivos,
    page,
    pageSize,
    sortBy,
    sortDirection,
  }
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

  const dispositivos = consulta.data?.items ?? []
  const cobertura = coberturaDeConexion(dispositivos.map((dispositivo) => dispositivo.conexion))

  /*
    Filtrar por "En linea" cuando ninguna fila tiene fuente devuelve vacio, y "Ningun dispositivo
    coincide con tus filtros" es literalmente cierto y completamente enganoso: los equipos estan, lo
    que falta es la senal que decide si estan en linea. La explicacion REEMPLAZA a la generica
    ("proba cambiar el estado de stock"), que ahi manda a hacer lo que no va a servir.

    El segundo argumento evita el error opuesto: con un stock, un modelo o una asignacion puestos
    ademas del chip, el vacio puede ser de ESOS filtros, y una lista vacia no trae filas que mirar
    para saber cual fue. Ahi vuelve el copy generico, que no afirma ninguna causa. (`soloActivos` no
    entra: solo puede AGRANDAR el resultado al apagarse, nunca vaciarlo.)
  */
  const hayOtroFiltroAdemasDeConexion = stock !== '' || modelo !== '' || asignacion !== ''
  const claveVacioConexion = claveDeVacioPorFiltroDeConexionDeEquipo(
    conexion,
    hayOtroFiltroAdemasDeConexion,
  )

  const vacio = hayFiltros ? (
    <EstadoVacio
      variante="sin-resultados"
      icono={SearchX}
      titulo={t('dispositivosListado.vacioSinResultados.titulo')}
      descripcion={
        claveVacioConexion === null
          ? t('dispositivosListado.vacioSinResultados.descripcion')
          : t(claveVacioConexion)
      }
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
        conexion={conexion}
        soloActivos={soloActivos}
        hayFiltros={hayFiltros}
        onStock={setStock}
        onModelo={setModelo}
        onAsignacion={setAsignacion}
        onConexion={setConexion}
        onSoloActivos={setSoloActivos}
        onLimpiar={resetFiltros}
      />

      {errorApi && hayDatosEnMano ? (
        <Aviso
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

      {/*
        PARTIAL-DATA. Va ARRIBA de la tabla cuando ninguna fila tiene fuente, que es el caso que se
        confunde con "se me cayeron todos los equipos". No es un error y no reemplaza a la tabla: el
        resto de la fila (alias, IMEI, modelo, vehiculo, stock) esta completo y actualizado.
      */}
      <AvisoDatosDeConexion cobertura={cobertura} />

      <TablaDispositivos
        dispositivos={dispositivos}
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
        onAsignarVehiculo={setAAsignarVehiculo}
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
            // `count` ademas de `total`: es el nombre que i18next usa para elegir la forma plural.
            // Sin el, la primera pagina de un inventario de uno decia "de 1 dispositivos".
            rango: (desde, hasta, total) =>
              t('dispositivosListado.paginacion.rango', { desde, hasta, total, count: total }),
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

      {/*
        Al instalar, el modal cierra y el usuario se queda acá: la fila cambia su badge de stock a
        "Instalado" y estrena patente en la columna Vehiculo (el hook invalida los 2 prefijos, porque
        la operacion mueve inventario Y vehiculos). Ver la fila cambiar ES el resultado de la accion.
      */}
      <ModalAsociarAVehiculo
        dispositivo={aAsignarVehiculo}
        abierto={aAsignarVehiculo !== null}
        onCerrar={() => setAAsignarVehiculo(null)}
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
