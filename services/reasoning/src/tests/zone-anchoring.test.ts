import { buildRankedEvidenceItemFixture, buildZoneSignificanceFixture } from '../../../../packages/schemas/src/test-fixtures.js';
import {
  anchorEvidenceToZones,
  buildZoneConfluenceSummary,
  computeEvidenceZoneLinkScore,
  computeZoneProximityScore,
  enrichEvidenceWithZoneAnchors,
  getDirectionZoneCompatibility,
  selectAnchorCandidateZones,
  sortZonesForAnchoring
} from '../engine/zone-anchoring.js';

function assert(condition: boolean, message: string): void {
  if (!condition) throw new Error(`Assertion failed: ${message}`);
}

export function runZoneAnchoringTests(): void {
  const zones = [
    buildZoneSignificanceFixture({ zoneId: 'zone-c', finalStrengthScore: 70, recencyScore: 50, touchCount: 2 }),
    buildZoneSignificanceFixture({ zoneId: 'zone-a', finalStrengthScore: 90, recencyScore: 40, touchCount: 1 }),
    buildZoneSignificanceFixture({ zoneId: 'zone-b', finalStrengthScore: 90, recencyScore: 40, touchCount: 3 }),
    buildZoneSignificanceFixture({ zoneId: 'zone-d', finalStrengthScore: 90, recencyScore: 80, touchCount: 1 })
  ];

  const sorted = sortZonesForAnchoring(zones);
  assert(sorted.map((zone) => zone.zoneId).join(',') === 'zone-d,zone-b,zone-a,zone-c', 'zones should sort by strength, recency, touch count, then zone id');

  const candidates = selectAnchorCandidateZones([
    ...zones,
    buildZoneSignificanceFixture({ zoneId: 'zone-e' }),
    buildZoneSignificanceFixture({ zoneId: 'zone-f' }),
    buildZoneSignificanceFixture({ zoneId: 'zone-g' }),
    buildZoneSignificanceFixture({ zoneId: 'zone-h' }),
    buildZoneSignificanceFixture({ zoneId: 'zone-i' })
  ]);
  assert(candidates.length === 8, 'candidate zone list should be capped to top 8');

  assert(getDirectionZoneCompatibility('bullish', 'demand') === 100, 'bullish should prefer demand zones');
  assert(getDirectionZoneCompatibility('bearish', 'supply') === 100, 'bearish should prefer supply zones');
  assert(getDirectionZoneCompatibility('mixed', 'neutral') === 85, 'mixed should prefer neutral zones');
  assert(getDirectionZoneCompatibility('neutral', 'demand') === 60, 'neutral should moderately support demand zones');

  const nearZone = buildZoneSignificanceFixture({ midpoint: 105 });
  const farZone = buildZoneSignificanceFixture({ midpoint: 130 });
  const insideScore = computeZoneProximityScore(nearZone, { high: 110, low: 100, close: 106 });
  const farScore = computeZoneProximityScore(farZone, { high: 110, low: 100, close: 106 });
  assert(insideScore === 100, 'inside midpoint should receive +10 bonus and clamp at 100');
  assert(farScore < insideScore, 'far midpoint should have lower score');

  const scoreStrong = computeEvidenceZoneLinkScore({
    evidence: buildRankedEvidenceItemFixture({ directionHint: 'bullish', kind: 'price_action' }),
    zone: buildZoneSignificanceFixture({ side: 'demand', finalStrengthScore: 90, midpoint: 106 }),
    recentPriceRange: { high: 110, low: 100, close: 106 },
    targetTimeframe: 'H1'
  });
  const scoreWeak = computeEvidenceZoneLinkScore({
    evidence: buildRankedEvidenceItemFixture({ directionHint: 'bullish', kind: 'news' }),
    zone: buildZoneSignificanceFixture({ side: 'supply', finalStrengthScore: 40, midpoint: 120, timeframe: 'H4' }),
    recentPriceRange: { high: 110, low: 100, close: 106 },
    targetTimeframe: 'H1'
  });
  assert(scoreStrong > scoreWeak, 'strong zone compatibility and proximity should produce higher link score');

  const evidence = buildRankedEvidenceItemFixture({
    evidenceId: 'ev-1',
    explanation: 'Core bullish evidence',
    occurredAt: '2026-01-15T10:00:00.000Z',
    directionHint: 'bullish',
    kind: 'market_structure'
  });

  const anchored = anchorEvidenceToZones({
    evidence,
    candidateZones: [
      buildZoneSignificanceFixture({ zoneId: 'zone-1', side: 'demand', midpoint: 106, finalStrengthScore: 85, lastInteractionAt: '2026-01-15T09:00:00.000Z' }),
      buildZoneSignificanceFixture({ zoneId: 'zone-2', side: 'demand', midpoint: 104, finalStrengthScore: 83, lastInteractionAt: '2026-01-15T08:00:00.000Z' }),
      buildZoneSignificanceFixture({ zoneId: 'zone-3', side: 'neutral', midpoint: 103, finalStrengthScore: 81, lastInteractionAt: '2026-01-15T07:00:00.000Z' }),
      buildZoneSignificanceFixture({ zoneId: 'zone-4', side: 'supply', midpoint: 128, finalStrengthScore: 70, lastInteractionAt: null })
    ],
    recentPriceRange: { high: 110, low: 100, close: 106 },
    targetTimeframe: 'H1'
  });

  assert(anchored.linkedZoneIds.length <= 3, 'anchor selection should cap at top 3 zones');
  assert(anchored.linkedCandleTimes[0] === '2026-01-15T10:00:00.000Z', 'linked candle times should start with evidence occurredAt');
  assert(anchored.linkedNotes[0] === 'Core bullish evidence', 'linked notes should begin with evidence explanation');

  const fallback = anchorEvidenceToZones({
    evidence: buildRankedEvidenceItemFixture({ evidenceId: 'ev-fallback', explanation: 'Fallback evidence', occurredAt: '2026-01-15T11:00:00.000Z', directionHint: 'bearish' }),
    candidateZones: [buildZoneSignificanceFixture({ zoneId: 'zone-fallback', side: 'demand', midpoint: 170, finalStrengthScore: 20 })],
    recentPriceRange: { high: 110, low: 100, close: 106 },
    targetTimeframe: 'H1'
  });
  assert(fallback.linkedZoneIds.length === 0, 'zone threshold >= 55 should be enforced');
  assert(fallback.linkedNotes.length === 1 && fallback.linkedNotes[0] === 'Fallback evidence', 'fallback notes should remain conservative');

  const enriched = enrichEvidenceWithZoneAnchors({
    evidence: [evidence, buildRankedEvidenceItemFixture({ evidenceId: 'ev-2', directionHint: 'bearish' })],
    zones: [
      buildZoneSignificanceFixture({ zoneId: 'zone-con-1', side: 'demand', midpoint: 106, finalStrengthScore: 85 }),
      buildZoneSignificanceFixture({ zoneId: 'zone-con-2', side: 'supply', midpoint: 109, finalStrengthScore: 88 })
    ],
    recentPriceRange: { high: 110, low: 100, close: 106 },
    targetTimeframe: 'H1'
  });

  const confluence = buildZoneConfluenceSummary(enriched, [
    buildZoneSignificanceFixture({ zoneId: 'zone-con-1', side: 'demand', midpoint: 106, finalStrengthScore: 85 }),
    buildZoneSignificanceFixture({ zoneId: 'zone-con-2', side: 'supply', midpoint: 109, finalStrengthScore: 88 })
  ]);

  assert(confluence.anchoredEvidenceCount >= 1, 'confluence summary should count anchored evidence');
  assert(confluence.activeAnchoredZoneIds.length >= 1, 'confluence summary should collect active anchored zones');
}
