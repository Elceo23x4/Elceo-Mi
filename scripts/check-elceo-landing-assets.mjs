import { existsSync } from 'node:fs';

const required = [
  'public/elceo/reference/01-approved-landing-concept.png',
  'public/elceo/reference/02-hero-globe-core-reference.png',
  'public/elceo/reference/03-tribes-beer-font-reference.png',
  'public/elceo/reference/04-offbit-font-reference.png',
  'public/elceo/reference/05-motion-reference.mp4',
];

const missing = required.filter((file) => !existsSync(file));

if (missing.length > 0) {
  console.error(`Missing ELCEO landing assets:\n${missing.map((file) => `- ${file}`).join('\n')}`);
  process.exit(1);
}

console.log('All ELCEO landing reference assets are present.');
