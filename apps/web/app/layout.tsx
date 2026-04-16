import './globals.css';
<<<<<<< HEAD
import type { CSSProperties, ReactNode } from 'react';
import { darkTheme, lightTheme, themeCssVariables, type ThemeMode } from '@elceo/ui';
import { ThemeScript } from '../components/theme/ThemeScript';

function buildThemeStyles(mode: ThemeMode): CSSProperties {
  const tokens = mode === 'light' ? lightTheme : darkTheme;
  return themeCssVariables(tokens) as CSSProperties;
}

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" data-theme="dark">
      <body style={buildThemeStyles('dark')}>
        <ThemeScript />
        {children}
      </body>
=======
import type { ReactNode } from 'react';

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
>>>>>>> origin/main
    </html>
  );
}
