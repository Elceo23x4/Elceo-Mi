import { readFileSync } from 'node:fs';
import { join } from 'node:path';

type InlineAssetSvgProps = {
  assetFile: string;
  className: string;
  ariaHidden?: boolean;
};

function buildInlineSvgMarkup(assetFile: string, className: string, ariaHidden: boolean) {
  const svgPath = join(process.cwd(), 'apps/web/public/elceo/assets/source', assetFile);
  const raw = readFileSync(svgPath, 'utf8');

  return raw.replace(
    '<svg',
    `<svg class="${className}" draggable="false" focusable="false" ${ariaHidden ? 'aria-hidden="true"' : ''}`
  );
}

export function InlineAssetSvg({ assetFile, className, ariaHidden = true }: InlineAssetSvgProps) {
  const markup = buildInlineSvgMarkup(assetFile, className, ariaHidden);

  return <span className="elceo-inline-svg-wrap" dangerouslySetInnerHTML={{ __html: markup }} />;
}
