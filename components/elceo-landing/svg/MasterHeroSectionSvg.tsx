import { readFileSync } from 'node:fs';
import { join } from 'node:path';

function extractHeroSvg(): string {
  const svgPath = join(process.cwd(), '..', '..', 'public/elceo/assets/source/elceo_landing_editable.svg');
  const source = readFileSync(svgPath, 'utf8');
  const viewBoxMatch = source.match(/viewBox="([^"]+)"/);
  const defsMatch = source.match(/<defs>([\s\S]*?)<\/defs>/);

  const heroStart = source.indexOf('<g id="section-1-hero"');
  const sectionTwoStart = source.indexOf('<g id="section-2-tie-and-six-pocket-tiles"');

  if (!viewBoxMatch || !defsMatch || heroStart === -1 || sectionTwoStart === -1 || sectionTwoStart <= heroStart) {
    throw new Error('Unable to extract Section 1 hero from master SVG source.');
  }

  const heroGroup = source.slice(heroStart, sectionTwoStart).trim();
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${viewBoxMatch[1]}" fill="none"><defs>${defsMatch[1]}</defs>${heroGroup}</svg>`;
}

export function MasterHeroSectionSvg() {
  return (
    <div
      className="elceo-master-hero-svg"
      data-elceo-proof="F2A-HERO-EXACT-SVG"
      dangerouslySetInnerHTML={{ __html: extractHeroSvg() }}
    />
  );
}
