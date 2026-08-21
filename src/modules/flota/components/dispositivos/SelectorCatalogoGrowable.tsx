import { useState } from 'react'
import { useForm, type FieldError } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useTranslation } from 'react-i18next'
import { Plus } from 'lucide-react'
import { Boton } from '@/shared/ui/Boton'
import { Campo } from '@/shared/ui/Campo'
import { Input } from '@/shared/ui/Input'
import { Select } from '@/shared/ui/Select'
import type { CatalogoGrowableItemDto } from '@/services/contracts/flota'
import { AccionConMotivo } from '../AccionConMotivo'
import { Aviso } from '@/shared/ui/Aviso'
import {
  crearItemCatalogoSchema,
  VALORES_INICIALES_ITEM_CATALOGO,
  type CrearItemCatalogoFormulario,
} from '../../schemas/crear-item-catalogo'

/**
 * Select de un catalogo GROWABLE de dispositivo (modelos de GPS / proveedores de SIM) con su alta
 * en linea. Presentacional: no conoce endpoints ni hooks — los cablea quien lo usa.
 *
 * ── POR QUE EXISTE ────────────────────────────────────────────────────────────────────────────
 * `modeloId` y `proveedorSimId` viajan como **uuid del catalogo**, nunca como texto libre (B-18):
 * hardcodear las opciones esta explicitamente prohibido (DA-DD-02 / DA-DL-03). Y los dos catalogos
 * son "global + por-org": una organizacion que no encuentra su modelo tiene que poder sumarlo sin
 * salir del formulario, o el alta se traba contra un catalogo que ella misma puede completar.
 *
 * ── EL CATALOGO VACIO NO ES UN ERROR ──────────────────────────────────────────────────────────
 * Un array vacio es una respuesta correcta. El select muestra su estado sin-opciones **con la
 * accion de agregar al lado**, no un control muerto. Y el alta de dispositivo NO se bloquea por
 * esto: `modeloId` es OPCIONAL desde D-S3-5 — justamente porque exigirlo con el catalogo vacio
 * dejaba toda alta en 404 `flota.dispositivo.modelo_no_existe`.
 *
 * ── LO QUE NO SE DIBUJA ───────────────────────────────────────────────────────────────────────
 * No hay editar ni eliminar una fila propia: `api.md` no declara `PATCH` ni `DELETE` y el catalogo
 * de 44 permisos esta cerrado (**B-13**, del PO). Se avisa antes de agregar en vez de ofrecer un
 * control que devolveria 404 de routing.
 *
 * El alta va en un panel EN LINEA y no en un modal anidado: este selector vive dentro del modal de
 * alta/edicion de dispositivo, y un dialogo sobre otro dialogo pelea por la trampa de foco.
 */

export interface TextosSelectorCatalogo {
  etiqueta: string
  ayuda?: string
  placeholder: string
  sinOpciones: string
  agregar: string
  tituloNuevo: string
  descripcionNuevo: string
  nombre: string
  fabricante?: string
}

export interface SelectorCatalogoGrowableProps {
  /** Ya resueltos por i18n. */
  textos: TextosSelectorCatalogo
  items: CatalogoGrowableItemDto[] | undefined
  cargando: boolean
  /** Ya resuelto desde `message_key`; `null` = la carga anduvo. */
  mensajeErrorCarga: string | null
  onReintentar: () => void
  /** `''` = sin eleccion. El campo es opcional en los dos requests. */
  valor: string
  onCambio: (valor: string) => void
  /** `modelos_dispositivo_flota` lo tiene; `proveedores_sim_flota` no tiene la columna. */
  conFabricante: boolean
  /** `flota.dispositivos.crear` — verbo `crear`: sin permiso se DESHABILITA con tooltip. */
  puedeCrear: boolean
  crear: (
    valores: CrearItemCatalogoFormulario,
    onExito: (item: CatalogoGrowableItemDto) => void,
  ) => void
  creando: boolean
  /** Ya resuelto desde `message_key` (tipico: 409 `flota.catalogo.nombre_duplicado`). */
  mensajeErrorCrear: string | null
}

export function SelectorCatalogoGrowable({
  textos,
  items,
  cargando,
  mensajeErrorCarga,
  onReintentar,
  valor,
  onCambio,
  conFabricante,
  puedeCrear,
  crear,
  creando,
  mensajeErrorCrear,
}: SelectorCatalogoGrowableProps) {
  const { t } = useTranslation(['flota', 'common'])
  const [altaAbierta, setAltaAbierta] = useState(false)

  if (mensajeErrorCarga !== null) {
    return (
      <Aviso
        titulo={t('flota:catalogoDispositivo.error')}
        mensaje={mensajeErrorCarga}
        accion={
          <Boton variante="secundaria" tamano="sm" onClick={onReintentar}>
            {t('flota:catalogoDispositivo.reintentar')}
          </Boton>
        }
      />
    )
  }

  const opciones = (items ?? []).map((item) => ({
    valor: item.id,
    // El sufijo distingue una fila de plataforma de una propia. Importa porque un homonimo global
    // es LEGAL (B-14) y sin la marca el usuario ve dos entradas identicas.
    etiqueta: item.esGlobal
      ? item.nombre
      : t('flota:catalogoDispositivo.etiquetaPropia', { nombre: item.nombre }),
  }))

  return (
    <div className="flex flex-col gap-2">
      <Campo etiqueta={textos.etiqueta} ayuda={textos.ayuda}>
        {(control) => (
          <div className="flex items-start gap-2">
            <Select
              id={control.id}
              className="flex-1"
              opciones={opciones}
              valor={valor === '' ? undefined : valor}
              onCambio={onCambio}
              cargando={cargando}
              placeholder={textos.placeholder}
              textoSinOpciones={textos.sinOpciones}
              textoCargando={t('flota:catalogoDispositivo.cargando')}
            />
            <BotonAgregar
              etiqueta={textos.agregar}
              puedeCrear={puedeCrear}
              abierta={altaAbierta}
              onAbrir={() => setAltaAbierta(true)}
            />
          </div>
        )}
      </Campo>

      {altaAbierta ? (
        <PanelAltaCatalogo
          textos={textos}
          conFabricante={conFabricante}
          crear={crear}
          creando={creando}
          mensajeErrorCrear={mensajeErrorCrear}
          onCreado={(item) => {
            onCambio(item.id)
            setAltaAbierta(false)
          }}
          onCancelar={() => setAltaAbierta(false)}
        />
      ) : null}
    </div>
  )
}

