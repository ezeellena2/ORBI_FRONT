import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, Radio, Smartphone } from 'lucide-react'
import { Boton } from '@/shared/ui/Boton'
import { EstadoError } from '@/shared/ui/EstadoError'
import { EstadoVacio } from '@/shared/ui/EstadoVacio'
import { SinAccesoOverlay } from '@/shared/ui/SinAccesoOverlay'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/shared/ui/base/tabs'
import { parseApiError } from '@/shared/errors/parse-api-error'
import type { DispositivoDetalleDto } from '@/services/contracts/flota'
import { useDispositivo } from '../hooks/useDispositivo'
import { ModalCambiarEstadoStock } from '../components/dispositivos/ModalCambiarEstadoStock'
import { ModalEditarDispositivo } from '../components/dispositivos/ModalEditarDispositivo'
import { DispositivoCargando } from '../components/dispositivos/detalle/DispositivoCargando'
import { HeroDispositivo } from '../components/dispositivos/detalle/HeroDispositivo'
import { ModalBajaDispositivo } from '../components/dispositivos/detalle/ModalBajaDispositivo'
import { ModalReactivarDispositivo } from '../components/dispositivos/detalle/ModalReactivarDispositivo'
import { PanelSinFuente } from '../components/dispositivos/detalle/PanelSinFuente'
import {
  PAGE_SIZE_HISTORIAL_DEFAULT,
  TabHistorialStock,
} from '../components/dispositivos/detalle/TabHistorialStock'
import { TabInfoDispositivo } from '../components/dispositivos/detalle/TabInfoDispositivo'
import { TabTelemetriaDispositivo } from '../components/dispositivos/detalle/TabTelemetriaDispositivo'

/**
 * `/app/flota/dispositivos/:dispositivoId` — la ficha del dispositivo GPS.
 *
 * Es una COMPOSICION DE CAPAS, igual que la ficha del vehiculo — pero OJO con de donde sale cada
 * cosa, porque cambio y este comentario decia lo contrario:
 *  - **IMEI**: unico dato de identidad que Flota copia del canonico (es la clave del alta Modo A).
 *  - **nº de serie**: columna PROPIA de `dispositivos_flota` desde **D-S3-24** — dejo de proyectarse
 *    del canonico, que no tiene esa columna (proyectarla contrataba un `null` permanente).
 *  - **fabricante**: se DERIVA del catalogo de modelos (**D-S3-25**), no del canonico.
 *  - **operativos de Flota**: alias, SIM, estado de stock, notas. **`costo` y `deposito` NO
 *    EXISTEN**: se borraron del contrato con D-S3-12 (no habia columnas y System.Text.Json los
 *    descartaba en silencio).
 *
 * Los 3 campos de identidad siguen siendo read-only despues del alta, pero por contrato del PATCH,
 * no porque Flota no los posea.
 *
 * ⚠️ **La capa de Telemetria ya NO esta toda sin fuente**, y este comentario decia que si: desde
 * slice-05 (2026-08-12) el **snapshot tecnico** y la **conexion** traen dato real y el tab
 * Telemetria los muestra (200 partial-data: lo que falta viaja `null`, no rompe la ficha). Lo que
 * sigue sin fuente son los **eventos historicos** (B-9, Telemetria no los persiste), y eso el tab lo
 * DICE en vez de dibujar un placeholder que parezca dato.
 *
 * LOS 5 ESTADOS OBLIGATORIOS viven acá arriba, antes de cualquier render de contenido:
 *  - loading      → esqueleto de hero + panel (`DispositivoCargando`).
 *  - forbidden    → `SinAccesoOverlay` que BLOQUEA la página. Nunca un redirect (B-3): un redirect
 *                   silencioso le hace creer al usuario que la pantalla no existe.
 *  - error 404    → "Dispositivo no encontrado". Un id de OTRA organización responde 404, no 403, y
 *                   la UI tampoco intenta distinguirlos: es la regla de cross-tenant uniforme.
 *  - error otro   → recuperable con "Reintentar", sin perder la URL.
 *  - empty        → no aplica a nivel página (un detalle siempre tiene dispositivo); vive POR
 *                   SUB-SECCIÓN: "Sin vehículo asociado" en su card, y el estado declarado de los
 *                   tabs que todavía no tienen fuente.
 *  - partial-data → NO tiene rama propia acá, y es a propósito: los campos que compone Telemetría
 *                   llegan en `null` dentro de una respuesta 200 exitosa, así que cada bloque muestra
 *                   su fallback y TODO lo propio de Flota se sigue viendo. Convertirlo en una
 *                   pantalla de error sería romper la ficha por una dependencia externa.
 *
 * El tab activo es estado local, no ruta: sincronizarlo con `?tab=` es **DA-DD-11, abierta**, y no
 * se cablea hasta que el PO decida. La ficha se comparte por su URL, y esa URL apunta al
 * dispositivo, no a la pestaña que alguien tenía abierta.
 */
