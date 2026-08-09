import type { StorybookConfig } from '@storybook/react-vite';

const config: StorybookConfig = {
  // Se sacó el glob de `*.mdx`: no hay ninguno desde que se borró el andamiaje
  // de ejemplo de `storybook init`, y su ausencia imprimía un warning en cada
  // corrida de `vitest`. La documentación de cada primitiva sale de `autodocs`.
  "stories": [
    "../src/**/*.stories.@(js|jsx|mjs|ts|tsx)"
  ],
  "addons": [
    "@chromatic-com/storybook",
    "@storybook/addon-vitest",
    "@storybook/addon-a11y",
    "@storybook/addon-docs",
    "@storybook/addon-onboarding"
  ],
  "framework": "@storybook/react-vite"
};
export default config;