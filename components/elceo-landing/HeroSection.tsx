import { ElceoBadgeStamp } from './ElceoBadgeStamp';
import { HeroReasoningWheel } from './HeroReasoningWheel';
import { VerticalElceoLogo } from './VerticalElceoLogo';

export function HeroSection() {
  return <section className="elceo-hero"><VerticalElceoLogo /><ElceoBadgeStamp /><HeroReasoningWheel /></section>;
}
