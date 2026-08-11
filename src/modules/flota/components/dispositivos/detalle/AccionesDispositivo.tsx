import { useTranslation } from 'react-i18next'
import { MoreVertical, Pencil, PackageOpen, RotateCcw, Trash2, Unlink } from 'lucide-react'
import { Boton } from '@/shared/ui/Boton'
import { BotonIcono } from '@/shared/ui/BotonIcono'
import { MenuAcciones, type ItemMenuAcciones } from '@/shared/ui/MenuAcciones'
import type { DispositivoDetalleDto } from '@/services/contracts/flota'
import { AccionConMotivo } from '../../AccionConMotivo'
import { usePermisos } from '../../../hooks/usePermisos'
import { destinosDeStock } from './vocabulario-stock'

/**
 * Acciones del hero: "Editar" + kebab "Mas acciones".
 *
 * ── COMPORTAMIENTO POR VERBO (contrato de permisos, §7 de la ficha) ───────────────────────────
 * `eliminar` y `compartir` se OCULTAN sin permiso; `editar`, `controlar`, `configurar`,
 * `gestionar-stock` y `asignar-*` se DESHABILITAN con su motivo en tooltip. Un boton muerto sin
 * explicacion se reporta como bug; un boton que desaparece sin explicacion, no.
 *
 * ── LO QUE NO ESTA EN EL MENU, Y POR QUE ──────────────────────────────────────────────────────
 *  - **Hacer ping / Reiniciar**: mapean a `POST .../comandos`, que esta BLOQUEADO (B-12).
 *    Telemetria no expone comandos y Flota tiene prohibido llamar a Traccar, asi que el stub
 *    responde SIEMPRE 500 `flota.telemetria.no_disponible`. Un boton cuyo unico resultado posible
 *    es un error no se dibuja — y simular un toast de exito esta explicitamente prohibido.
 *  - **Ver QR de instalacion**: DEROGADO del contrato (**D-S3-23**, 2026-08-11). No es "pospuesto":
 *    `GET .../qr-instalacion` salio de `api.md` y `QrInstalacionDto` nunca existio. La accion salio
 *    tambien de las 3 fichas que la dibujaban. El mockup la sigue mostrando: es referencia UX, no
 *    contrato.
 *  - **Configuracion**: DEROGADA igual (**D-S3-22**). Sus 6 parametros no tienen columna en ningun
 *    lado y configurar un GPS sin poder mandarle el comando (B-12) es una feature a medias.
 *  - **Actualizar firmware / enviar config por OTA**: fase 2.
 *  - **Compartir**: el permiso `flota.dispositivos.compartir` existe pero NO hay endpoint ni flujo
 *    en `api.md`. Dibujar la opcion seria prometer una funcion sin contrato.
 * ─────────────────────────────────────────────────────────────────────────────────────────────
 */
