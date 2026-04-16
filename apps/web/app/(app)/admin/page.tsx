import { Reveal } from '@elceo/motion';
import { Surface } from '@elceo/ui';

export default function AdminPage() {
  return (
    <Reveal>
      <Surface style={{ padding: '1.2rem', minHeight: '54vh' }}>
        <p className="elceo-kicker">ADMIN · GOVERNANCE RESERVED</p>
        <h1 style={{ marginTop: '0.4rem' }}>Admin control center shell reserved</h1>
        <p className="elceo-muted-text">Source health, audits, and overrides will be expanded in admin/governance slices.</p>
      </Surface>
    </Reveal>
  );
}
