import dynamic from 'next/dynamic';

const HeroGlobeCoreClient = dynamic(() => import('./HeroGlobeCore.client').then((m) => m.HeroGlobeCoreClient), { ssr: false, loading: () => <div>HeroGlobeCore loading placeholder</div> });

export function HeroGlobeCore(): JSX.Element {
  return <HeroGlobeCoreClient />;
}
