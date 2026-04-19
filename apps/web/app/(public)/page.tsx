import { LandingSections } from '../../components/branding/LandingSections';
import { GsapOrchestrator } from '../../components/motion/GsapOrchestrator';
import { PublicTopNav } from '../../components/shell/PublicTopNav';
import { CinematicAtmosphere } from '../../components/visual/CinematicAtmosphere';

export default function LandingPage() {
  return (
    <main id="main-content" className="elceo-public-page elceo-public-cinematic">
      <GsapOrchestrator mode="landing" />
      <div className="elceo-atmosphere elceo-atmosphere-a" aria-hidden="true" />
      <div className="elceo-atmosphere elceo-atmosphere-b" aria-hidden="true" />
      <CinematicAtmosphere className="elceo-cinematic-atmosphere-landing" variant="landing" />
      <PublicTopNav />
      <LandingSections />
    </main>
  );
}
