'use client';

import { useEffect, useState } from 'react';
import { signIn } from 'next-auth/react';
import { GsapOrchestrator } from '../../../components/motion/GsapOrchestrator';
import { CinematicAtmosphere } from '../../../components/visual/CinematicAtmosphere';

const trustNotes = [
  'Signal integrity checks on each cognition update',
  'Role + plan entitlements verified before sensitive modules',
  'Session and request context hardened across platform routes'
] as const;

export function SecureLoginClient({ credentialsEnabled }: { credentialsEnabled: boolean }) {
  const [callbackUrl, setCallbackUrl] = useState('/onboarding');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const params = new URLSearchParams(window.location.search);
    setCallbackUrl(params.get('callbackUrl') ?? '/onboarding');
  }, []);

  return (
    <main id="main-content" className="elceo-auth-page">
      <GsapOrchestrator mode="auth" />
      <div className="elceo-atmosphere elceo-atmosphere-a" aria-hidden="true" />
      <div className="elceo-atmosphere elceo-atmosphere-c" aria-hidden="true" />
      <CinematicAtmosphere className="elceo-cinematic-atmosphere-auth" variant="auth" />

      <section className="elceo-auth-shell" aria-label="ELCEO authentication">
        <aside className="elceo-auth-intel" aria-label="Platform security context">
          <p className="elceo-kicker">SECURE ENTRY · PRIVATE SYSTEM</p>
          <h1>Enter ELCEO intelligence control.</h1>
          <p className="elceo-muted-text">
            Access gates market cognition state, journal telemetry, and premium diagnostics. Every session enforces role scope, plan depth, and route-level integrity.
          </p>
          <div className="elceo-auth-intel-grid" aria-label="Security posture">
            <article>
              <p className="elceo-kicker">Signal integrity</p>
              <p>Deterministic scoring and contradiction tracking are versioned and auditable.</p>
            </article>
            <article>
              <p className="elceo-kicker">Access control</p>
              <p>Super admin, analyst admin, support admin, and plan boundaries enforced at entry.</p>
            </article>
          </div>
          <ul className="elceo-auth-trust-list">
            {trustNotes.map((note) => (
              <li key={note}>{note}</li>
            ))}
          </ul>
        </aside>

        <div className="elceo-auth-actions">
          <p className="elceo-kicker">Authenticate</p>
          <h2>Secure operator sign-in</h2>
          <button className="elceo-pill-button elceo-pill-button-hero" type="button" onClick={() => signIn('google', { callbackUrl })}>
            Continue with Google
          </button>

          {credentialsEnabled ? <>
          <div className="elceo-auth-divider" role="presentation">
            <span>or authenticate with credentials</span>
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
            className="elceo-pill-button elceo-pill-button-auth"
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
          </> : null}
        </div>
      </section>
    </main>
  );
}
