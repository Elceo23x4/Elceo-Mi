import { INLINE_HERO_SVGS, type InlineHeroAssetName } from './generated/inline-hero-svgs';
import { INLINE_SECTION_TWO_SVGS, type InlineSectionTwoAssetName } from './generated/inline-section-two-svgs';

export type InlineAssetName = InlineHeroAssetName | InlineSectionTwoAssetName;

type InlineAssetSvgProps = {
  assetName: InlineAssetName;
  className: string;
};

export function InlineAssetSvg({ assetName, className }: InlineAssetSvgProps) {
  const markup = assetName in INLINE_HERO_SVGS
    ? INLINE_HERO_SVGS[assetName as InlineHeroAssetName]
    : INLINE_SECTION_TWO_SVGS[assetName as InlineSectionTwoAssetName];

  return (
    <span
      className={`elceo-inline-svg-wrap ${className}`}
      aria-hidden="true"
      draggable={false}
      dangerouslySetInnerHTML={{ __html: markup }}
    />
  );
}
