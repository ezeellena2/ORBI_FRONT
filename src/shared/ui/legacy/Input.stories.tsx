import type { Meta, StoryObj } from '@storybook/react-vite';
import { Mail } from 'lucide-react';
import { Input } from './Input';

const meta = {
  title: 'UI/Input',
  component: Input,
  argTypes: {
    label: { control: 'text' },
    placeholder: { control: 'text' },
    error: { control: 'text' },
    type: { control: 'inline-radio', options: ['text', 'email', 'password'] },
    disabled: { control: 'boolean' },
  },
  args: {
    label: 'Email',
    placeholder: 'tu@empresa.com',
    type: 'email',
  },
} satisfies Meta<typeof Input>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const WithError: Story = {
  args: { error: 'Ingresá un email válido.', value: 'no-es-email' },
};

export const WithLeadingIcon: Story = {
  args: { leadingAdornment: <Mail className="h-4 w-4" aria-hidden="true" /> },
};

export const Password: Story = {
  args: { label: 'Contraseña', type: 'password', placeholder: '••••••••' },
};

export const Disabled: Story = {
  args: { disabled: true, value: 'no-editable@orbi.com' },
};
