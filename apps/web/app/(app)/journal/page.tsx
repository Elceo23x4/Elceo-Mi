import { Reveal } from '@elceo/motion';
import { Surface } from '@elceo/ui';

export default function JournalPage() {
  return (
    <Reveal>
      <Surface style={{ padding: '1.2rem', minHeight: '54vh' }}>
        <p className="elceo-kicker">JOURNAL · NEXT SLICE</p>
        <h1 style={{ marginTop: '0.4rem' }}>Trader journal shell reserved</h1>
        <p className="elceo-muted-text">Structured entry logic and analytics depth will be added in the journal slice.</p>
      </Surface>
    </Reveal>
  );
}
