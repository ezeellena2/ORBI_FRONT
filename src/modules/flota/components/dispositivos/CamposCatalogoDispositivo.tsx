import { useTranslation } from 'react-i18next'
import { parseApiError, resolveApiErrorMessage } from '@/shared/errors/parse-api-error'
import { SelectorCatalogoGrowable } from './SelectorCatalogoGrowable'
import { useCrearModeloDispositivo } from '../../hooks/useCrearModeloDispositivo'
import { useCrearProveedorSim } from '../../hooks/useCrearProveedorSim'
import { useModelosDispositivo } from '../../hooks/useModelosDispositivo'
import { usePermisos } from '@/shared/auth/permissions/usePermisos'
import { useProveedoresSim } from '../../hooks/useProveedoresSim'
import {
  aCrearModeloDispositivoRequest,
  aCrearProveedorSimRequest,
} from '../../schemas/crear-item-catalogo'

/**
 * Los dos campos de catalogo growable del dispositivo, ya cableados a sus endpoints.
 *
 * Son la FUENTE de `modeloId` y `proveedorSimId`: el valor que viaja al backend es el **uuid** de
 * la fila del catalogo, jamas un nombre (B-18), y las opciones nunca se hardcodean
 * (DA-DD-02 / DA-DL-03). Los usan el alta y la edicion, asi que el cableado vive una sola vez.
 *
 * `flota.dispositivos.crear` es el permiso del alta de una fila propia — no existe
 * `flota.catalogos.*` y el catalogo de 44 permisos esta cerrado (criterio P-F: un catalogo se gatea
 * con el permiso del recurso al que alimenta).
 */

export interface CampoCatalogoProps {
  /** `''` = sin eleccion. Los dos campos son OPCIONALES en el request. */
  valor: string
  onCambio: (valor: string) => void
  /**
   * Texto de ayuda, ya resuelto por i18n. Por defecto dice que el campo es opcional, que es la
   * verdad EN EL ALTA. La EDICION lo sobreescribe: ahi lo que el usuario necesita saber no es que
   * sea opcional, sino que vaciarlo NO desvincula lo que ya estaba guardado (el backend preserva el
   * valor anterior). Sin esa distincion el modal cierra en verde y el dato no cambio.
   */
  ayuda?: string
}

export function CampoModeloDispositivo({ valor, onCambio, ayuda }: CampoCatalogoProps) {
  const { t } = useTranslation(['flota', 'common'])
  const { tienePermiso } = usePermisos()
  const consulta = useModelosDispositivo()
  const mutacion = useCrearModeloDispositivo()

  return (
    <SelectorCatalogoGrowable
      textos={{
        etiqueta: t('flota:catalogoDispositivo.modelo'),
        ayuda: ayuda ?? t('flota:catalogoDispositivo.opcional'),
        placeholder: t('flota:catalogoDispositivo.modeloPlaceholder'),
        sinOpciones: t('flota:catalogoDispositivo.modeloSinOpciones'),
        agregar: t('flota:catalogoDispositivo.modeloAgregar'),
        tituloNuevo: t('flota:catalogoDispositivo.nuevoModeloTitulo'),
        descripcionNuevo: t('flota:catalogoDispositivo.nuevoModeloDescripcion'),
        nombre: t('flota:catalogoDispositivo.nombre'),
        fabricante: t('flota:catalogoDispositivo.fabricante'),
      }}
      items={consulta.data}
      cargando={consulta.isPending}
      mensajeErrorCarga={
        consulta.error ? resolveApiErrorMessage(parseApiError(consulta.error), t) : null
      }
      onReintentar={() => void consulta.refetch()}
      valor={valor}
      onCambio={onCambio}
      conFabricante
      puedeCrear={tienePermiso('flota.dispositivos.crear')}
      crear={(valores, onExito) =>
        mutacion.mutate(aCrearModeloDispositivoRequest(valores), { onSuccess: onExito })
      }
      creando={mutacion.isPending}
      mensajeErrorCrear={
        mutacion.error ? resolveApiErrorMessage(parseApiError(mutacion.error), t) : null
      }
    />
  )
}

/** Gemelo del anterior SIN `fabricante`: `proveedores_sim_flota` no tiene esa columna. */
export function CampoProveedorSim({ valor, onCambio, ayuda }: CampoCatalogoProps) {
  const { t } = useTranslation(['flota', 'common'])
  const { tienePermiso } = usePermisos()
  const consulta = useProveedoresSim()
  const mutacion = useCrearProveedorSim()

  return (
    <SelectorCatalogoGrowable
      textos={{
        etiqueta: t('flota:catalogoDispositivo.proveedorSim'),
        ayuda: ayuda ?? t('flota:catalogoDispositivo.opcional'),
        placeholder: t('flota:catalogoDispositivo.proveedorSimPlaceholder'),
        sinOpciones: t('flota:catalogoDispositivo.proveedorSimSinOpciones'),
        agregar: t('flota:catalogoDispositivo.proveedorSimAgregar'),
        tituloNuevo: t('flota:catalogoDispositivo.nuevoProveedorTitulo'),
        descripcionNuevo: t('flota:catalogoDispositivo.nuevoProveedorDescripcion'),
        nombre: t('flota:catalogoDispositivo.nombre'),
      }}
      items={consulta.data}
      cargando={consulta.isPending}
      mensajeErrorCarga={
        consulta.error ? resolveApiErrorMessage(parseApiError(consulta.error), t) : null
      }
      onReintentar={() => void consulta.refetch()}
      valor={valor}
      onCambio={onCambio}
      conFabricante={false}
      puedeCrear={tienePermiso('flota.dispositivos.crear')}
      crear={(valores, onExito) =>
        mutacion.mutate(aCrearProveedorSimRequest(valores), { onSuccess: onExito })
      }
      creando={mutacion.isPending}
      mensajeErrorCrear={
        mutacion.error ? resolveApiErrorMessage(parseApiError(mutacion.error), t) : null
      }
    />
  )
}
