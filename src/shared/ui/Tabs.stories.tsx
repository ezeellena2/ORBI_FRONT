import type { Meta, StoryObj } from '@storybook/react-vite'
import { Badge } from './Badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/shared/ui/base/tabs'

/**
 * `Tabs` se ADOPTA tal cual (mapa de cobertura): el patrón ARIA completo
 * —`tablist`/`tab`/`tabpanel` y las flechas para moverse— ya viene de Base UI.
 * Sin flechas, en una ficha de detalle con 6 tabs el teclado tiene que tabular
 * por todo el contenido de cada panel para llegar a la siguiente.
 *
 * El "contador en la pestaña" que el catálogo pedía como gap se resuelve
 * componiendo un `Badge` adentro del trigger, sin tocar el componente.
 */
const meta = {
  title: 'Primitivas/E Superficie/Tabs (adoptado)',
  component: Tabs,
} satisfies Meta<typeof Tabs>

export default meta
type Story = StoryObj<typeof meta>

export const Activo: Story = {
  render: () => (
    <Tabs defaultValue="general" className="w-[28rem]">
      <TabsList>
        <TabsTrigger value="general">General</TabsTrigger>
        <TabsTrigger value="dispositivo">Dispositivo</TabsTrigger>
        <TabsTrigger value="historial">Historial</TabsTrigger>
      </TabsList>
      <TabsContent value="general" className="p-3 text-fg-secundario">
        Datos generales del vehículo.
      </TabsContent>
      <TabsContent value="dispositivo" className="p-3 text-fg-secundario">
        GPS asignado.
      </TabsContent>
      <TabsContent value="historial" className="p-3 text-fg-secundario">
        Movimientos.
      </TabsContent>
    </Tabs>
  ),
}

export const ConContador: Story = {
  render: () => (
    <Tabs defaultValue="problemas" className="w-[28rem]">
      <TabsList>
        <TabsTrigger value="general">General</TabsTrigger>
        <TabsTrigger value="problemas">
          Problemas
          <Badge variante="peligro">3</Badge>
        </TabsTrigger>
      </TabsList>
      <TabsContent value="general" className="p-3 text-fg-secundario">
        Datos generales.
      </TabsContent>
      <TabsContent value="problemas" className="p-3 text-fg-secundario">
        3 problemas abiertos.
      </TabsContent>
    </Tabs>
  ),
}

export const ConTabDeshabilitada: Story = {
  render: () => (
    <Tabs defaultValue="general" className="w-[28rem]">
      <TabsList>
        <TabsTrigger value="general">General</TabsTrigger>
        <TabsTrigger value="mapa" disabled>
          Mapa en vivo
        </TabsTrigger>
      </TabsList>
      <TabsContent value="general" className="p-3 text-fg-secundario">
        Datos generales.
      </TabsContent>
    </Tabs>
  ),
}
