import './globals.css';
import type { CSSProperties, ReactNode } from 'react';
import { darkTheme, lightTheme, themeCssVariables, type ThemeMode } from '@elceo/ui';
import { ThemeScript } from '../components/theme/ThemeScript';
import { validateRuntimeEnv } from '../lib/runtime-env';

function buildThemeStyles(mode: ThemeMode): CSSProperties {
  const tokens = mode === 'light' ? lightTheme : darkTheme;
  return themeCssVariables(tokens) as CSSProperties;
}

export default function RootLayout({ children }: { children: ReactNode }) {
  validateRuntimeEnv();

  return (
    <html lang="en" data-theme="dark">
      <body style={buildThemeStyles('dark')}>
        <a href="#main-content" className="elceo-skip-link">Skip to main content</a>
        <ThemeScript />
        {children}
      </body>
    </html>
  );
}