export default function DispositivoDetallePage() {
  const { dispositivoId } = useParams<{ dispositivoId: string }>()
  const { t } = useTranslation(['flota', 'common'])
  const navigate = useNavigate()
  const consulta = useDispositivo(dispositivoId)

  // Sin id la consulta queda deshabilitada y `isPending` no baja nunca: mostrar el esqueleto para
  // siempre sería un spinner infinito. La ruta siempre trae el param, pero el caso se cierra igual.
  if (dispositivoId === undefined) {
    return <DispositivoNoEncontrado />
  }

  if (consulta.isPending) {
    return <DispositivoCargando />
  }

  if (consulta.isError) {
    const apiError = parseApiError(consulta.error)

    if (apiError.status === 403) {
      return (
        // `SinAccesoOverlay` es `absolute inset-0`: necesita un contenedor posicionado con alto
        // propio, o se colapsa a cero y el bloqueo no se ve.
        <div className="relative min-h-96 flex-1">
          {/*
            `permiso` es SIEMPRE el permiso literal, nunca `apiError.code`. El overlay lo renderiza
            en un <code> para que el usuario se lo pase a su admin, y el 403 del gate de módulo trae
            `code: flota.modulo.no_activo` — que no existe en el catálogo de 44 permisos. Mostrarlo
            ahí mandaba al admin a buscar un permiso inexistente.
          */}
          <SinAccesoOverlay
            permiso="flota.dispositivos.leer"
            titulo={t('flota:forbidden.titulo')}
            descripcion={t('flota:dispositivoDetalle.sinAcceso.descripcion', {
              permiso: 'flota.dispositivos.leer',
            })}
            textoVolver={t('flota:forbidden.volver')}
            onVolver={() => navigate('/app')}
          />
        </div>
      )
    }

    if (apiError.status === 404) {
      return <DispositivoNoEncontrado />
    }

    return (
      <EstadoError
        titulo={t('flota:dispositivoDetalle.error.titulo')}
        mensaje={t('flota:dispositivoDetalle.error.descripcion')}
        trazaId={apiError.traceId ?? undefined}
        textoReintentar={t('flota:comun.reintentar')}
        onReintentar={() => void consulta.refetch()}
      />
    )
  }

  return <FichaDispositivo dispositivo={consulta.data} />
}

type ModalAbierto = 'ninguno' | 'editar' | 'estado-stock' | 'baja' | 'reactivar'

