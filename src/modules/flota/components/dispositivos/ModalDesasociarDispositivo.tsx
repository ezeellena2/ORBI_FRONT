import { Controller, useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useTranslation } from 'react-i18next'
import { useQueryClient } from '@tanstack/react-query'
import { Boton } from '@/shared/ui/Boton'
import { Campo } from '@/shared/ui/Campo'
import { Modal } from '@/shared/ui/Modal'
import { Select, type OpcionSelect } from '@/shared/ui/Select'
import { flotaKeysAfectadasPorAsignacion } from '../../query-keys'
import { useDesasignarDispositivo } from '../../hooks/useDesasignarDispositivo'
import {
  aDesasignarDispositivoRequest,
  desasignarDispositivoSchema,
  VALORES_INICIALES_DESASIGNAR,
  type DesasignarDispositivoFormulario,
} from '../../schemas/asignar-dispositivo'
import { AvisoErrorAsignacion } from './AvisoErrorAsignacion'
import { claveDeMotivoCierre, MOTIVOS_CIERRE_MANUAL } from './vocabulario-asignacion'

/**
 * Modal "Desasociar dispositivo" —
 * `DELETE /api/flota/vehiculos/{id}/asignaciones/dispositivo/{asignacionId}`, mismo permiso que
 * asociar (`flota.vehiculos.asignar-dispositivo`).
 *
 * ── EL `asignacionId` ES UN HUECO REAL DEL CONTRATO, NO UN PARAMETRO MAS ──────────────────────
 * Este modal solo se puede abrir cuando el caller TIENE el id, y su unica fuente es la respuesta del
 * `POST` de asignacion (D-S3-16): `GET /vehiculos/{id}/asignaciones` no esta implementado y ni
 * `VehiculoDetalleDto.dispositivo` ni `DispositivoDetalleDto.historialAsignaciones` lo exponen. Quien
 * abre esta pantalla despues de recargar no lo tiene, y ahi la accion se muestra deshabilitada con
 * ese motivo — no se inventa un id ni se llama a una ruta que va a dar 404.
 *
 * ── EL MOTIVO NO ES TEXTO LIBRE ───────────────────────────────────────────────────────────────
 * Escribe `motivo_cierre`, FK al catalogo `motivos_cierre_asignacion_flota`. El select ofrece 3 de
 * los 4 codigos: `reasignacion` queda fuera porque lo escribe el backend solo cuando el cierre lo
 * causa un reemplazo (ver `vocabulario-asignacion.ts`).
 *
 * ── EL CORTE CANONICO TAMBIEN PUEDE FALLAR ────────────────────────────────────────────────────
 * El `DELETE` corta la correlacion en PlataformaCanonica antes de cerrar la vigencia. Si el corte no
 * llega a destino responde 500 `flota.dispositivo.canonico_no_coordinable` y **no queda nada
 * escrito**: el GPS sigue instalado y sigue atribuyendo posiciones a este vehiculo. `AvisoErrorAsignacion`
 * lo dice y ofrece reintentar.
 */
export function ModalDesasociarDispositivo({
  vehiculoFlotaId,
  asignacionId,
  identificacionDispositivo,
  abierto,
  onCerrar,
  onDesasignado,
}: {
  vehiculoFlotaId: string
  asignacionId: string
  /** Alias o IMEI del equipo que se saca, ya resuelto. */
  identificacionDispositivo: string
  abierto: boolean
  onCerrar: () => void
  onDesasignado: () => void
}) {
  if (!abierto) return null

  return (
    <Formulario
      vehiculoFlotaId={vehiculoFlotaId}
      asignacionId={asignacionId}
      identificacionDispositivo={identificacionDispositivo}
      onCerrar={onCerrar}
      onDesasignado={onDesasignado}
    />
  )
}

function Formulario({
  vehiculoFlotaId,
  asignacionId,
  identificacionDispositivo,
  onCerrar,
  onDesasignado,
}: {
  vehiculoFlotaId: string
  asignacionId: string
  identificacionDispositivo: string
  onCerrar: () => void
  onDesasignado: () => void
}) {
  const { t } = useTranslation(['flota', 'common'])
  const queryClient = useQueryClient()
  const mutacion = useDesasignarDispositivo(vehiculoFlotaId)

  const form = useForm<DesasignarDispositivoFormulario>({
    resolver: zodResolver(desasignarDispositivoSchema),
    defaultValues: VALORES_INICIALES_DESASIGNAR,
  })

  const opciones: OpcionSelect[] = MOTIVOS_CIERRE_MANUAL.map((motivo) => ({
    valor: motivo,
    etiqueta: t(`flota:${claveDeMotivoCierre(motivo)}`),
  }))

  const enviar = form.handleSubmit((valores) => {
    mutacion.mutate(
      { asignacionId, ...aDesasignarDispositivoRequest(valores) },
      {
        onSuccess: () => {
          mutacion.reset()
          onDesasignado()
          onCerrar()
        },
      },
    )
  })

  const actualizar = () => {
    for (const key of flotaKeysAfectadasPorAsignacion()) {
      void queryClient.invalidateQueries({ queryKey: key })
    }
    mutacion.reset()
  }

  return (
    <Modal
      abierto
      onCerrar={onCerrar}
      cierrePorFuera={false}
      titulo={t('flota:asignacionDispositivo.desasignarTitulo')}
      descripcion={identificacionDispositivo}
      pie={
        <>
          <Boton variante="secundaria" onClick={onCerrar} deshabilitado={mutacion.isPending}>
            {t('flota:asignacionDispositivo.cancelar')}
          </Boton>
          <Boton variante="peligro" onClick={() => void enviar()} cargando={mutacion.isPending}>
            {mutacion.isPending
              ? t('flota:asignacionDispositivo.desasignando')
              : t('flota:asignacionDispositivo.desasignar')}
          </Boton>
        </>
      }
    >
      <form
        className="flex flex-col gap-4"
        onSubmit={(evento) => {
          evento.preventDefault()
          void enviar()
        }}
      >
        {mutacion.error ? (
          <AvisoErrorAsignacion
            error={mutacion.error}
            onReintentar={() => void enviar()}
            onActualizar={actualizar}
          />
        ) : null}

        <p className="text-sm text-fg-secundario">
          {t('flota:asignacionDispositivo.desasignarDescripcion')}
        </p>

        <Controller
          control={form.control}
          name="motivo"
          render={({ field }) => (
            <Campo
              etiqueta={t('flota:asignacionDispositivo.motivo')}
              ayuda={t('flota:asignacionDispositivo.motivoAyuda')}
              requerido
            >
              {/*
                `Select` no acepta el `control` entero (no declara `required` ni `aria-invalid`:
                tiene su propia prop `invalido`), asi que se cablea campo por campo — mismo patron
                que `CampoSelectCatalogo`.
              */}
              {(control) => (
                <Select
                  id={control.id}
                  aria-describedby={control['aria-describedby']}
                  opciones={opciones}
                  valor={field.value}
                  onCambio={field.onChange}
                  deshabilitado={mutacion.isPending}
                />
              )}
            </Campo>
          )}
        />
      </form>
    </Modal>
  )
}
