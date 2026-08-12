import { useState, type ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { FileText, Plus, ShieldAlert } from 'lucide-react'
import { Badge } from '@/shared/ui/Badge'
import { Boton } from '@/shared/ui/Boton'
import { Card } from '@/shared/ui/Card'
import { DialogoConfirmacion } from '@/shared/ui/DialogoConfirmacion'
import { EstadoError } from '@/shared/ui/EstadoError'
import { EstadoVacio } from '@/shared/ui/EstadoVacio'
import { Tabla } from '@/shared/ui/Tabla'
import type { Columna } from '@/shared/ui/Columna'
import { parseApiError, resolveApiErrorMessage } from '@/shared/errors/parse-api-error'
import type { ConductorDetalleDto, DocumentoDto } from '@/services/contracts/flota'
import { AccionConMotivo } from '../../AccionConMotivo'
import { ConductorBadgeLicencia } from '../ConductorBadgeLicencia'
import {
  claveDeEstadoDocumento,
  claveDeTipoDocumento,
  varianteDeEstadoDocumento,
} from '../vocabulario-licencia'
import { ModalCargarDocumento } from './ModalCargarDocumento'
import { useDocumentosConductor } from '../../../hooks/useDocumentosConductor'
import { useEliminarDocumentoConductor } from '../../../hooks/useEliminarDocumentoConductor'
import { usePermisos } from '../../../hooks/usePermisos'
import { ParDato } from '../../detalle/ParDato'
import { formatearFechaSola } from '../../detalle/formato'

/**
 * Tab "Licencia y documentos" (`f-06` §6).
 *
 * ── ⚠️ EL 403 DE ESTE TAB ES **POR BLOQUE**, NO DE PAGINA ─────────────────────────────────────
 * Los 3 endpoints de documentos piden `flota.conductores.gestionar-documentos`, **tambien el `GET`**
 * (fila P-F de la matriz, transcripta tal cual). O sea que un usuario con `flota.conductores.leer`
 * ve la ficha perfectamente y recibe **403 en esta llamada sola**. Se trata como forbidden **del
 * bloque**: mensaje con el permiso literal en su tarjeta, el resto del detalle intacto. Un overlay de
 * pagina acá bloquearia una ficha que el usuario SI tiene derecho a ver.
 *
 * ── EL ESTADO DEL DOCUMENTO LO CALCULA EL BACKEND ─────────────────────────────────────────────
 * `estadoDerivado` (`vigente | por_vencer | vencido | sin_cargar`) se calcula **al leer**, con el
 * umbral de 30 dias que vive en el backend: el front **no recalcula nada**, solo pinta el badge del
 * codigo que llega.
 *
 * ── LA TARJETA DE LICENCIA NO PUEDE MOSTRAR LA CATEGORIA ──────────────────────────────────────
 * `licencia.categoria` viene **SIEMPRE `null`**: no tiene columna en ninguna tabla (**B-21**,
 * bloqueante del PO). La celda muestra su fallback **y lo explica**, en vez de dejar un guion mudo
 * que se lee como "este conductor no cargo la categoria".
 *
 * ── DOCUMENTACION OBLIGATORIA ─────────────────────────────────────────────────────────────────
 * `documentosObligatorios` trae una fila POR CADA tipo con `es_obligatorio = true`, **tenga o no
 * documento cargado** (sin fila ⇒ `sin_cargar`), y es lo que gobierna el paso a `en_servicio` (409
 * `flota.conductor.documento_vencido`). Viene en el detalle, con permiso `leer`: se ve **aunque el
 * usuario no tenga `gestionar-documentos`**, que es justo lo que hace falta para entender por que no
 * puede poner al conductor en servicio.
 */
export function TabDocumentosConductor({ conductor }: { conductor: ConductorDetalleDto }) {
  const { t, i18n } = useTranslation(['flota', 'common'])
  const { tienePermiso } = usePermisos()

  const puedeGestionar = tienePermiso('flota.conductores.gestionar-documentos')
  const motivo = puedeGestionar
    ? undefined
    : t('flota:conductorDetalle.acciones.sinPermiso', {
        permiso: 'flota.conductores.gestionar-documentos',
      })

  const documentos = useDocumentosConductor(conductor.id)
  const eliminar = useEliminarDocumentoConductor(conductor.id)

  const [cargando, setCargando] = useState<{ abierto: boolean; tipo?: string }>({ abierto: false })
  const [aEliminar, setAEliminar] = useState<DocumentoDto | null>(null)

  // El estado de la licencia SI se puede pintar con el catalogo real acá: sale de
  // `documentosObligatorios`, donde el backend ya lo derivo. En el LISTADO no llega y por eso el
  // badge se degrada (ver `vocabulario-licencia.ts`).
  const estadoLicencia = conductor.documentosObligatorios.find(
    (item) => item.tipo === 'licencia',
  )?.estado

  const errorDocumentos = documentos.error ? parseApiError(documentos.error) : null

  return (
    <div className="flex flex-col gap-4">
      <div className="grid gap-4 lg:grid-cols-2">
        <Card
          titulo={t('flota:conductorDetalle.licencia.titulo')}
          acciones={
            <AccionConMotivo motivo={motivo}>
              <Boton
                variante="secundaria"
                tamano="sm"
                deshabilitado={!puedeGestionar}
                onClick={() => setCargando({ abierto: true, tipo: 'licencia' })}
              >
                {conductor.licencia === null
                  ? t('flota:conductorDetalle.licencia.cargar')
                  : t('flota:conductorDetalle.documentos.renovarLicencia')}
              </Boton>
            </AccionConMotivo>
          }
        >
          {conductor.licencia === null ? (
            <EstadoVacio
              variante="sin-datos"
              icono={ShieldAlert}
              titulo={t('flota:conductorDetalle.licencia.vacioTitulo')}
              descripcion={t('flota:conductorDetalle.licencia.vacioDescripcion')}
            />
          ) : (
            <div className="flex flex-col gap-3">
              <ConductorBadgeLicencia
                licencia={conductor.licencia}
                estadoDerivado={estadoLicencia}
              />

              <dl className="grid gap-x-8 sm:grid-cols-2">
                <ParDato
                  etiqueta={t('flota:conductorDetalle.licencia.numero')}
                  valor={conductor.licencia.numero}
                  mono
                />
                <ParDato
                  etiqueta={t('flota:conductorDetalle.licencia.categoria')}
                  valor={conductor.licencia.categoria}
                />
                <ParDato
                  etiqueta={t('flota:conductorDetalle.licencia.emision')}
                  /* `DateOnly` del backend ⇒ `formatearFechaSola`. Ver el porqué en `formato.ts`. */
                  valor={formatearFechaSola(conductor.licencia.fechaEmision, i18n.language)}
                />
                <ParDato
                  etiqueta={t('flota:conductorDetalle.licencia.vencimiento')}
                  valor={<Vencimiento licencia={conductor.licencia} />}
                />
              </dl>

              {conductor.licencia.categoria === null ? (
                <p className="text-xs text-fg-terciario">
                  {t('flota:conductorDetalle.licencia.categoriaSinDato')}
                </p>
              ) : null}
            </div>
          )}
        </Card>

        <Card titulo={t('flota:conductorDetalle.documentos.obligatoriosTitulo')}>
          <p className="mb-3 text-xs text-fg-secundario">
            {t('flota:conductorDetalle.documentos.obligatoriosDescripcion')}
          </p>

          <ul className="flex flex-col gap-2">
            {conductor.documentosObligatorios.map((item) => (
              <li
                key={item.tipo}
                className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-borde bg-superficie-2 px-3 py-2"
              >
                <span className="text-sm text-fg-primario">
                  {t(`flota:${claveDeTipoDocumento(item.tipo)}`, { defaultValue: item.tipo })}
                </span>
                <div className="flex items-center gap-2">
                  <Badge variante={varianteDeEstadoDocumento(item.estado)}>
                    {t(`flota:${claveDeEstadoDocumento(item.estado)}`, {
                      defaultValue: item.estado,
                    })}
                  </Badge>
                  {item.estado === 'sin_cargar' ? (
                    <AccionConMotivo motivo={motivo}>
                      <Boton
                        variante="fantasma"
                        tamano="sm"
                        deshabilitado={!puedeGestionar}
                        onClick={() => setCargando({ abierto: true, tipo: item.tipo })}
                      >
                        {t('flota:conductorDetalle.documentos.subir')}
                      </Boton>
                    </AccionConMotivo>
                  ) : null}
                </div>
              </li>
            ))}
          </ul>
        </Card>
      </div>

      <Card
        titulo={t('flota:conductorDetalle.documentos.titulo')}
        acciones={
          <AccionConMotivo motivo={motivo}>
            <Boton
              variante="secundaria"
              tamano="sm"
              iconoIzq={Plus}
              deshabilitado={!puedeGestionar}
              onClick={() => setCargando({ abierto: true })}
            >
              {t('flota:conductorDetalle.documentos.agregar')}
            </Boton>
          </AccionConMotivo>
        }
      >
        {errorDocumentos?.status === 403 ? (
          /*
            FORBIDDEN POR BLOQUE. Se muestra el PERMISO literal, no el `code`: es lo que el usuario le
            tiene que pedir a su admin. El resto de la ficha sigue visible.
          */
          <EstadoVacio
            variante="sin-datos"
            icono={ShieldAlert}
            titulo={t('flota:conductorDetalle.documentos.sinPermisoTitulo')}
            descripcion={t('flota:conductorDetalle.documentos.sinPermisoDescripcion')}
          />
        ) : (
          <TablaDocumentos
            documentos={documentos.data ?? []}
            cargando={documentos.isPending}
            puedeGestionar={puedeGestionar}
            motivoSinPermiso={motivo}
            error={
              errorDocumentos && errorDocumentos.status !== 403 ? (
                <EstadoError
                  variante="recuperable"
                  titulo={t('flota:conductorDetalle.documentos.errorTitulo')}
                  mensaje={resolveApiErrorMessage(errorDocumentos, t)}
                  trazaId={errorDocumentos.traceId ?? undefined}
                  textoReintentar={t('flota:comun.reintentar')}
                  onReintentar={() => void documentos.refetch()}
                />
              ) : undefined
            }
            onEliminar={setAEliminar}
          />
        )}
      </Card>

      <ModalCargarDocumento
        conductorId={conductor.id}
        tipoInicial={cargando.tipo}
        abierto={cargando.abierto}
        onCerrar={() => setCargando({ abierto: false })}
      />

      <DialogoConfirmacion
        abierto={aEliminar !== null}
        onCerrar={() => {
          setAEliminar(null)
          eliminar.reset()
        }}
        onConfirmar={() => {
          if (aEliminar === null) return
          eliminar.mutate(aEliminar.id, { onSuccess: () => setAEliminar(null) })
        }}
        variante="peligro"
        titulo={t('flota:documentoConductor.eliminarTitulo')}
        /*
          ⚠️ EL COPY NO DICE "se elimina el archivo": el `DELETE` **no borra nada** en el destino de
          `urlExterna` — ese storage es de la organizacion, no de Flota. Se elimina el REGISTRO.
        */
        descripcion={
          eliminar.error
            ? resolveApiErrorMessage(parseApiError(eliminar.error), t)
            : [
                t('flota:documentoConductor.eliminarDescripcion', {
                  documento:
                    aEliminar === null
                      ? ''
                      : t(`flota:${claveDeTipoDocumento(aEliminar.tipo)}`, {
                          defaultValue: aEliminar.tipo,
                        }),
                }),
                t('flota:documentoConductor.eliminarNoBorraArchivo'),
              ].join(' ')
        }
        textoConfirmar={t('flota:documentoConductor.eliminarConfirmar')}
        textoCancelar={t('flota:documentoConductor.cancelar')}
        cargando={eliminar.isPending}
      />
    </div>
  )
}

/** "12/03/2027 · en 340 días" / "· venció hace 12 días". Los dias los calcula el backend. */
function Vencimiento({ licencia }: { licencia: NonNullable<ConductorDetalleDto['licencia']> }) {
  const { t, i18n } = useTranslation(['flota', 'common'])

  // `vencimiento` es `DateOnly?`: con `formatearFecha` se corría un día y quedaba contradiciendo al
  // contador de `diasParaVencer`, que lo calcula el backend sobre la fecha real.
  const fecha = formatearFechaSola(licencia.vencimiento, i18n.language)
  const dias = licencia.diasParaVencer

  if (dias === null) return <span>{fecha}</span>

  return (
    <span>
      {fecha}{' '}
      <span className="text-fg-secundario">
        ·{' '}
        {dias < 0
          ? t('flota:conductorDetalle.licencia.vencidaHace', { count: Math.abs(dias) })
          : t('flota:conductorDetalle.licencia.diasParaVencer', { count: dias })}
      </span>
    </span>
  )
}

/**
 * Tabla de documentos. `GET .../documentos` devuelve un **ARRAY PLANO**, no `PagedResult<T>`:
 * `api.md` no declara paginacion para esa fila. Es la unica lectura del modulo exenta de la
 * convencion 3, y lo esta por contrato — por eso acá no hay control de paginacion.
 */
function TablaDocumentos({
  documentos,
  cargando,
  puedeGestionar,
  motivoSinPermiso,
  error,
  onEliminar,
}: {
  documentos: DocumentoDto[]
  cargando: boolean
  puedeGestionar: boolean
  motivoSinPermiso?: string
  error?: ReactNode
  onEliminar: (documento: DocumentoDto) => void
}) {
  const { t, i18n } = useTranslation(['flota', 'common'])

  const columnas: Columna<DocumentoDto>[] = [
    {
      clave: 'documento',
      titulo: t('flota:conductorDetalle.documentos.columnas.documento'),
      tipo: 'texto',
      render: (documento) =>
        t(`flota:${claveDeTipoDocumento(documento.tipo)}`, { defaultValue: documento.tipo }),
    },
    {
      clave: 'numero',
      titulo: t('flota:conductorDetalle.documentos.columnas.numero'),
      tipo: 'mono',
      render: (documento) => documento.numero ?? '',
    },
    {
      clave: 'estado',
      titulo: t('flota:conductorDetalle.documentos.columnas.estado'),
      tipo: 'nodo',
      render: (documento) => (
        <Badge variante={varianteDeEstadoDocumento(documento.estadoDerivado)}>
          {t(`flota:${claveDeEstadoDocumento(documento.estadoDerivado)}`, {
            defaultValue: documento.estadoDerivado,
          })}
        </Badge>
      ),
    },
    {
      clave: 'vencimiento',
      titulo: t('flota:conductorDetalle.documentos.columnas.vencimiento'),
      tipo: 'fecha',
      render: (documento) => formatearFechaSola(documento.fechaVencimiento, i18n.language),
    },
    {
      clave: 'archivo',
      titulo: t('flota:conductorDetalle.documentos.columnas.archivo'),
      tipo: 'nodo',
      render: (documento) =>
        documento.urlExterna === null ? (
          // `null` = metadatos cargados SIN archivo todavia. Es un estado legitimo del contrato, no
          // un dato faltante: se dice, no se deja el guion mudo.
          <span className="text-fg-terciario">
            {t('flota:conductorDetalle.documentos.sinArchivo')}
          </span>
        ) : (
          <a
            href={documento.urlExterna}
            target="_blank"
            rel="noreferrer noopener"
            className="rounded-sm text-marca underline-offset-4 hover:underline"
          >
            {t('flota:conductorDetalle.documentos.verArchivo')}
          </a>
        ),
    },
    {
      clave: 'acciones',
      titulo: t('flota:conductorDetalle.documentos.columnas.acciones'),
      tipo: 'acciones',
      alineacion: 'derecha',
      render: (documento) => (
        <AccionConMotivo motivo={motivoSinPermiso}>
          <Boton
            variante="fantasma"
            tamano="sm"
            deshabilitado={!puedeGestionar}
            onClick={() => onEliminar(documento)}
          >
            {t('flota:conductorDetalle.documentos.eliminar')}
          </Boton>
        </AccionConMotivo>
      ),
    },
  ]

  return (
    <Tabla
      columnas={columnas}
      filas={documentos}
      claveFila={(documento) => documento.id}
      cargando={cargando}
      filasSkeleton={3}
      error={error}
      vacio={
        <EstadoVacio
          variante="sin-datos"
          icono={FileText}
          titulo={t('flota:conductorDetalle.documentos.vacioTitulo')}
          descripcion={t('flota:conductorDetalle.documentos.vacioDescripcion')}
        />
      }
    />
  )
}