function FichaDispositivo({ dispositivo }: { dispositivo: DispositivoDetalleDto }) {
  const { t } = useTranslation(['flota', 'common'])
  const [modal, setModal] = useState<ModalAbierto>('ninguno')

  /**
   * Posición dentro del historial de stock. Vive ACÁ y no dentro del tab porque `Tabs.Panel`
   * desmonta el panel inactivo (`keepMounted = false` es el default de Base UI): un `useState`
   * adentro se perdía en cada ida y vuelta a "Info general" y el usuario volvía a la página 1 sin
   * ningún aviso. Los dos campos van juntos en un solo estado porque cambian juntos.
   */
  const [historial, setHistorial] = useState({
    page: 1,
    pageSize: PAGE_SIZE_HISTORIAL_DEFAULT,
  })

  return (
    <div className="flex flex-col gap-6">
      <EnlaceVolver />

      <HeroDispositivo
        dispositivo={dispositivo}
        onEditar={() => setModal('editar')}
        onCambiarEstadoStock={() => setModal('estado-stock')}
        onDarDeBaja={() => setModal('baja')}
        onReactivar={() => setModal('reactivar')}
      />

      {/*
        4 tabs, no los 5 de la ficha. "Configuración" NO se dibuja: además de estar fuera del slice,
        sus 6 parámetros no tienen NINGUNA tabla en `datos.md`/`ddl.sql` donde persistirse. Un tab
        con un formulario que no puede guardar es peor que un tab que no está.

        Los otros tres se dibujan CON su estado declarado y sin emitir un solo request — ver
        `PanelSinFuente`.
      */}
      <Tabs defaultValue="info">
        <TabsList variant="line" className="flex-wrap">
          <TabsTrigger value="info">{t('flota:dispositivoDetalle.tabs.info')}</TabsTrigger>
          <TabsTrigger value="telemetria">
            {t('flota:dispositivoDetalle.tabs.telemetria')}
          </TabsTrigger>
          <TabsTrigger value="stock">{t('flota:dispositivoDetalle.tabs.stock')}</TabsTrigger>
          <TabsTrigger value="eventos">{t('flota:dispositivoDetalle.tabs.eventos')}</TabsTrigger>
        </TabsList>

        <TabsContent value="info" className="pt-4">
          <TabInfoDispositivo dispositivo={dispositivo} />
        </TabsContent>

        {/*
          Snapshot técnico en vivo: DATO REAL desde slice-05 `f-04`. Este tab dibujaba un "sin
          fuente" que afirmaba que "esa integración todavía no está conectada" — quedó falso el
          2026-08-12. El endpoint responde **200 partial-data** (lo que no tiene fuente viaja `null`,
          nunca un 500), así que el tab SÍ emite su request: tratarlo como degradado escondía el
          único dato técnico que hoy existe del equipo.
        */}
        <TabsContent value="telemetria" className="pt-4">
          <TabTelemetriaDispositivo dispositivo={dispositivo} />
        </TabsContent>

        {/*
          Historial de stock: TABLA REAL. Este tab dibujaba un "sin fuente" que afirmaba que no
          había tabla en el contrato de datos — era falso desde la migración
          `Agregado_DispositivoGps_Y_Asignacion`. El endpoint está implementado y es append-only.
        */}
        <TabsContent value="stock" className="pt-4">
          <TabHistorialStock
            dispositivoId={dispositivo.id}
            page={historial.page}
            pageSize={historial.pageSize}
            onPaginacion={(page, pageSize) => setHistorial({ page, pageSize })}
          />
        </TabsContent>

        {/*
          Eventos: superficie ⚠ DEGRADADA (A-1). Telemetría no persiste histórico de eventos de
          dispositivo, así que el endpoint responde SIEMPRE 500 `flota.telemetria.no_disponible`.
          Se declara sin pedirlo: disparar un request cuyo único desenlace posible es un 500 mete un
          error en la consola de todos los usuarios y ensucia la telemetría de errores del front.
        */}
        <TabsContent value="eventos" className="pt-4">
          <PanelSinFuente
            icono={Radio}
            titulo={t('flota:dispositivoDetalle.eventos.sinFuenteTitulo')}
            descripcion={t('flota:dispositivoDetalle.eventos.sinFuenteDescripcion')}
          />
        </TabsContent>
      </Tabs>

      {/*
        Los modales se montan solo mientras están abiertos, y es a propósito: así el formulario de
        edición toma sus valores por defecto del dispositivo ACTUAL cada vez que se abre, y el error
        de un intento anterior no reaparece en el siguiente.
      */}
      {modal === 'editar' ? (
        <ModalEditarDispositivo
          dispositivo={dispositivo}
          abierto
          onCerrar={() => setModal('ninguno')}
        />
      ) : null}
      {modal === 'estado-stock' ? (
        <ModalCambiarEstadoStock
          dispositivo={dispositivo}
          abierto
          onCerrar={() => setModal('ninguno')}
        />
      ) : null}
      {modal === 'baja' ? (
        <ModalBajaDispositivo
          dispositivo={dispositivo}
          abierto
          onCerrar={() => setModal('ninguno')}
        />
      ) : null}
      {modal === 'reactivar' ? (
        <ModalReactivarDispositivo
          dispositivo={dispositivo}
          abierto
          onCerrar={() => setModal('ninguno')}
        />
      ) : null}
    </div>
  )
}

function EnlaceVolver() {
  const { t } = useTranslation(['flota', 'common'])

  return (
    <Link
      to="/app/flota/dispositivos"
      className="inline-flex w-fit items-center gap-1.5 text-sm text-fg-secundario hover:text-fg-primario"
    >
      <ArrowLeft className="size-4" aria-hidden />
      {t('flota:comun.volverADispositivos')}
    </Link>
  )
}

/**
 * 404 UNIFORME. Cubre "no existe" y "existe pero es de otra organización": el backend filtra por
 * `OrganizacionId` en el WHERE, así que los dos casos son indistinguibles — y eso es deliberado, un
 * 403 confirmaría que el id existe en otra organización.
 */
function DispositivoNoEncontrado() {
  const { t } = useTranslation(['flota', 'common'])

  return (
    <EstadoVacio
      variante="sin-resultados"
      icono={Smartphone}
      titulo={t('flota:dispositivoDetalle.noEncontrado.titulo')}
      descripcion={t('flota:dispositivoDetalle.noEncontrado.descripcion')}
      acciones={
        <Boton variante="secundaria" render={<Link to="/app/flota/dispositivos" />}>
          {t('flota:comun.volverADispositivos')}
        </Boton>
      }
    />
  )
}
