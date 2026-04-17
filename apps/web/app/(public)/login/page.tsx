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
    <main id="main-content" className="elceo-auth-page">
      <div className="elceo-atmosphere elceo-atmosphere-a" aria-hidden="true" />
      <div className="elceo-atmosphere elceo-atmosphere-c" aria-hidden="true" />

      <section className="elceo-auth-shell" aria-label="ELCEO authentication">
        <header className="elceo-auth-header">
          <p className="elceo-kicker">SECURE ENTRY · ELCEO</p>
          <h1>Access the cognition operating system</h1>
          <p className="elceo-muted-text">Identity is required before portfolio state, journal intelligence, and premium cognition layers can be loaded.</p>
        </header>

        <div className="elceo-auth-actions">
          <button className="elceo-pill-button elceo-pill-button-hero" type="button" onClick={() => signIn('google', { callbackUrl })}>
            Continue with Google
          </button>

          <div className="elceo-auth-divider" role="presentation">
            <span>or use secure credentials</span>
          </div>

          <label className="elceo-auth-label">
            <span>Email</span>
            <input value={email} onChange={(e) => setEmail(e.target.value)} type="email" placeholder="you@desk.com" />
          </label>

          <label className="elceo-auth-label">
            <span>Password</span>
            <input value={password} onChange={(e) => setPassword(e.target.value)} type="password" placeholder="••••••••" />
          </label>

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

          {error ? <p className="elceo-auth-error">{error}</p> : null}
        </div>
      </section>
    </main>
  );
}
