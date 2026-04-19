'use client';

import { useEffect, useState } from 'react';
import { signIn } from 'next-auth/react';
import { GsapOrchestrator } from '../../../components/motion/GsapOrchestrator';
import { CinematicAtmosphere } from '../../../components/visual/CinematicAtmosphere';

export default function LoginPage() {
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
          <p className="elceo-kicker">SECURE ENTRY · ELCEO</p>
          <h1>Enter the cognition operating system</h1>
          <p className="elceo-muted-text">
            Identity verification gates portfolio state, journal telemetry, and premium intelligence modules. Session protection and entitlement checks
            are enforced after sign-in.
          </p>
          <div className="elceo-auth-intel-grid" aria-label="Security posture">
            <article>
              <p className="elceo-kicker">SIGNAL INTEGRITY</p>
              <p>Deterministic scoring stack with layered explainability.</p>
            </article>
            <article>
              <p className="elceo-kicker">ACCESS CONTROL</p>
              <p>Plan and role entitlements enforced before sensitive surfaces load.</p>
            </article>
          </div>
        </aside>

        <div className="elceo-auth-actions">
          <button className="elceo-pill-button elceo-pill-button-hero" type="button" onClick={() => signIn('google', { callbackUrl })}>
            Continue with Google
          </button>

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
        </div>
      </section>
    </main>
  );
}
