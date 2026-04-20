import { GsapOrchestrator } from '../../../components/motion/GsapOrchestrator';
import { CinematicAtmosphere } from '../../../components/visual/CinematicAtmosphere';
import { DemoDashboardTwin } from '../../../components/demo/DemoDashboardTwin';

export default function DemoPage() {
  return (
    <main id="main-content" className="elceo-public-page elceo-public-cinematic elceo-demo-page-v2">
      <GsapOrchestrator mode="demo" />
      <div className="elceo-atmosphere elceo-atmosphere-a" aria-hidden="true" />
      <div className="elceo-atmosphere elceo-atmosphere-b" aria-hidden="true" />
      <CinematicAtmosphere className="elceo-cinematic-atmosphere-landing" variant="landing" />
      <DemoDashboardTwin />
    </main>
  );
}
