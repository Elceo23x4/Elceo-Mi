import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { SentrySymbolicationProbe } from './SentrySymbolicationProbe';

export const metadata: Metadata = {
  title: 'Sentry symbolication diagnostic · ELCEO',
  robots: { index: false, follow: false }
};

// Keep the APP_ENV denial request-time rather than baking build-time access into a static page.
export const dynamic = 'force-dynamic';

export default function SentrySymbolicationDiagnosticPage() {
  if (process.env.APP_ENV !== 'staging') notFound();

  return (
    <main
      id="main-content"
      style={{
        minHeight: '100vh',
        display: 'grid',
        placeItems: 'center',
        padding: 'clamp(2rem, 7vw, 7rem)',
        background: 'var(--elceo-bg)',
        color: 'var(--elceo-text-primary)'
      }}
    >
      <section style={{ width: 'min(780px, 100%)' }}>
        <p className="elceo-kicker">STAGING DIAGNOSTIC · NATIVE STACK · V2</p>
        <h1 style={{ maxWidth: '12ch', fontSize: 'clamp(3rem, 8vw, 6.5rem)', lineHeight: 0.9 }}>
          Trace the compiled signal.
        </h1>
        <p className="elceo-muted-text" style={{ maxWidth: '58ch', marginBlock: '2rem' }}>
          Capture one native browser exception, then use its event ID to verify Debug-ID source-map symbolication in Sentry.
        </p>
        <SentrySymbolicationProbe />
      </section>
    </main>
  );
}
