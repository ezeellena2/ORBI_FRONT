import { useTranslation } from 'react-i18next'
import { ArrowRight, History } from 'lucide-react'
import { Badge } from '@/shared/ui/Badge'
import { EstadoError } from '@/shared/ui/EstadoError'
import { EstadoVacio } from '@/shared/ui/EstadoVacio'
import { Icono } from '@/shared/ui/Icono'
import { Paginacion } from '@/shared/ui/Paginacion'
import { SinAccesoOverlay } from '@/shared/ui/SinAccesoOverlay'
import { Tabla } from '@/shared/ui/Tabla'
import type { Columna } from '@/shared/ui/Columna'
import { parseApiError, resolveApiErrorMessage } from '@/shared/errors/parse-api-error'
import type { TransicionStockDto } from '@/services/contracts/flota'
import { formatearFechaHora } from '../../detalle/formato'
import { useHistorialStockDispositivo } from '../../../hooks/useHistorialStockDispositivo'
import { claveDeStock, varianteDeStock } from './vocabulario-stock'

/**
 * Tab "Historial de stock" — `GET .../historial-stock` → `PagedResult<TransicionStockDto>`,
 * permiso `flota.dispositivos.leer` (el mismo de la pagina).
 *
 * ⚠️ ESTE TAB DEJO DE SER UN "SIN FUENTE". El panel declarado que estaba acá afirmaba que "no hay
 * tabla en el contrato de datos", y era falso desde la migracion
 * `Agregado_DispositivoGps_Y_Asignacion`: la tabla es `transiciones_stock_dispositivo_flota` y el
 * endpoint esta implementado.
 *
 * ── APPEND-ONLY, Y LA PRIMERA FILA NO ES RUIDO ────────────────────────────────────────────────
 * La transicion mas vieja es siempre la INICIAL del alta, con `estadoAnterior === null`: se lee
 * "Alta en el inventario → Disponible". Es de donde el detalle repone `fechaAltaOperativa`
 * (D-S3-26), asi que un historial de un solo item NO significa "nunca se movio por un error":
 * significa que nunca cambio de estado desde que entro.
 *
 * ── LO QUE NO SE PORTA DEL MOCKUP ─────────────────────────────────────────────────────────────
 * "OT-1180 · costo $ 12.400 · Taller Silva" EXCEDE el contrato: `TransicionStockDto` cierra en
 * `motivo` + `usuarioNombre`. Son datos de demo. Tampoco hay boton "Exportar": no existe endpoint
 * de exportacion del historial en `api.md`.
 *
 * ── PAGINACION ────────────────────────────────────────────────────────────────────────────────
 * La query es `{ page, pageSize }` con valores primitivos: React Query hashea la key por VALOR, asi
 * que un objeto literal nuevo con los mismos numeros NO dispara una query nueva. Lo que sí la
 * dispararia —y ya paso una vez en `TabHistorial`— es meter un valor que cambia solo, tipo
 * `new Date().toISOString()`.
 *
 * No hace falta acotar la pagina despues de borrar, como en el listado: el historial es append-only,
 * nada se elimina y `totalPages` nunca baja.
 *
 * ── LA PAGINA ES ESTADO DE LA FICHA, NO DE ESTE TAB ───────────────────────────────────────────
 * `Tabs.Panel` de Base UI DESMONTA el panel inactivo (`keepMounted = false` es su default), asi que
 * un `useState` acá adentro muere cada vez que el usuario cambia de tab. Sintoma medido: se audita
 * un movimiento en la pagina 3, se mira un dato en "Info general", se vuelve, y el historial esta de
 * nuevo en la pagina 1 — sin un request que lo delate, porque la pagina 1 sigue en cache.
 *
 * Por eso la posicion vive en la PAGINA y baja como props. Es la misma regla que ya aplica el
 * listado: la pagina es posicion dentro de un resultado y su dueño es quien sobrevive al remonte.
 */

/** Default de la posicion, que ahora vive en la ficha (ver el bloque de arriba). */
export const PAGE_SIZE_HISTORIAL_DEFAULT = 10
const OPCIONES_TAMANO_HISTORIAL = [10, 25, 50]
const PERMISO_LECTURA = 'flota.dispositivos.leer'

