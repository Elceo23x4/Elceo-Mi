import { ExploreCta } from './ExploreCta';
import { HeroGlobeCore } from './HeroGlobeCore';

const labels = [
  ['MARKET REASONING OS', 290, 82],
  ['VOLATILITY MAP', 560, 182],
  ['LIQUIDITY WATCH', 582, 490],
  ['MACRO PRESSURE', 98, 298],
  ['RISK ENGINE', 176, 610],
  ['DATA FUSION', 522, 635],
  ['CONTEXT ENGINE', 122, 178],
  ['SIGNAL ≠ RECOMMENDATION', 234, 742],
] as const;

export function HeroReasoningWheel() {
  return (
    <section className="elceo-wheel-wrap" aria-label="Reasoning wheel">
      <svg viewBox="0 0 800 800" className="elceo-wheel-svg" role="img" aria-label="Market reasoning wheel">
        <defs><linearGradient id="arcGlow" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#ff8a1f"/><stop offset="1" stopColor="#e6600c"/></linearGradient></defs>
        <g id="wheelOuterRings"><circle cx="400" cy="400" r="350"/><circle cx="400" cy="400" r="305"/><circle cx="400" cy="400" r="262"/><circle cx="400" cy="400" r="224"/></g>
        <g id="wheelActiveArcs" stroke="url(#arcGlow)"><path d="M94 355a315 315 0 0 1 170-214"/><path d="M618 699a315 315 0 0 1-254 22"/><path d="M692 276a315 315 0 0 1 8 249"/></g>
        <g id="wheelTicks">{Array.from({ length: 72 }).map((_, i) => <line key={i} x1="400" y1="52" x2="400" y2={i % 3 === 0 ? '34' : '42'} transform={`rotate(${i * 5} 400 400)`} />)}</g>
        <g id="wheelNodes">{[0,45,90,130,180,235,280,320].map((a)=><circle key={a} cx="400" cy="95" r="9" transform={`rotate(${a} 400 400)`}/> )}</g>
        <g id="wheelMicroLabels" className="micro">{labels.map(([t,x,y])=><text key={t} x={x} y={y}>{t}</text>)}</g>
        <g id="wheelCallouts" className="micro callout"><line x1="592" y1="184" x2="512" y2="236"/><line x1="154" y1="305" x2="252" y2="352"/></g>
      </svg>
      <div className="elceo-wheel-core"><HeroGlobeCore /><ExploreCta /></div>
    </section>
  );
}
