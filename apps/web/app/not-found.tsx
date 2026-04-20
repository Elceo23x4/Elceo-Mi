export default function NotFoundPage() {
  return (
    <main
      id="main-content"
      style={{
        minHeight: '100vh',
        display: 'grid',
        placeItems: 'center',
        padding: '2rem',
        background: 'var(--elceo-bg)',
        color: 'var(--elceo-text-primary)'
      }}
    >
      <section
        style={{
          width: 'min(720px, 100%)',
          border: '1px solid var(--elceo-border)',
          borderRadius: '24px',
          padding: '2rem',
          background: 'var(--elceo-surface)'
        }}
      >
        <p className="elceo-kicker">404 · NOT FOUND</p>
        <h1 style={{ marginTop: 0 }}>This route does not exist.</h1>
        <p className="elceo-muted-text">
          Return to ELCEO and continue through the public experience.
        </p>
        <a href="/" className="elceo-pill-button" style={{ display: 'inline-flex', marginTop: '1rem' }}>
          Back to ELCEO
        </a>
      </section>
    </main>
  );
}