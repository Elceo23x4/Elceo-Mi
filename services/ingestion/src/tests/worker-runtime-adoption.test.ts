import { readFileSync } from 'node:fs';
import { createCanonicalWorkerBoundaryService } from '../runtime/canonical-worker-boundary';

function assert(condition: boolean, message: string): void {
  if (!condition) throw new Error(`Assertion failed: ${message}`);
}

export function runWorkerRuntimeAdoptionTests(): void {
  assert(typeof createCanonicalWorkerBoundaryService === 'function', 'runtime boundary constructor should be exported');

  const workerSource = readFileSync('src/worker.ts', 'utf8');
  assert(workerSource.includes('export async function runIngestionTick'), 'worker should expose runIngestionTick');
  assert(workerSource.includes('getIngestionRuntimeConfig'), 'worker should load runtime config explicitly');
  assert(workerSource.includes('createCanonicalWorkerBoundaryService'), 'worker should call canonical worker boundary service');
  assert(workerSource.includes('runLegacyCompatibilityTick'), 'legacy path should be explicitly isolated');
}
