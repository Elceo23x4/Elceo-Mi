import { buildCanonicalCognitionStateFixture } from '../../../../packages/schemas/src/test-fixtures.js';
import { buildInvalidationDelta } from '../delta/invalidation-delta.js';

function assert(condition: boolean, message: string): void {
  if (!condition) throw new Error(`Assertion failed: ${message}`);
}

export function runInvalidationDeltaTests(): void {
  const previous = buildCanonicalCognitionStateFixture({
    invalidation: {
      ...buildCanonicalCognitionStateFixture().invalidation,
      primary: {
        ...buildCanonicalCognitionStateFixture().invalidation.primary!,
        price: 100
      },
      riskLabel: 'warning'
    }
  });
  const current = buildCanonicalCognitionStateFixture({
    invalidation: {
      ...buildCanonicalCognitionStateFixture().invalidation,
      primary: {
        ...buildCanonicalCognitionStateFixture().invalidation.primary!,
        price: 112
      },
      riskLabel: 'fragile'
    }
  });

  const delta = buildInvalidationDelta(previous, current);
  assert(delta.priceChanged === true, 'priceChanged should detect primary price movement');
  assert(delta.absolutePriceDelta === 12, 'absolute price delta should be exact rounded magnitude');
  assert(delta.riskLabelChanged === true, 'risk label change should be detected');
}
