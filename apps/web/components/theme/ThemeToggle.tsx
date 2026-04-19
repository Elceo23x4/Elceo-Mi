'use client';

import { useEffect, useState } from 'react';
import { darkTheme, lightTheme, themeCssVariables, type ThemeMode } from '@elceo/ui';

export function ThemeToggle() {
  const [mode, setMode] = useState<ThemeMode>('dark');

  useEffect(() => {
    const current = document.documentElement.getAttribute('data-theme');
    if (current === 'light' || current === 'dark') {
      setMode(current);
    }
  }, []);

  const applyTheme = (next: ThemeMode) => {
    const tokens = next === 'light' ? lightTheme : darkTheme;
    const variables = themeCssVariables(tokens);

    document.documentElement.setAttribute('data-theme', next);
    document.body.setAttribute('data-theme', next);
    Object.entries(variables).forEach(([key, value]) => {
      document.body.style.setProperty(key, value);
    });

    localStorage.setItem('elceo-theme', next);
    setMode(next);
  };

  return (
    <button className="elceo-pill-button" onClick={() => applyTheme(mode === 'dark' ? 'light' : 'dark')}>
      {mode === 'dark' ? 'Switch to Light' : 'Switch to Dark'}
    </button>
  );
}
