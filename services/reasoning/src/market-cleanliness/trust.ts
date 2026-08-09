import type { SourceProvenance } from '../expectation-reality/contracts';
import type { CleanlinessEvidenceReference } from './contracts';

export type CleanlinessTrustResult = { effectiveReliability: CleanlinessEvidenceReference['reliability']; eligible: boolean };

export function resolveCleanlinessTrust(source: SourceProvenance, cutoffAt: string): CleanlinessTrustResult {
  const effectiveReliability = source.effectiveReliability ?? source.reliability;
  if (source.reliability === 'fixture' && effectiveReliability === 'verified') throw new Error('invalid_cleanliness_trust_promotion');
  if (source.reliability === 'unverified' && (effectiveReliability === 'verified' || effectiveReliability === 'replay')) throw new Error('invalid_cleanliness_trust_promotion');
  if (effectiveReliability === 'verified') return { effectiveReliability, eligible: source.reliability === 'verified' };
  if (effectiveReliability === 'replay') {
    if (!source.verificationRef) throw new Error('cleanliness_replay_verification_ref_missing');
    if (!source.trustBasis) throw new Error('cleanliness_replay_trust_basis_missing');
    if (!source.verifiedAt || !Number.isFinite(Date.parse(source.verifiedAt))) throw new Error('cleanliness_replay_verified_at_invalid');
    if (Date.parse(source.verifiedAt) > Date.parse(cutoffAt)) throw new Error('cleanliness_replay_verified_after_cutoff');
    return { effectiveReliability, eligible: source.reliability === 'replay' };
  }
  return { effectiveReliability, eligible: false };
}
