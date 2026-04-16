import { Reveal } from '@elceo/motion';
import { Surface } from '@elceo/ui';

export default function AnalyticsPage() {
  return (
    <Reveal>
      <Surface style={{ padding: '1.2rem', minHeight: '54vh' }}>
        <p className="elceo-kicker">ANALYTICS · NEXT SLICE</p>
        <h1 style={{ marginTop: '0.4rem' }}>Performance analytics shell reserved</h1>
        <p className="elceo-muted-text">Behavior metrics and coaching logic arrive in the analytics implementation slice.</p>
      </Surface>
    </Reveal>
  );
}
