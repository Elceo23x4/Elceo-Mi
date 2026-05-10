import { INLINE_HERO_SVGS, type InlineHeroAssetName } from './generated/inline-hero-svgs';

type InlineAssetSvgProps = {
  assetName: InlineHeroAssetName;
  className: string;
};

export function InlineAssetSvg({ assetName, className }: InlineAssetSvgProps) {
  const markup = INLINE_HERO_SVGS[assetName];

  return (
    <span
      className={`elceo-inline-svg-wrap ${className}`}
      aria-hidden="true"
      draggable={false}
      dangerouslySetInnerHTML={{ __html: markup }}
    />
  );
}
