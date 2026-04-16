'use client';

import { useState } from 'react';
import { signIn } from 'next-auth/react';
import { useSearchParams } from 'next/navigation';

export default function LoginPage() {
  const params = useSearchParams();
  const callbackUrl = params.get('callbackUrl') ?? '/onboarding';
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);

  return (
    <main style={{ maxWidth: 420, margin: '4rem auto', padding: '1rem', display: 'grid', gap: '0.8rem' }}>
      <p className="elceo-kicker">AUTHENTICATION</p>
      <h1 style={{ margin: 0 }}>Sign in to ELCEO</h1>

      <button className="elceo-pill-button" type="button" onClick={() => signIn('google', { callbackUrl })}>
        Continue with Google
      </button>

      <p className="elceo-muted-text">Or use email + password (scaffold path).</p>
      <input value={email} onChange={(e) => setEmail(e.target.value)} type="email" placeholder="Email" />
      <input value={password} onChange={(e) => setPassword(e.target.value)} type="password" placeholder="Password" />
      <button
        className="elceo-pill-button"
        type="button"
        onClick={async () => {
          const response = await signIn('credentials', {
            email,
            password,
            redirect: false,
            callbackUrl
          });

          if (!response || response.error) {
            setError('Invalid credentials');
            return;
          }

          window.location.href = response.url ?? callbackUrl;
        }}
      >
        Sign in with email
      </button>

      {error ? <p className="elceo-muted-text">{error}</p> : null}
    </main>
  );
}