function BotonAgregar({
  etiqueta,
  puedeCrear,
  abierta,
  onAbrir,
}: {
  etiqueta: string
  puedeCrear: boolean
  abierta: boolean
  onAbrir: () => void
}) {
  const { t } = useTranslation(['flota', 'common'])

  // Verbo `crear` = deshabilitado + tooltip (permisos.md §Comportamiento UX por verbo). No se
  // esconde: el usuario tiene que poder pedirle el permiso a su admin, y para eso necesita verlo.
  const motivo = puedeCrear
    ? undefined
    : t('flota:catalogoDispositivo.sinPermisoCrear', { permiso: 'flota.dispositivos.crear' })

  return (
    <AccionConMotivo motivo={motivo}>
      <Boton
        variante="secundaria"
        iconoIzq={Plus}
        deshabilitado={!puedeCrear || abierta}
        onClick={onAbrir}
      >
        {etiqueta}
      </Boton>
    </AccionConMotivo>
  )
}

/**
 * Alta en linea de una fila propia de la organizacion.
 *
 * No es un `<form>`: este panel vive DENTRO del `<form>` del modal de dispositivo y anidar
 * formularios es HTML invalido (el submit de adentro dispara el de afuera). React Hook Form no
 * necesita el elemento — se valida llamando a `handleSubmit` desde el boton.
 */
function PanelAltaCatalogo({
  textos,
  conFabricante,
  crear,
  creando,
  mensajeErrorCrear,
  onCreado,
  onCancelar,
}: {
  textos: TextosSelectorCatalogo
  conFabricante: boolean
  crear: SelectorCatalogoGrowableProps['crear']
  creando: boolean
  mensajeErrorCrear: string | null
  onCreado: (item: CatalogoGrowableItemDto) => void
  onCancelar: () => void
}) {
  const { t } = useTranslation(['flota', 'common'])

  const form = useForm<CrearItemCatalogoFormulario>({
    resolver: zodResolver(crearItemCatalogoSchema),
    defaultValues: VALORES_INICIALES_ITEM_CATALOGO,
  })

  // Los mensajes de Zod son CLAVES i18n (`validation.nombre.required`), las mismas que el
  // `WithErrorCode` del validator backend: el usuario lee el mismo texto venga de donde venga.
  const mensajeDe = (error: FieldError | undefined) =>
    error?.message ? t(error.message, { defaultValue: error.message }) : undefined

  const confirmar = form.handleSubmit((valores) => crear(valores, onCreado))

  return (
    <div className="flex flex-col gap-3 rounded-lg border border-dashed border-borde bg-superficie-2 p-3">
      <div className="flex flex-col gap-0.5">
        <p className="text-sm font-medium text-fg-primario">{textos.tituloNuevo}</p>
        <p className="text-xs text-fg-secundario">{textos.descripcionNuevo}</p>
      </div>

      {mensajeErrorCrear ? <Aviso titulo={mensajeErrorCrear} /> : null}

      <Campo etiqueta={textos.nombre} error={mensajeDe(form.formState.errors.nombre)} requerido>
        {(control) => (
          <Input
            {...control}
            {...form.register('nombre')}
            invalido={form.formState.errors.nombre !== undefined}
          />
        )}
      </Campo>

      {conFabricante && textos.fabricante !== undefined ? (
        <Campo
          etiqueta={textos.fabricante}
          ayuda={t('flota:catalogoDispositivo.fabricanteAyuda')}
          error={mensajeDe(form.formState.errors.fabricante)}
        >
          {(control) => <Input {...control} {...form.register('fabricante')} />}
        </Campo>
      ) : null}

      {/*
        No hay editar ni eliminar una fila del catalogo (B-13): un nombre mal tipeado convive con la
        organizacion para siempre y sigue apareciendo en el select. Se avisa ANTES, que es lo unico
        que la UI puede hacer al respecto.
      */}
      <p className="text-xs text-fg-terciario">{t('flota:catalogoDispositivo.noSeEdita')}</p>

      <div className="flex justify-end gap-2">
        <Boton variante="secundaria" tamano="sm" onClick={onCancelar} deshabilitado={creando}>
          {t('flota:catalogoDispositivo.cancelar')}
        </Boton>
        <Boton tamano="sm" onClick={() => void confirmar()} cargando={creando}>
          {t('flota:catalogoDispositivo.guardar')}
        </Boton>
      </div>
    </div>
  )
}
