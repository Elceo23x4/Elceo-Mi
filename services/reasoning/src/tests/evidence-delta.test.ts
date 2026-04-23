import { buildCanonicalCognitionStateFixture } from '../../../../packages/schemas/src/test-fixtures.js';
import { buildEvidenceDelta } from '../delta/evidence-delta.js';

function assert(condition: boolean, message: string): void {
  if (!condition) throw new Error(`Assertion failed: ${message}`);
}

export function runEvidenceDeltaTests(): void {
  const previous = buildCanonicalCognitionStateFixture({
    evidence: {
      ranked: [],
      topEvidenceIds: ['e1', 'e2', 'e3', 'e4', 'e5'],
      evidenceCount: 5
    }
  });
  const current = buildCanonicalCognitionStateFixture({
    evidence: {
      ranked: [],
      topEvidenceIds: ['e2', 'e6', 'e4', 'e1', 'e7'],
      evidenceCount: 5
    }
  });

  const delta = buildEvidenceDelta(previous, current);
  assert(delta.enteredEvidenceIds.join(',') === 'e6,e7', 'entered evidence order should follow current topEvidenceIds');
  assert(delta.exitedEvidenceIds.join(',') === 'e3,e5', 'exited evidence order should follow previous topEvidenceIds');
  assert(delta.retainedEvidenceIds.join(',') === 'e2,e4,e1', 'retained evidence should follow current order');
  assert(delta.rerankedEvidenceIds.join(',') === 'e2,e4,e1', 'reranked evidence should include retained ids with index changes');
  assert(delta.previousTopCount === 5 && delta.currentTopCount === 5, 'top evidence counts should be exact');
}
