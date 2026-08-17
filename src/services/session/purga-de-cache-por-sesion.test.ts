import { QueryClient } from '@tanstack/react-query'
import { afterEach, describe, expect, it } from 'vitest'
import {
  identidadDeSesion,
  suscribirPurgaDeCachePorSesion,
} from './purga-de-cache-por-sesion'
import { useSessionStore } from '@/stores/session-store'
import type { AuthResponse } from '@/services/contracts/auth'

/**
 * Lo que se ancla acá es una FUGA DE DATOS ENTRE ORGANIZACIONES, no una preferencia de diseño.
 *
 * Sin esta purga, cambiar de organización y volver a un listado devolvía la respuesta de la
 * organización anterior sin emitir un request: ninguna key de `flotaKeys` lleva el tenant, así que
 * la key es idéntica y el `staleTime` de 30 s la da por fresca.
 *
 * Mutaciones que estos tests matan:
 *  - borrar la llamada a `queryClient.clear()`            → «purga al cambiar de organización»
 *  - comparar solo la organización y no el usuario        → «purga cuando cambia el usuario…»
 *  - purgar en todo `set` del store en vez de por identidad → «NO purga cuando el refresh…»
 *  - no purgar al quedarse sin sesión                     → «purga cuando la sesión muere»
 */

const ORG_A = 'a1111111-1111-1111-1111-111111111111'
const ORG_B = 'b2222222-2222-2222-2222-222222222222'
const USUARIO_1 = '11111111-aaaa-aaaa-aaaa-aaaaaaaaaaaa'
const USUARIO_2 = '22222222-bbbb-bbbb-bbbb-bbbbbbbbbbbb'

const KEY_SEMBRADA = ['flota', 'vehiculos', { page: 1 }] as const
const FILAS_DE_LA_ORG_ANTERIOR = [{ patente: 'AA123BB' }]

function sesion(usuarioId: string, organizacionId: string): AuthResponse {
  return {
    accessToken: 'token-de-prueba',
    sessionSnapshot: {
      usuarioId,
      personaId: 'persona-de-prueba',
      nombre: 'Ada',
      apellido: 'Lovelace',
      email: 'ada@orbi.test',
      organizacionActiva: {
        id: organizacionId,
        nombre: 'Empresa de prueba',
        tipoOrganizacion: 'empresa',
        esMicroOrg: false,
        rol: 'owner',
        modulos: ['flota'],
        permisos: ['flota.vehiculos.leer'],
      },
      organizacionesDisponibles: [],
    },
  }
}

/** Deja la cache con una respuesta ya cacheada y la suscripción viva. Devuelve las dos puntas. */
function escenarioConCacheSembrada() {
  const queryClient = new QueryClient()
  queryClient.setQueryData(KEY_SEMBRADA, FILAS_DE_LA_ORG_ANTERIOR)

  const desuscribir = suscribirPurgaDeCachePorSesion(queryClient)

  return { queryClient, desuscribir }
}

afterEach(() => {
  useSessionStore.getState().logout()
})

describe('identidadDeSesion', () => {
  it('sin sesión no tiene identidad', () => {
    expect(identidadDeSesion({ snapshot: null, organizacionActiva: null })).toBeNull()
  })

  it('distingue la misma persona en dos organizaciones', () => {
    const enA = sesion(USUARIO_1, ORG_A).sessionSnapshot
    const enB = sesion(USUARIO_1, ORG_B).sessionSnapshot

    expect(identidadDeSesion({ snapshot: enA, organizacionActiva: enA.organizacionActiva })).not.toBe(
      identidadDeSesion({ snapshot: enB, organizacionActiva: enB.organizacionActiva })
    )
  })

  it('distingue dos personas en la misma organización', () => {
    const uno = sesion(USUARIO_1, ORG_A).sessionSnapshot
    const dos = sesion(USUARIO_2, ORG_A).sessionSnapshot

    expect(identidadDeSesion({ snapshot: uno, organizacionActiva: uno.organizacionActiva })).not.toBe(
      identidadDeSesion({ snapshot: dos, organizacionActiva: dos.organizacionActiva })
    )
  })
})

describe('purga de cache por sesión', () => {
  it('purga al cambiar de organización: el listado de la anterior no sobrevive', () => {
    useSessionStore.getState().login(sesion(USUARIO_1, ORG_A))
    const { queryClient, desuscribir } = escenarioConCacheSembrada()

    // Esto es exactamente lo que hace `useContextSwitch` al cambiar de empresa.
    useSessionStore.getState().updateContext(sesion(USUARIO_1, ORG_B))

    expect(queryClient.getQueryData(KEY_SEMBRADA)).toBeUndefined()
    desuscribir()
  })

  it('purga cuando cambia el usuario aunque la organización sea la misma', () => {
    useSessionStore.getState().login(sesion(USUARIO_1, ORG_A))
    const { queryClient, desuscribir } = escenarioConCacheSembrada()

    // PC compartida: la sesión de uno muere y entra otro de la MISMA empresa.
    useSessionStore.getState().login(sesion(USUARIO_2, ORG_A))

    expect(queryClient.getQueryData(KEY_SEMBRADA)).toBeUndefined()
    desuscribir()
  })

  it('purga cuando la sesión muere: el próximo que entre no hereda nada', () => {
    useSessionStore.getState().login(sesion(USUARIO_1, ORG_A))
    const { queryClient, desuscribir } = escenarioConCacheSembrada()

    // El interceptor de 401 llama a `clearSession`, que hace esto.
    useSessionStore.getState().logout()

    expect(queryClient.getQueryData(KEY_SEMBRADA)).toBeUndefined()
    desuscribir()
  })

  it('NO purga cuando el refresh renueva el token de la misma sesión', () => {
    useSessionStore.getState().login(sesion(USUARIO_1, ORG_A))
    const { queryClient, desuscribir } = escenarioConCacheSembrada()

    // El token dura 15 minutos: esto pasa 4 veces por hora por usuario activo. Purgar acá tiraría
    // la cache entera sin ninguna razón, y es el error que se comete al purgar en cada `set`.
    useSessionStore.getState().updateContext(sesion(USUARIO_1, ORG_A))

    expect(queryClient.getQueryData(KEY_SEMBRADA)).toEqual(FILAS_DE_LA_ORG_ANTERIOR)
    desuscribir()
  })

  it('deja de purgar después de desuscribirse', () => {
    useSessionStore.getState().login(sesion(USUARIO_1, ORG_A))
    const { queryClient, desuscribir } = escenarioConCacheSembrada()

    desuscribir()
    useSessionStore.getState().updateContext(sesion(USUARIO_1, ORG_B))

    expect(queryClient.getQueryData(KEY_SEMBRADA)).toEqual(FILAS_DE_LA_ORG_ANTERIOR)
  })
})
