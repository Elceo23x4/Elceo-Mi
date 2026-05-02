import { validateSeoContentArchitectureSnapshot } from '@elceo/schemas';
import type { SeoContentArchitectureSnapshot } from '@elceo/types';

export function serializeSeoContentArchitectureSnapshot(snapshot: SeoContentArchitectureSnapshot): string {
  const result = validateSeoContentArchitectureSnapshot(snapshot);
  if (result.ok === false) throw new Error(`invalid_seo_content_architecture_snapshot:${result.errors.join(';')}`);
  return JSON.stringify(result.value);
}

export function deserializeSeoContentArchitectureSnapshot(json: string): SeoContentArchitectureSnapshot {
  let parsed: unknown;
  try { parsed = JSON.parse(json) as unknown; } catch { throw new Error('invalid_seo_content_architecture_snapshot_json:malformed_json'); }
  const result = validateSeoContentArchitectureSnapshot(parsed);
  if (result.ok === false) throw new Error(`invalid_seo_content_architecture_snapshot_json:${result.errors.join(';')}`);
  return result.value;
}
