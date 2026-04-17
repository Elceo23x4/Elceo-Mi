import { Suspense } from 'react';
import { LoginClient } from './LoginClient';

export default function LoginPage() {
  return (
    <Suspense fallback={<main style={{ maxWidth: 420, margin: '4rem auto', padding: '1rem' }}>Loading login…</main>}>
      <LoginClient />
    </Suspense>
  );
}