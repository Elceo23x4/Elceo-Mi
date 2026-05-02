import { validateMarketEvidenceRegistrySnapshot } from '@elceo/schemas';
import type { MarketEvidenceRegistrySnapshot } from '@elceo/types';

export function serializeMarketEvidenceRegistrySnapshot(snapshot: MarketEvidenceRegistrySnapshot): string {
  const result = validateMarketEvidenceRegistrySnapshot(snapshot);
  if (result.ok === false) throw new Error(`invalid_market_evidence_registry_snapshot:${result.errors.join(';')}`);
  return JSON.stringify(result.value);
}

export function deserializeMarketEvidenceRegistrySnapshot(json: string): MarketEvidenceRegistrySnapshot {
  let parsed: unknown;
  try { parsed = JSON.parse(json) as unknown; } catch { throw new Error('invalid_market_evidence_registry_snapshot_json:malformed_json'); }
  const result = validateMarketEvidenceRegistrySnapshot(parsed);
  if (result.ok === false) throw new Error(`invalid_market_evidence_registry_snapshot_json:${result.errors.join(';')}`);
  return result.value;
}
