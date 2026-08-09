import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Route } from 'lucide-react'
import { Campo } from '@/shared/ui/Campo'
import { EstadoError } from '@/shared/ui/EstadoError'
import { EstadoVacio } from '@/shared/ui/EstadoVacio'
import { Select } from '@/shared/ui/Select'
import { Skeleton } from '@/shared/ui/Skeleton'
import { Tabla } from '@/shared/ui/Tabla'
import type { Columna } from '@/shared/ui/Columna'
import { parseApiError } from '@/shared/errors/parse-api-error'
import type { RecorridoDto, RecorridosQuery } from '@/services/contracts/flota'
import { useRecorridosVehiculo } from '../../hooks/useRecorridosVehiculo'
import { formatearFechaHora, formatearNumero } from './formato'

/**
 * Tab Historial (recorridos) — superficie ⚠ DEGRADADA.
 *
 * HOY EL ENDPOINT RESPONDE SIEMPRE 500 con `code: flota.telemetria.no_disponible`. Este tab
 * discrimina POR EL `code`, nunca por el status: en Flota no existe el 503, y un 500 genérico
 * (una excepción de verdad) no significa lo mismo que "no hay fuente upstream". Por eso hay dos
 * ramas de error distintas.
 *
 * Lo que NUNCA se hace acá: mostrar una tabla vacía. "No hay recorridos" y "no existe la fuente de
 * recorridos" son dos afirmaciones distintas, y solo una de las dos es verdad hoy.
 *
 * "Ver historial completo →" y "Exportar" del mockup no se implementan: no tienen destino ni
 * endpoint (DA-VD-07 residual), y dependen del mismo pedido upstream a Telemetría.
 */

type Periodo = '7d' | '30d' | 'mes'

/**
 * El select traduce el período a los query params `desde`/`hasta` del endpoint.
 *
 * El rango se TRUNCA AL DÍA a propósito. La versión anterior sellaba `hasta` con
 * `new Date().toISOString()` —con milisegundos— y se recalculaba en cada render: como el rango
 * entra en la query key de React Query, cada render producía una key distinta, o sea una query
 * nueva, o sea un fetch nuevo, que provocaba otro render. Bucle infinito de requests mientras el
 * tab estuviera abierto, sin techo (`retry: false` no lo frena: no son reintentos, son queries
 * distintas) y acumulando una entrada de caché por vuelta.
 *
 * Con el truncado a día la key es estable durante toda la sesión, que es lo que corresponde para un
 * filtro cuya granularidad es de días.
 */
function aRango(periodo: Periodo): RecorridosQuery {
  const ahora = new Date()
  const finDelDia = new Date(ahora.getFullYear(), ahora.getMonth(), ahora.getDate(), 23, 59, 59)

  if (periodo === 'mes') {
    const inicio = new Date(ahora.getFullYear(), ahora.getMonth(), 1)
    return { desde: inicio.toISOString(), hasta: finDelDia.toISOString() }
  }

  const dias = periodo === '7d' ? 7 : 30
  const inicio = new Date(ahora.getFullYear(), ahora.getMonth(), ahora.getDate() - dias)
  return { desde: inicio.toISOString(), hasta: finDelDia.toISOString() }
}

