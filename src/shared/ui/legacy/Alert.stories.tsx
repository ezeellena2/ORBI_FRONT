import type { Meta, StoryObj } from '@storybook/react-vite';
import { Alert } from './Alert';

const meta = {
  title: 'UI/Alert',
  component: Alert,
  argTypes: {
    variant: { control: 'inline-radio', options: ['error', 'success', 'info'] },
    children: { control: 'text' },
  },
  args: {
    children: 'Ocurrió un problema. Revisá los datos y volvé a intentar.',
    variant: 'error',
  },
} satisfies Meta<typeof Alert>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Error: Story = {};

export const Success: Story = {
  args: { variant: 'success', children: 'Tus cambios se guardaron correctamente.' },
};

export const Info: Story = {
  args: { variant: 'info', children: 'Tu sesión expira en 5 minutos.' },
};
