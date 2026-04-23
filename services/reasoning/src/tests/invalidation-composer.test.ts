import { mapInvalidationRiskLabel } from '@elceo/domain';
import { buildRankedEvidenceItemFixture, buildZoneSignificanceFixture } from '../../../../packages/schemas/src/test-fixtures.js';
import { composeInvalidationState } from '../engine/invalidation-composer.js';

function assert(condition: boolean, message: string): void {
  if (!condition) throw new Error(`Assertion failed: ${message}`);
}

const evidence = [
  buildRankedEvidenceItemFixture({ evidenceId: 'i1', finalRankScore: 80 }),
  buildRankedEvidenceItemFixture({ evidenceId: 'i2', finalRankScore: 70 }),
  buildRankedEvidenceItemFixture({ evidenceId: 'i3', finalRankScore: 60 })
];
const zones = [buildZoneSignificanceFixture({ zoneId: 'z1' })];

export function runInvalidationComposerTests(): void {
  const common = {
    asset: 'XAU/USD' as const,
    timeframe: 'H1' as const,
    confidenceScore: 50,
    contradictionScore: 60,
    freshnessScore: 80,
    recentPriceRange: { low: 100, high: 120, close: 110 },
    evidence,
    zones
  };

  const bullish = composeInvalidationState({ ...common, bias: 'bullish' });
  assert(bullish.primary?.price === 100, 'bullish primary invalidation should use recent low');

  const bearish = composeInvalidationState({ ...common, bias: 'bearish' });
  assert(bearish.primary?.price === 120, 'bearish primary invalidation should use recent high');

  const neutral = composeInvalidationState({ ...common, bias: 'neutral' });
  assert(neutral.primary?.price === 110, 'neutral primary invalidation should use close');

  const expectedLabel = mapInvalidationRiskLabel(bullish.primary?.severityScore ?? null);
  assert(bullish.riskLabel === expectedLabel, 'risk label mapping must use frozen helper');
}
