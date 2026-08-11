import { useTranslation } from 'react-i18next'
import { Info } from 'lucide-react'
import { Icono } from '@/shared/ui/Icono'

/**
 * Aviso de "vaciar este campo no lo borra", para los dos formularios de edición de Flota.
 *
 * ── POR QUE EXISTE ────────────────────────────────────────────────────────────────────────────
 * Ni el `PATCH` de vehículo ni el de dispositivo pueden BORRAR un campo. `System.Text.Json` no
 * distingue "propiedad ausente" de "propiedad en null", así que el backend resuelve la ambigüedad
 * PRESERVANDO el valor anterior (`request.X ?? entidad.X`), y del lado del cliente `JSON.stringify`
 * ni siquiera manda las propiedades `undefined`. Resultado para el usuario: borra las notas, guarda,
 * el modal cierra en verde… y las notas siguen ahí. Sin un solo mensaje.
 *
 * El helper que iba a avisarlo (`camposQueNoSePuedenBorrar`, en `schemas/editar-vehiculo.ts`) estaba
 * escrito, exportado y documentado con esta misma explicación — y no lo consumía NADIE. El aviso que
 * prometía el comentario nunca llegó a la pantalla.
 *
 * No es un error de validación y por eso no bloquea el submit ni se pinta como `AvisoOperacion`
 * (rojo): el resto de los cambios del formulario SÍ se van a guardar. Es una advertencia sobre una
 * parte de la intención que el backend todavía no puede expresar.
 *
 * Se levanta cuando el borrado explícito exista en el contrato (`Optional<T>` o JSON Merge Patch).
 * Es PENDIENTE del PO, y es UNO SOLO para los dos módulos: no hay ninguna asimetría entre campos de
 * texto y selects de catálogo — los cinco se comportan igual.
 */
export function AvisoCamposNoBorrables({ campos }: { campos: string[] }) {
  const { t } = useTranslation(['flota', 'common'])

  if (campos.length === 0) return null

  return (
    <p className="flex items-start gap-2 rounded-lg border border-advertencia/40 bg-advertencia-fondo px-3 py-2 text-xs text-fg-secundario">
      <Icono icono={Info} tamano="sm" />
      <span>
        {t('flota:comun.noSePuedeBorrar', {
          campos: campos.join(t('flota:comun.separadorLista')),
        })}
      </span>
    </p>
  )
}
