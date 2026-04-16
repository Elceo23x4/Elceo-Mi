import { LandingSections } from '../../components/branding/LandingSections';
import { PublicTopNav } from '../../components/shell/PublicTopNav';

export default function LandingPage() {
  return (
    <main className="elceo-public-page">
      <PublicTopNav />
      <LandingSections />
    </main>
  );
}
