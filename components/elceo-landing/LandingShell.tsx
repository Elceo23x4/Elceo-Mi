import { ELCEO_LANDING_PROOF_MARKER } from '../../lib/elceo-landing/constants';
import { BeltDivider } from './BeltDivider';
import { FooterMinimal } from './FooterMinimal';
import { HeroSection } from './HeroSection';
import { SectionTwoBody } from './SectionTwoBody';
import { TopNavigation } from './TopNavigation';
import { TrouserSection } from './TrouserSection';

export function LandingShell() {
  return (
    <main id="main-content" className="elceo-f2" data-elceo-proof="F2-STATIC-EXACT-LANDING" data-elceo-marker={ELCEO_LANDING_PROOF_MARKER}>
      <TopNavigation />
      <HeroSection />
      <SectionTwoBody />
      <BeltDivider />
      <TrouserSection />
      <FooterMinimal />
    </main>
  );
}
