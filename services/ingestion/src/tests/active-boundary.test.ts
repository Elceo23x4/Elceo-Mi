import { readFileSync } from 'node:fs';
import { createCanonicalIngestionFacade } from '../facade/canonical-ingestion-facade';

function assert(condition: boolean, message: string): void {
  if (!condition) throw new Error(`Assertion failed: ${message}`);
}

export function runActiveBoundaryTests(): void {
  assert(typeof createCanonicalIngestionFacade === 'function', 'canonical facade factory should exist');
  const indexSource = readFileSync('src/index.ts', 'utf8');
  assert(indexSource.includes("export * from './facade/index';"), 'top-level ingestion index should expose canonical facade boundary');
  assert(indexSource.includes('Legacy compatibility exports'), 'legacy boundary should remain explicitly marked');
}
