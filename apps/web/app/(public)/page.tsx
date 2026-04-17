import { LandingSections } from '../../components/branding/LandingSections';
import { PublicTopNav } from '../../components/shell/PublicTopNav';

export default function LandingPage() {
  return (
    <main id="main-content" className="elceo-public-page elceo-public-cinematic">
      <div className="elceo-atmosphere elceo-atmosphere-a" aria-hidden="true" />
      <div className="elceo-atmosphere elceo-atmosphere-b" aria-hidden="true" />
      <PublicTopNav />
      <LandingSections />
    </main>
  );
}
