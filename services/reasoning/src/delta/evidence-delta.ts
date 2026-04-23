import type { CanonicalCognitionState } from '@elceo/types';
import type { EvidenceDelta } from './contracts';

function includesId(ids: string[], target: string): boolean {
  return ids.includes(target);
}

export function buildEvidenceDelta(previous: CanonicalCognitionState, current: CanonicalCognitionState): EvidenceDelta {
  const previousTopEvidenceIds = [...previous.evidence.topEvidenceIds];
  const currentTopEvidenceIds = [...current.evidence.topEvidenceIds];

  const enteredEvidenceIds = currentTopEvidenceIds.filter((evidenceId) => !includesId(previousTopEvidenceIds, evidenceId));
  const exitedEvidenceIds = previousTopEvidenceIds.filter((evidenceId) => !includesId(currentTopEvidenceIds, evidenceId));
  const retainedEvidenceIds = currentTopEvidenceIds.filter((evidenceId) => includesId(previousTopEvidenceIds, evidenceId));

  const rerankedEvidenceIds = retainedEvidenceIds.filter((evidenceId, currentIndex) => {
    const previousIndex = previousTopEvidenceIds.indexOf(evidenceId);
    return previousIndex !== currentIndex;
  });

  return {
    previousTopEvidenceIds,
    currentTopEvidenceIds,
    enteredEvidenceIds,
    exitedEvidenceIds,
    retainedEvidenceIds,
    rerankedEvidenceIds,
    previousTopCount: previousTopEvidenceIds.length,
    currentTopCount: currentTopEvidenceIds.length
  };
}