export function TabHistorialStock({
  dispositivoId,
  page,
  pageSize,
  onPaginacion,
}: {
  dispositivoId: string
  page: number
  pageSize: number
  /** Recibe los dos juntos: cambiar el tamaño obliga a volver a la pagina 1, y son un solo hecho. */
  onPaginacion: (page: number, pageSize: number) => void
}) {
  const { t, i18n } = useTranslation(['flota', 'common'])

  const consulta = useHistorialStockDispositivo(dispositivoId, { page, pageSize })
  const errorApi = consulta.error ? parseApiError(consulta.error) : null

  // FORBIDDEN: el gate de la pagina ya corrio con el mismo permiso, asi que un 403 aca significa
  // que el backend lo revoco con la sesion abierta (o que el modulo dejo de estar activo). Bloquea
  // el panel con el permiso literal, nunca lo esconde: un tab que se vacia sin decir nada se lee
  // como "no hay movimientos".
  if (errorApi?.status === 403) {
    return (
      // `SinAccesoOverlay` es `absolute inset-0`: sin un contenedor posicionado con alto propio se
      // colapsa a cero y el bloqueo no se ve.
      <div className="relative min-h-64">
        <SinAccesoOverlay
          permiso={PERMISO_LECTURA}
          titulo={t('flota:forbidden.titulo')}
          descripcion={t('flota:dispositivoDetalle.sinAcceso.descripcion', {
            permiso: PERMISO_LECTURA,
          })}
        />
      </div>
    )
  }

  const columnas: Columna<TransicionStockDto>[] = [
    {
      clave: 'fecha',
      titulo: t('flota:dispositivoDetalle.historialStock.fecha'),
      tipo: 'fecha',
      ancho: 176,
      render: (transicion) => formatearFechaHora(transicion.fechaUtc, i18n.language),
    },
    {
      clave: 'transicion',
      titulo: t('flota:dispositivoDetalle.historialStock.transicion'),
      tipo: 'nodo',
      ancho: 288,
      render: (transicion) => <CeldaTransicion transicion={transicion} />,
    },
    {
      clave: 'motivo',
      titulo: t('flota:dispositivoDetalle.historialStock.motivo'),
      tipo: 'texto',
      render: (transicion) => (
        <span className={transicion.motivo === null ? 'text-fg-terciario' : undefined}>
          {transicion.motivo ?? t('flota:dispositivoDetalle.historialStock.sinMotivo')}
        </span>
      ),
    },
    {
      clave: 'usuario',
      titulo: t('flota:dispositivoDetalle.historialStock.usuario'),
      tipo: 'texto',
      ancho: 176,
      render: (transicion) => (
        <span className={transicion.usuarioNombre === null ? 'text-fg-terciario' : undefined}>
          {transicion.usuarioNombre ?? t('flota:dispositivoDetalle.historialStock.sinUsuario')}
        </span>
      ),
    },
  ]

  const paginacion = consulta.data?.pagination ?? null

  return (
    <div className="flex flex-col gap-2">
      <Tabla
        columnas={columnas}
        filas={consulta.data?.items ?? []}
        claveFila={(transicion) => transicion.transicionId}
        cargando={consulta.isPending}
        filasSkeleton={5}
        vacio={
          // Un solo empty, no dos: el historial no tiene filtros, asi que "sin datos" y "sin
          // resultados" no son estados distinguibles acá.
          <EstadoVacio
            variante="sin-datos"
            icono={History}
            titulo={t('flota:dispositivoDetalle.historialStock.vacioTitulo')}
            descripcion={t('flota:dispositivoDetalle.historialStock.vacioDescripcion')}
          />
        }
        error={
          errorApi ? (
            <EstadoError
              variante="recuperable"
              titulo={t('flota:dispositivoDetalle.historialStock.errorTitulo')}
              mensaje={resolveApiErrorMessage(errorApi, t)}
              trazaId={errorApi.traceId ?? undefined}
              textoReintentar={t('flota:comun.reintentar')}
              onReintentar={() => void consulta.refetch()}
            />
          ) : undefined
        }
      />

      {paginacion !== null && paginacion.totalItems > 0 ? (
        <Paginacion
          pagina={paginacion.page}
          tamanoPagina={paginacion.pageSize}
          total={paginacion.totalItems}
          opcionesTamano={OPCIONES_TAMANO_HISTORIAL}
          deshabilitada={consulta.isFetching}
          onCambio={(cambio) => {
            if (cambio.tamanoPagina !== paginacion.pageSize) {
              onPaginacion(1, cambio.tamanoPagina)
              return
            }
            onPaginacion(cambio.pagina, paginacion.pageSize)
          }}
          textos={{
            anterior: t('flota:dispositivosListado.paginacion.anterior'),
            siguiente: t('flota:dispositivosListado.paginacion.siguiente'),
            porPagina: t('flota:dispositivosListado.paginacion.porPagina'),
            // `count` ademas de `total`: es el nombre que i18next usa para elegir la forma plural.
            // Sin el, un dispositivo recien dado de alta decia "de 1 movimientos".
            rango: (desde, hasta, total) =>
              t('flota:dispositivoDetalle.historialStock.rango', {
                desde,
                hasta,
                total,
                count: total,
              }),
          }}
        />
      ) : null}
    </div>
  )
}

/**
 * "Alta en el inventario → Disponible" / "Disponible → En reparación".
 *
 * `estadoAnterior === null` marca la transicion INICIAL: no se pinta un badge vacio ni un guion, se
 * dice qué fue. Los badges usan el MISMO mapeo codigo→color que el listado y el hero
 * (`vocabulario-stock`): si el mismo codigo se pintara de dos colores distintos, el badge dejaria de
 * significar algo.
 */
function CeldaTransicion({ transicion }: { transicion: TransicionStockDto }) {
  const { t } = useTranslation(['flota', 'common'])

  return (
    <div className="flex flex-wrap items-center gap-2">
      {transicion.estadoAnterior === null ? (
        <span className="text-fg-secundario">
          {t('flota:dispositivoDetalle.historialStock.altaInicial')}
        </span>
      ) : (
        <Badge variante={varianteDeStock(transicion.estadoAnterior)}>
          {t(`flota:${claveDeStock(transicion.estadoAnterior)}`)}
        </Badge>
      )}

      <Icono icono={ArrowRight} tamano="xs" />

      <Badge punto variante={varianteDeStock(transicion.estadoNuevo)}>
        {t(`flota:${claveDeStock(transicion.estadoNuevo)}`)}
      </Badge>
    </div>
  )
}
