import { Controller, useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useTranslation } from 'react-i18next'
import { AreaTexto } from '@/shared/ui/AreaTexto'
import { Boton } from '@/shared/ui/Boton'
import { Campo } from '@/shared/ui/Campo'
import { GrupoRadio, type OpcionRadio } from '@/shared/ui/GrupoRadio'
import { Modal } from '@/shared/ui/Modal'
import { parseApiError, resolveApiErrorMessage } from '@/shared/errors/parse-api-error'
import { AvisoOperacion } from '../AvisoOperacion'
import { useResolverProblema } from '../../hooks/useResolverProblema'
import {
  claveDeGuiaDeErrorCentro,
  tratamientoDeErrorCentro,
} from '../../vocabulario-centro-problemas'
import {
  aResolverProblemaRequest,
  resolverProblemaSchema,
  type ResolverProblemaFormulario,
} from '../../schemas/resolver-problema'

/**
 * Modal "Resolver problema" — `POST /problemas/{id}/resolver`, permiso
 * `flota.problemas.resolver` (ficha §7.3). Es el cierre **TERMINAL**.
 *
 * ── ES IRREVERSIBLE Y EL COPY NO PUEDE SUGERIR LO CONTRARIO ───────────────────────────────────
 * No hay endpoint de reapertura: el catálogo de transiciones no existe y `POST /problemas/{id}/estado`
 * **no está enrutado**. Después de esto, asignar y silenciar sobre el mismo problema responden 409.
 * Por eso el aviso dice "no hay forma de reabrirlo desde acá" y **no** "se puede deshacer".
 *
 * ── EL TOGGLE DE INTEGRACIÓN NO SE OFRECE ─────────────────────────────────────────────────────
 * `crearEventoCierreIntegracion` existe en el request y el backend **lo acepta sin disparar nada**
 * (DA-IN-08 abierta: no hay mapeo evento-interno ↔ evento-público, y ningún endpoint tiene
 * suscripciones). Un toggle que promete avisarle a un sistema externo y no avisa es peor que no
 * tenerlo; se dice en una línea y el campo viaja **ausente**.
 */
export function ModalResolverProblema({
  problemaId,
  titulo,
  abierto,
  onCerrar,
}: {
  problemaId: string | null
  titulo: string
  abierto: boolean
  onCerrar: () => void
}) {
  if (!abierto || problemaId === null) return null

  return <Formulario problemaId={problemaId} titulo={titulo} onCerrar={onCerrar} />
}

function Formulario({
  problemaId,
  titulo,
  onCerrar,
}: {
  problemaId: string
  titulo: string
  onCerrar: () => void
}) {
  const { t } = useTranslation(['flota', 'common'])
  const mutacion = useResolverProblema(problemaId)

  const form = useForm<ResolverProblemaFormulario>({
    resolver: zodResolver(resolverProblemaSchema),
    defaultValues: { resultado: 'resuelto', evidencia: '' },
  })

  /** Los 2 terminales del catálogo, con su diferencia escrita: cerrar ≠ descartar. */
  const opciones: OpcionRadio[] = [
    {
      valor: 'resuelto',
      etiqueta: t('flota:centro.resolver.resuelto'),
      descripcion: t('flota:centro.resolver.resueltoAyuda'),
    },
    {
      valor: 'descartado',
      etiqueta: t('flota:centro.resolver.descartado'),
      descripcion: t('flota:centro.resolver.descartadoAyuda'),
    },
  ]

  const apiError = mutacion.error ? parseApiError(mutacion.error) : null

  const enviar = form.handleSubmit((valores) => {
    mutacion.mutate(aResolverProblemaRequest(valores), {
      onSuccess: () => {
        mutacion.reset()
        onCerrar()
      },
    })
  })

  const errorEvidencia = form.formState.errors.evidencia?.message
  const mensajeDeEvidencia =
    errorEvidencia === undefined ? undefined : t(errorEvidencia, { defaultValue: errorEvidencia })

  return (
    <Modal
      abierto
      onCerrar={onCerrar}
      cierrePorFuera={false}
      titulo={t('flota:centro.resolver.titulo')}
      descripcion={titulo}
      pie={
        <>
          <Boton variante="secundaria" onClick={onCerrar} deshabilitado={mutacion.isPending}>
            {t('flota:comun.cancelar')}
          </Boton>
          <Boton onClick={() => void enviar()} cargando={mutacion.isPending}>
            {t('flota:centro.resolver.confirmar')}
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
        {apiError === null ? null : (
          <AvisoOperacion
            titulo={resolveApiErrorMessage(apiError, t)}
            mensaje={t(
              `flota:${claveDeGuiaDeErrorCentro(tratamientoDeErrorCentro(apiError.code, apiError.args))}`,
            )}
            trazaId={apiError.traceId}
          />
        )}

        <p className="text-sm text-fg-secundario">{t('flota:centro.resolver.descripcion')}</p>

        <Controller
          control={form.control}
          name="resultado"
          render={({ field }) => (
            <Campo etiqueta={t('flota:centro.resolver.resultado')} requerido>
              {(control) => (
                <GrupoRadio
                  {...control}
                  opciones={opciones}
                  valor={field.value}
                  onCambio={field.onChange}
                />
              )}
            </Campo>
          )}
        />

        <Campo
          etiqueta={t('flota:centro.resolver.evidencia')}
          ayuda={t('flota:centro.resolver.evidenciaAyuda')}
          error={mensajeDeEvidencia}
          requerido
        >
          {(control) => (
            <AreaTexto
              {...control}
              {...form.register('evidencia')}
              filas={4}
              invalido={form.formState.errors.evidencia !== undefined}
            />
          )}
        </Campo>

        <p className="rounded-lg border border-dashed border-borde bg-superficie-2 px-3 py-2 text-xs text-fg-secundario">
          {t('flota:centro.resolver.aclaracion')}
          <br />
          {t('flota:centro.resolver.aclaracionIntegracion')}
        </p>
      </form>
    </Modal>
  )
}
