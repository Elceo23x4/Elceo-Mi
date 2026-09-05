'use client';

import * as Sentry from '@sentry/nextjs';
import { useEffect, useRef } from 'react';

export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  const captured = useRef(false);

  useEffect(() => {
    if (captured.current) return;
    captured.current = true;
    Sentry.captureException(error, { tags: { scope: 'app.global-error', category: 'render' } });
  }, [error]);

  return (
    <html lang="en">
      <body style={{ background: '#07090d', color: '#f4f0e8', fontFamily: 'system-ui, sans-serif', margin: 0 }}>
        <main style={{ display: 'grid', minHeight: '100vh', placeItems: 'center', padding: '2rem' }}>
          <section style={{ maxWidth: 620, textAlign: 'center' }}>
            <p style={{ color: '#a7efcf', letterSpacing: '0.18em', textTransform: 'uppercase' }}>ELCEO · System notice</p>
            <h1 style={{ fontSize: 'clamp(2.5rem, 7vw, 5.5rem)', fontWeight: 500, letterSpacing: '-0.05em', margin: '1rem 0' }}>
              Signal interrupted.
            </h1>
            <p style={{ color: '#aeb4bd', lineHeight: 1.7 }}>The market cognition workspace encountered a temporary fault. No internal details were exposed.</p>
            <button onClick={reset} style={{ background: '#a7efcf', border: 0, color: '#07100c', cursor: 'pointer', fontWeight: 700, marginTop: '2rem', padding: '0.9rem 1.4rem' }}>
              Restore workspace
            </button>
          </section>
        </main>
      </body>
    </html>
  );
}