export function TabHistorial({ vehiculoFlotaId }: { vehiculoFlotaId: string }) {
  const { t, i18n } = useTranslation(['flota', 'common'])
  const [periodo, setPeriodo] = useState<Periodo>('7d')

  // Sin useMemo a propósito (regla del repo: el memo es del compilador, no nuestro). No hace falta:
  // el rango truncado a día es VALOR-estable, y React Query hashea la key por valor, no por
  // identidad de objeto. Recrear el objeto en cada render es irrelevante mientras su contenido no
  // cambie — que es exactamente lo que el truncado garantiza.
  const consulta = useRecorridosVehiculo(vehiculoFlotaId, aRango(periodo))

  const columnas: Columna<RecorridoDto>[] = [
    {
      clave: 'inicio',
      titulo: t('flota:detalle.historial.columnas.inicio'),
      tipo: 'fecha',
      render: (fila) => formatearFechaHora(fila.inicioUtc, i18n.language),
    },
    {
      clave: 'fin',
      titulo: t('flota:detalle.historial.columnas.fin'),
      tipo: 'fecha',
      render: (fila) => formatearFechaHora(fila.finUtc, i18n.language),
    },
    {
      clave: 'duracion',
      titulo: t('flota:detalle.historial.columnas.duracion'),
      tipo: 'numero',
      render: (fila) =>
        t('flota:detalle.historial.minutos', {
          valor: formatearNumero(fila.duracionMin, i18n.language),
        }),
    },
    {
      clave: 'distancia',
      titulo: t('flota:detalle.historial.columnas.distancia'),
      tipo: 'numero',
      render: (fila) => formatearNumero(fila.distanciaKm, i18n.language),
    },
    {
      clave: 'velocidadMax',
      titulo: t('flota:detalle.historial.columnas.velocidadMax'),
      tipo: 'numero',
      render: (fila) => formatearNumero(fila.velocidadMaxKmh, i18n.language),
    },
    {
      clave: 'paradas',
      titulo: t('flota:detalle.historial.columnas.paradas'),
      tipo: 'numero',
      render: (fila) => formatearNumero(fila.paradasCount, i18n.language),
    },
  ]

  const opcionesPeriodo = [
    { valor: '7d', etiqueta: t('flota:detalle.historial.periodo.ultimos7') },
    { valor: '30d', etiqueta: t('flota:detalle.historial.periodo.ultimos30') },
    { valor: 'mes', etiqueta: t('flota:detalle.historial.periodo.esteMes') },
  ]

  return (
    <div className="flex flex-col gap-4">
      <div className="max-w-56">
        <Campo etiqueta={t('flota:detalle.historial.periodo.etiqueta')}>
          {(control) => (
            <Select
              id={control.id}
              opciones={opcionesPeriodo}
              valor={periodo}
              onCambio={(valor) => setPeriodo(valor as Periodo)}
            />
          )}
        </Campo>
      </div>

      <CuerpoHistorial consulta={consulta} columnas={columnas} />
    </div>
  )
}

function CuerpoHistorial({
  consulta,
  columnas,
}: {
  consulta: ReturnType<typeof useRecorridosVehiculo>
  columnas: Columna<RecorridoDto>[]
}) {
  const { t } = useTranslation(['flota', 'common'])

  if (consulta.isPending) {
    return <Skeleton variante="fila-tabla" repetir={4} />
  }

  if (consulta.isError) {
    const apiError = parseApiError(consulta.error)

    // La rama que importa: la superficie entera no tiene fuente upstream. Es BLOQUEANTE, no
    // recuperable — no hay nada que reintentar hasta que Telemetría persista el histórico.
    if (apiError.code === 'flota.telemetria.no_disponible') {
      return (
        <EstadoError
          variante="bloqueante"
          titulo={t('flota:detalle.historial.degradadoTitulo')}
          mensaje={t('flota:detalle.historial.degradadoDescripcion')}
          trazaId={apiError.traceId ?? undefined}
        />
      )
    }

    return (
      <EstadoError
        titulo={t('flota:detalle.historial.errorTitulo')}
        mensaje={t('flota:detalle.historial.errorDescripcion')}
        trazaId={apiError.traceId ?? undefined}
        textoReintentar={t('flota:comun.reintentar')}
        onReintentar={() => void consulta.refetch()}
      />
    )
  }

  return (
    <Tabla
      columnas={columnas}
      filas={consulta.data.items}
      claveFila={(fila) => fila.recorridoId}
      vacio={
        <EstadoVacio
          variante="sin-resultados"
          icono={Route}
          titulo={t('flota:detalle.historial.vacioTitulo')}
          descripcion={t('flota:detalle.historial.vacioDescripcion')}
        />
      }
    />
  )
}
