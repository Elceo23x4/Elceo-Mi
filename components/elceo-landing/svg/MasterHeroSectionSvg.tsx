import { readFileSync } from 'node:fs';
import { join } from 'node:path';

function withGroupTransform(svgMarkup: string, groupId: string, transform: string): string {
  const re = new RegExp(`<g id="${groupId}"([^>]*)>`, 'i');
  return svgMarkup.replace(re, `<g id="${groupId}"$1 transform="${transform}">`);
}

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

  let heroGroup = source.slice(heroStart, sectionTwoStart).trim();
  heroGroup = withGroupTransform(heroGroup, 'retro-computer-market-reasoning-os', 'translate(720 178) scale(0.78) translate(-720 -178)');
  heroGroup = withGroupTransform(heroGroup, 'hero-wheel-simplified-vector', 'translate(737 630) scale(1.2) translate(-737 -630)');
  heroGroup = withGroupTransform(heroGroup, 'orange-world-globe', 'translate(738 635) scale(1.26) translate(-738 -635)');
  heroGroup = heroGroup.replace(/<g id="hero-explore-button"[\s\S]*?<\/g>/i, '<g id="hero-explore-button" opacity="0" pointer-events="none"></g>');

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1440 1327" preserveAspectRatio="xMidYMid slice" fill="none"><defs>${defsMatch[1]}</defs>${heroGroup}</svg>`;
}

export function MasterHeroSectionSvg() {
  return (
    <div className="elceo-master-hero-svg" data-elceo-proof="F2A-HERO-EXACT-SVG">
      <div dangerouslySetInnerHTML={{ __html: extractHeroSvg() }} />
      <a className="elceo-hero-explore-overlay" href="#" aria-label="Explore ELCEO">
        Explore ELCEO
      </a>
    </div>
  );
}
