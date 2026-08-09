import type { Meta, StoryObj } from '@storybook/react-vite'

/**
 * No es una primitiva: es la HOJA DE PRUEBA del puente de tokens.
 *
 * Para qué sirve, concretamente: el bug más caro del sistema es un `@theme` sin
 * `inline`, porque construye el multi-tema entero y **no cambia nada al cambiar
 * `data-theme`**, sin un solo error en consola. Esta página lo hace visible en
 * un segundo: se cambia el tema con el switcher de Storybook (o el atributo
 * `data-theme` en el `<html>` desde DevTools) y todo tiene que repintarse.
 *
 * Si NADA cambia, no es la pantalla: es el puente. Revisar
 * `01-sistema-de-diseno.md` §7.2, empezando por si el `@theme` dice `inline`.
 *
 * Todo lo de acá se dibuja con utilidades semánticas. Ni un hex.
 */
const meta = {
  title: 'Sistema de diseno/Tokens',
} satisfies Meta

export default meta
type Story = StoryObj<typeof meta>

function Muestra({ clase, nombre }: { clase: string; nombre: string }) {
  return (
    <div className="flex items-center gap-3">
      <span className={`size-10 shrink-0 rounded-md border border-borde ${clase}`} />
      <code className="font-mono text-xs text-fg-secundario">{nombre}</code>
    </div>
  )
}

function Grupo({ titulo, children }: { titulo: string; children: React.ReactNode }) {
  return (
    <section className="flex flex-col gap-3">
      <h3 className="text-xs font-semibold tracking-wider text-fg-secundario uppercase">
        {titulo}
      </h3>
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3">{children}</div>
    </section>
  )
}

export const Colores: Story = {
  render: () => (
    <div className="flex flex-col gap-8 rounded-xl bg-fondo-base p-6">
      <Grupo titulo="Superficies y bordes">
        <Muestra clase="bg-fondo-base" nombre="bg-fondo-base" />
        <Muestra clase="bg-superficie-1" nombre="bg-superficie-1" />
        <Muestra clase="bg-superficie-2" nombre="bg-superficie-2" />
        <Muestra clase="bg-superficie-3" nombre="bg-superficie-3" />
        <Muestra clase="bg-borde" nombre="bg-borde" />
        <Muestra clase="bg-borde-hover" nombre="bg-borde-hover" />
      </Grupo>

      <Grupo titulo="Marca y acción">
        <Muestra clase="bg-marca" nombre="bg-marca" />
        <Muestra clase="bg-marca-hover" nombre="bg-marca-hover" />
        <Muestra clase="bg-marca-suave" nombre="bg-marca-suave" />
        <Muestra clase="bg-accion" nombre="bg-accion" />
        <Muestra clase="bg-accion-hover" nombre="bg-accion-hover" />
        <Muestra clase="bg-accion-suave" nombre="bg-accion-suave" />
      </Grupo>

      <Grupo titulo="Estado">
        <Muestra clase="bg-exito" nombre="bg-exito" />
        <Muestra clase="bg-advertencia" nombre="bg-advertencia" />
        <Muestra clase="bg-peligro" nombre="bg-peligro" />
        <Muestra clase="bg-info" nombre="bg-info" />
      </Grupo>

      <section className="flex flex-col gap-2">
        <h3 className="text-xs font-semibold tracking-wider text-fg-secundario uppercase">
          Texto
        </h3>
        <p className="text-fg-primario">text-fg-primario — títulos, valores, datos que se leen</p>
        <p className="text-fg-secundario">text-fg-secundario — etiquetas, ayuda, metadatos</p>
        <p className="text-fg-terciario">text-fg-terciario — placeholder, deshabilitado</p>
      </section>
    </div>
  ),
}

export const EscalaTipografica: Story = {
  render: () => (
    <div className="flex flex-col gap-2 rounded-xl bg-fondo-base p-6 text-fg-primario">
      <p className="text-xs">text-xs · badges y etiquetas de tabla</p>
      <p className="text-sm">text-sm · body de UI densa, celdas</p>
      <p className="text-base">text-base · body de lectura, formularios</p>
      <p className="text-lg">text-lg · subtítulo de sección</p>
      <p className="text-xl tracking-tight">text-xl · título de card</p>
      <p className="text-2xl tracking-tight">text-2xl · título de página</p>
      <p className="text-3xl tracking-tighter">text-3xl · dato grande</p>
      <p className="font-mono text-sm tracking-wide">font-mono · AB123CD · 8AGXXXXXXXXXXXXXX</p>
    </div>
  ),
}

export const RadiosYSombras: Story = {
  render: () => (
    <div className="flex flex-col gap-6 rounded-xl bg-fondo-base p-6">
      <div className="flex flex-wrap items-end gap-4">
        {(['rounded-sm', 'rounded-md', 'rounded-lg', 'rounded-xl', 'rounded-2xl', 'rounded-full'] as const).map(
          (r) => (
            <div key={r} className="flex flex-col items-center gap-2">
              <span className={`size-16 bg-superficie-2 ${r}`} />
              <code className="font-mono text-xs text-fg-secundario">{r}</code>
            </div>
          )
        )}
      </div>
      <div className="flex flex-wrap items-end gap-6">
        {(['shadow-sm', 'shadow-md', 'shadow-lg', 'shadow-xl', 'shadow-marca', 'shadow-accion'] as const).map(
          (s) => (
            <div key={s} className="flex flex-col items-center gap-2">
              <span className={`size-16 rounded-lg bg-superficie-1 ${s}`} />
              <code className="font-mono text-xs text-fg-secundario">{s}</code>
            </div>
          )
        )}
      </div>
    </div>
  ),
}
