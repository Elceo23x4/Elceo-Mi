import React from 'react';
import { LoginClient } from './LoginClient';

export default function LoginPage() {
  return (
    <React.Suspense fallback={<main style={{ maxWidth: 420, margin: '4rem auto', padding: '1rem' }}>Loading login…</main>}>
      <LoginClient />
    </React.Suspense>
  );
}
