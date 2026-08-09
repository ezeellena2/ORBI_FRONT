import type { Preview } from '@storybook/react-vite';
import { withThemeByDataAttribute } from '@storybook/addon-themes';
// El unico entrypoint de estilos del repo (01-sistema-de-diseno.md §7.5).
import '../src/styles/base.css';
// i18n bootstrap — necesario porque varios componentes usan useTranslation()
import '../src/shared/i18n';

const preview: Preview = {
  parameters: {
    backgrounds: { disable: true },
    controls: {
      matchers: {
        color: /(background|color)$/i,
        date: /Date$/i,
      },
    },
    a11y: {
      config: {
        rules: [{ id: 'color-contrast', enabled: true }],
      },

      // 'todo' - show a11y violations in the test UI only
      // 'error' - fail CI on a11y violations
      // 'off' - skip a11y checks entirely
      test: 'todo',
    },
  },
  decorators: [
    // Los 4 temas se declaran completos desde el dia 1 aunque solo `dark` este
    // expuesto en producto: la suite visual corre las stories en los 4, que es
    // como se verifica que ningun componente asumio fondo oscuro (01 §5.3).
    withThemeByDataAttribute({
      themes: {
        dark: 'dark',
        light: 'light',
        'dark-warm': 'dark-warm',
        midnight: 'midnight',
      },
      defaultTheme: 'dark',
      attributeName: 'data-theme',
    }),
  ],
  tags: ['autodocs'],
};

export default preview;
