import { useTranslation } from 'react-i18next'
import { Campo } from '@/shared/ui/Campo'
import { Select, type OpcionSelect } from '@/shared/ui/Select'

/**
 * Select alimentado por un catálogo del backend, con sus tres estados no-felices explícitos.
 *
 * PORTAR LAS OPCIONES HARDCODEADAS DEL MOCKUP ESTÁ PROHIBIDO: marca y tipo son catálogos CANÓNICOS
 * que viven en tablas de la base. Una lista escrita en el front se desincroniza el día que alguien
 * agrega un tipo, y manda al backend un código que su catálogo no conoce.
 *
 * Los tres estados, y por qué son distintos entre sí:
 *  - `cargando`: el catálogo todavía viaja. No es un select vacío.
 *  - `fallo`: la llamada al catálogo falló. Decirlo es la diferencia entre "no hay marcas cargadas"
 *    (falso) y "no pudimos traer las marcas" (verdadero).
 *  - vacío honesto: el catálogo respondió y no tiene filas. Hoy es el caso REAL de marcas: las
 *    tablas grandes del catálogo canónico están vacías hasta que se decida la fuente de datos
 *    (DA-CAT-02). Se muestra el motivo, nunca una lista inventada.
 *
 * PENDIENTE (DA-FE-IMPL-02): la variante buscable del catálogo (cascada con `q`). Necesita
 * `command` + `popover`, que no están en el corte de primitivas P0, y escribir un combobox a mano
 * es exactamente lo que la regla de adopción prohíbe. Mientras tanto se lista la primera página.
 */
export function CampoSelectCatalogo({
  etiqueta,
  opciones,
  valor,
  onCambio,
  cargando,
  fallo,
  error,
  id,
  placeholder,
  avisoVacio,
}: {
  /** Ya resuelto por i18n. */
  etiqueta: string
  opciones: OpcionSelect[]
  valor: string
  onCambio: (valor: string) => void
  cargando: boolean
  fallo: boolean
  /** Mensaje de validación ya resuelto. */
  error?: string
  id?: string
  placeholder: string
  /** Motivo del catálogo vacío. Ya resuelto por i18n. */
  avisoVacio: string
}) {
  const { t } = useTranslation(['flota', 'common'])

  const sinOpciones = !cargando && !fallo && opciones.length === 0
  const ayuda = fallo ? t('flota:onboarding.catalogo.fallo') : sinOpciones ? avisoVacio : undefined

  return (
    <Campo etiqueta={etiqueta} requerido error={error} ayuda={ayuda} id={id}>
      {(control) => (
        // `Select` no acepta el `control` entero (no declara `required` ni `aria-invalid`: tiene su
        // propia prop `invalido`), así que se cablea campo por campo.
        <Select
          id={control.id}
          aria-describedby={control['aria-describedby']}
          opciones={opciones}
          valor={valor}
          onCambio={onCambio}
          cargando={cargando}
          invalido={error !== undefined}
          placeholder={placeholder}
          textoCargando={t('flota:onboarding.catalogo.cargando')}
          textoSinOpciones={
            fallo ? t('flota:onboarding.catalogo.fallo') : t('flota:onboarding.catalogo.vacio')
          }
        />
      )}
    </Campo>
  )
}
