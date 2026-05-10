import { type ReactNode } from 'react';

import { InlineAssetSvg, type InlineAssetName } from './svg/InlineAssetSvg';

type SectionTwoPocketProps = {
  assetName: InlineAssetName;
  slotClassName: string;
  title: string;
  eyebrow: string;
  children: ReactNode;
};

export function SectionTwoPocket({ assetName, slotClassName, title, eyebrow, children }: SectionTwoPocketProps) {
  return (
    <article className={`elceo-section-two-pocket ${slotClassName}`}>
      <InlineAssetSvg assetName={assetName} className="elceo-section-two-pocket-frame" />
      <div className="elceo-section-two-pocket-content">
        <p className="elceo-section-two-pocket-eyebrow">{eyebrow}</p>
        <h3>{title}</h3>
        {children}
      </div>
    </article>
  );
}
