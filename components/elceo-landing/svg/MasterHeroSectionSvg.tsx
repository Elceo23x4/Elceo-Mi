import { readFileSync } from 'node:fs';
import { join } from 'node:path';

type HeroLayerIds =
  | 'vertical-elceo-dot-wordmark'
  | 'hero-wheel-simplified-vector'
  | 'hero-side-copy'
  | 'retro-computer-market-reasoning-os';

function extractGroup(source: string, id: HeroLayerIds): string {
  const start = source.indexOf(`<g id="${id}"`);
  if (start === -1) throw new Error(`Missing group: ${id}`);

  let depth = 0;
  let idx = start;
  while (idx < source.length) {
    if (source.startsWith('<g', idx)) depth += 1;
    if (source.startsWith('</g>', idx)) {
      depth -= 1;
      if (depth === 0) return source.slice(start, idx + 4);
    }
    idx += 1;
  }
  throw new Error(`Unclosed group: ${id}`);
}

function readSvgParts(): { defs: string; groups: Record<HeroLayerIds, string> } {
  const svgPath = join(process.cwd(), '..', '..', 'public/elceo/assets/source/elceo_landing_editable.svg');
  const source = readFileSync(svgPath, 'utf8');
  const defsMatch = source.match(/<defs>([\s\S]*?)<\/defs>/);
  if (!defsMatch) throw new Error('Missing defs block in master SVG');

  return {
    defs: defsMatch[1],
    groups: {
      'vertical-elceo-dot-wordmark': extractGroup(source, 'vertical-elceo-dot-wordmark'),
      'hero-wheel-simplified-vector': extractGroup(source, 'hero-wheel-simplified-vector'),
      'hero-side-copy': extractGroup(source, 'hero-side-copy'),
      'retro-computer-market-reasoning-os': extractGroup(source, 'retro-computer-market-reasoning-os'),
    },
  };
}

function layerSvg(defs: string, groupMarkup: string, className: string): string {
  return `<svg class="${className}" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1440 1327" fill="none"><defs>${defs}</defs>${groupMarkup}</svg>`;
}

export function MasterHeroSectionSvg() {
  const parts = readSvgParts();
  return (
    <div className="elceo-hero-stage" data-elceo-proof="F2A-HERO-LAYERED-SVG">
      <div className="elceo-layer elceo-layer-wordmark" dangerouslySetInnerHTML={{ __html: layerSvg(parts.defs, parts.groups['vertical-elceo-dot-wordmark'], 'elceo-layer-svg') }} />
      <div className="elceo-layer elceo-layer-wheel" dangerouslySetInnerHTML={{ __html: layerSvg(parts.defs, parts.groups['hero-wheel-simplified-vector'], 'elceo-layer-svg') }} />
      <div className="elceo-hero-core" aria-hidden="true">
        <div className="elceo-hero-core-inner" />
        <div className="elceo-layer elceo-layer-computer" dangerouslySetInnerHTML={{ __html: layerSvg(parts.defs, parts.groups['retro-computer-market-reasoning-os'], 'elceo-layer-svg') }} />
        <a className="elceo-hero-explore-overlay" href="#" aria-label="Explore ELCEO">Explore ELCEO</a>
      </div>
      <div className="elceo-layer elceo-layer-copy" dangerouslySetInnerHTML={{ __html: layerSvg(parts.defs, parts.groups['hero-side-copy'], 'elceo-layer-svg') }} />
    </div>
  );
}
