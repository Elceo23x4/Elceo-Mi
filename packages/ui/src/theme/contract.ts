<<<<<<< HEAD
export type ThemeMode = 'dark' | 'light';

export type ThemeTokens = {
  mode: ThemeMode;
  colors: {
    background: string;
    surface: string;
    surfaceSoft: string;
    textPrimary: string;
    textMuted: string;
    brandMain: string;
    brandAccent: string;
    border: string;
    glow: string;
  };
  typography: {
    display: string;
    heading: string;
    body: string;
    mono: string;
  };
};

export function themeCssVariables(theme: ThemeTokens): Record<string, string> {
  return {
    '--elceo-bg': theme.colors.background,
    '--elceo-surface': theme.colors.surface,
    '--elceo-surface-soft': theme.colors.surfaceSoft,
    '--elceo-text-primary': theme.colors.textPrimary,
    '--elceo-text-muted': theme.colors.textMuted,
    '--elceo-brand-main': theme.colors.brandMain,
    '--elceo-brand-accent': theme.colors.brandAccent,
    '--elceo-border': theme.colors.border,
    '--elceo-glow': theme.colors.glow,
    '--elceo-font-display': theme.typography.display,
    '--elceo-font-heading': theme.typography.heading,
    '--elceo-font-body': theme.typography.body,
    '--elceo-font-mono': theme.typography.mono
  };
}
=======
export {};
>>>>>>> origin/main