export function AccionesDispositivo({
  dispositivo,
  onEditar,
  onCambiarEstadoStock,
  onDarDeBaja,
  onReactivar,
}: {
  dispositivo: DispositivoDetalleDto
  onEditar: () => void
  onCambiarEstadoStock: () => void
  onDarDeBaja: () => void
  onReactivar: () => void
}) {
  const { t } = useTranslation(['flota', 'common'])
  const { tienePermiso } = usePermisos()

  const motivoSinPermiso = (permiso: string) =>
    t('flota:dispositivoDetalle.acciones.sinPermiso', { permiso })

  const items: ItemMenuAcciones[] = []

  // ── Cambiar estado de stock ────────────────────────────────────────────────────────────────
  // Se apaga por DOS motivos distintos y el tooltip dice cual: falta de permiso, o estado terminal.
  // Desde `dado_de_baja` no hay ningun destino valido en la maquina de estados; ofrecer el modal
  // para que el backend conteste 409 seria hacerle perder el viaje al usuario.
  const puedeGestionarStock = tienePermiso('flota.dispositivos.gestionar-stock')
  const hayDestinos = destinosDeStock(dispositivo.estadoOperativo).length > 0

  items.push({
    clave: 'estado-stock',
    etiqueta: t('flota:dispositivoDetalle.acciones.cambiarEstadoStock'),
    icono: PackageOpen,
    deshabilitado: !puedeGestionarStock || !hayDestinos,
    motivo: !puedeGestionarStock
      ? motivoSinPermiso('flota.dispositivos.gestionar-stock')
      : !hayDestinos
        ? t('flota:dispositivoDetalle.acciones.stockTerminal')
        : undefined,
    onSelect: onCambiarEstadoStock,
  })

  // ── Desasociar del vehiculo ────────────────────────────────────────────────────────────────
  // Solo aparece si HAY vehiculo: "desasociar" un dispositivo que no esta puesto en ningun lado no
  // significa nada. Sigue SIEMPRE deshabilitada, y ya no por falta de superficie —el modal existe
  // desde `f-07`, en la ficha del vehiculo— sino por un HUECO DE CONTRATO REAL:
  // `DELETE /vehiculos/{id}/asignaciones/dispositivo/{asignacionId}` necesita un `asignacionId` que
  // NINGUN campo de `DispositivoDetalleDto` expone (`historialAsignaciones[]` trae vehiculo, patente
  // y fechas, no el id) y su unica fuente es la respuesta del `POST` (**D-S3-16**). Desde ESTA
  // pantalla la llamada es inconstruible; el motivo manda a donde si se puede.
  if (dispositivo.vehiculoInstalado !== null) {
    const puedeAsignar = tienePermiso('flota.vehiculos.asignar-dispositivo')

    items.push({
      clave: 'desasociar',
      etiqueta: t('flota:dispositivoDetalle.acciones.desasociar'),
      icono: Unlink,
      deshabilitado: true,
      motivo: puedeAsignar
        ? t('flota:dispositivoDetalle.acciones.desasociarNoDisponible')
        : motivoSinPermiso('flota.vehiculos.asignar-dispositivo'),
    })
  }

  // ── Reactivar ──────────────────────────────────────────────────────────────────────────────
  // Solo con el dispositivo dado de baja. Es lo que hace que la baja NO sea irreversible, y por eso
  // el copy del dialogo de baja no promete lo contrario.
  if (!dispositivo.activo) {
    const puedeEditar = tienePermiso('flota.dispositivos.editar')

    items.push({
      clave: 'reactivar',
      etiqueta: t('flota:dispositivoDetalle.acciones.reactivar'),
      icono: RotateCcw,
      deshabilitado: !puedeEditar,
      motivo: puedeEditar ? undefined : motivoSinPermiso('flota.dispositivos.editar'),
      onSelect: onReactivar,
    })
  }

  // ── Dar de baja ────────────────────────────────────────────────────────────────────────────
  // OCULTA sin permiso (default del verbo `eliminar`), y oculta tambien si ya esta de baja: en ese
  // caso el lugar de esa fila lo ocupa "Reactivar".
  if (dispositivo.activo && tienePermiso('flota.dispositivos.eliminar')) {
    items.push({
      clave: 'baja',
      etiqueta: t('flota:dispositivoDetalle.acciones.darDeBaja'),
      icono: Trash2,
      tono: 'peligro',
      separadorAntes: true,
      onSelect: onDarDeBaja,
    })
  }

  const puedeEditar = tienePermiso('flota.dispositivos.editar')

  return (
    <div className="flex shrink-0 items-center gap-2">
      <AccionConMotivo
        motivo={puedeEditar ? undefined : motivoSinPermiso('flota.dispositivos.editar')}
      >
        <Boton
          variante="superficie"
          tamano="sm"
          iconoIzq={Pencil}
          deshabilitado={!puedeEditar}
          onClick={onEditar}
        >
          {t('flota:dispositivoDetalle.acciones.editar')}
        </Boton>
      </AccionConMotivo>

      <MenuAcciones
        disparador={
          <BotonIcono
            icono={MoreVertical}
            etiqueta={t('flota:dispositivoDetalle.acciones.masAcciones')}
            variante="superficie"
            tamano="sm"
          />
        }
        items={items}
      />
    </div>
  )
}
