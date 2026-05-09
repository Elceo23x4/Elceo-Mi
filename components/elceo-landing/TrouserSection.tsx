import { PlatformCapabilityColumn } from './PlatformCapabilityColumn';
import { PricingColumn } from './PricingColumn';
import { ProductPhilosophyColumn } from './ProductPhilosophyColumn';

export function TrouserSection() { return <section className="elceo-trouser"><div className="left"><PlatformCapabilityColumn /></div><div className="center"><PricingColumn /></div><div className="right"><ProductPhilosophyColumn /></div></section>; }
