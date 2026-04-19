import type { ThemeTokens } from './contract';

export const lightTheme: ThemeTokens = {
  mode: 'light',
  colors: {
    background: '#f5f6fa',
    surface: 'rgba(255, 255, 255, 0.86)',
    surfaceSoft: 'rgba(250, 250, 252, 0.72)',
    textPrimary: '#101119',
    textMuted: '#555b6c',
    brandMain: '#b2474b',
    brandAccent: '#279a5a',
    border: 'rgba(178, 71, 75, 0.25)',
    glow: 'rgba(178, 71, 75, 0.15)'
  },
  typography: {
    display: '"Sora", "Inter", sans-serif',
    heading: '"Inter", "Segoe UI", sans-serif',
    body: '"Inter", "Segoe UI", sans-serif',
    mono: '"JetBrains Mono", monospace'
  }
};
