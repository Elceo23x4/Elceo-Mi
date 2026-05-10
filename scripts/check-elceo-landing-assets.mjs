import { existsSync } from 'node:fs';

const referenceAssets = [
  'public/elceo/reference/01-approved-landing-concept.png',
  'public/elceo/reference/02-hero-globe-core-reference.png',
  'public/elceo/reference/03-tribes-beer-font-reference.png',
  'public/elceo/reference/04-offbit-font-reference.png',
  'public/elceo/reference/05-motion-reference.mp4'
];

const servedWebAssets = [
  'apps/web/public/elceo/assets/source/vertical_logo.svg',
  'apps/web/public/elceo/assets/source/hero_wheel.svg',
  'apps/web/public/elceo/assets/source/retro_computer_logo.svg',
  'apps/web/public/elceo/assets/source/hero_side_copy.svg',
  'apps/web/public/elceo/assets/source/orange_world_globe.svg',
  'apps/web/public/elceo/assets/source/section_2_layout.svg',
  'apps/web/public/elceo/assets/source/tie.svg',
  'apps/web/public/elceo/assets/source/pocket_tile_1.svg',
  'apps/web/public/elceo/assets/source/pocket_tile_2.svg',
  'apps/web/public/elceo/assets/source/pocket_tile_3.svg',
  'apps/web/public/elceo/assets/source/pocket_tile_4.svg',
  'apps/web/public/elceo/assets/source/pocket_tile_5.svg',
  'apps/web/public/elceo/assets/source/pocket_tile_6.svg',
];

const missingReference = referenceAssets.filter((file) => !existsSync(file));
const missingServed = servedWebAssets.filter((file) => !existsSync(file));

if (missingReference.length > 0 || missingServed.length > 0) {
  const sections = [];

  if (missingReference.length > 0) {
    sections.push(`Missing ELCEO landing reference assets:\n${missingReference.map((file) => `- ${file}`).join('\n')}`);
  }

  if (missingServed.length > 0) {
    sections.push(`Missing ELCEO web-served public assets:\n${missingServed.map((file) => `- ${file}`).join('\n')}`);
  }

  console.error(sections.join('\n\n'));
  process.exit(1);
}

console.log('All ELCEO landing reference assets and web-served public assets are present.');
