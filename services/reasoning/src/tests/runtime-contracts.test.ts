import {
  computeConfidenceWeightedScore,
  computeContradictionWeightedScore,
  computeFreshnessState,
  computeZoneStrengthScore,
  computeZoneTouchCountScore,
  mapContradictionRegime,
  mapInvalidationRiskLabel
} from '../../../../packages/domain/src/contracts/helpers.js';

function assert(condition: boolean, message: string): void {
  if (!condition) throw new Error(`Assertion failed: ${message}`);
}

export function runRuntimeContractFormulaTests(): void {
  const highConfidence = computeConfidenceWeightedScore({
    sourceIntegrity: 95,
    eventAlignment: 90,
    priceAcceptance: 88,
    contradictionPenalty: 5,
    stalenessPenalty: 2
  });
  const penalizedConfidence = computeConfidenceWeightedScore({
    sourceIntegrity: 95,
    eventAlignment: 90,
    priceAcceptance: 88,
    contradictionPenalty: 90,
    stalenessPenalty: 80
  });
  assert(highConfidence > penalizedConfidence, 'confidence penalties must lower score');
  assert(computeConfidenceWeightedScore({ sourceIntegrity: 200, eventAlignment: 200, priceAcceptance: 200, contradictionPenalty: 0, stalenessPenalty: 0 }) === 100, 'confidence must clamp at 100');

  const contradictionScore = computeContradictionWeightedScore({
    narrativeConflict: 40,
    priceConflict: 50,
    eventConflict: 30,
    macroConflict: 20,
    timeframeConflict: 10
  });
  assert(contradictionScore === 35, 'contradiction weighted score must match exact formula');

  assert(mapContradictionRegime(14.99) === 'none', '14.99 => none');
  assert(mapContradictionRegime(15) === 'low', '15 => low');
  assert(mapContradictionRegime(34.99) === 'low', '34.99 => low');
  assert(mapContradictionRegime(35) === 'moderate', '35 => moderate');
  assert(mapContradictionRegime(59.99) === 'moderate', '59.99 => moderate');
  assert(mapContradictionRegime(60) === 'high', '60 => high');
  assert(mapContradictionRegime(79.99) === 'high', '79.99 => high');
  assert(mapContradictionRegime(80) === 'critical', '80 => critical');

  const freshnessM5 = computeFreshnessState({ timeframe: 'M5', hoursSinceLastMaterialUpdate: 3, lastMaterialUpdateAt: '2026-01-15T00:00:00.000Z', componentsVersion: 'c1r' });
  const freshnessH4 = computeFreshnessState({ timeframe: 'H4', hoursSinceLastMaterialUpdate: 3, lastMaterialUpdateAt: '2026-01-15T00:00:00.000Z', componentsVersion: 'c1r' });
  const freshnessD1 = computeFreshnessState({ timeframe: 'D1', hoursSinceLastMaterialUpdate: 3, lastMaterialUpdateAt: '2026-01-15T00:00:00.000Z', componentsVersion: 'c1r' });
  assert(freshnessM5.freshnessScore < freshnessH4.freshnessScore, 'M5 should decay faster than H4');
  assert(freshnessD1.freshnessScore > freshnessH4.freshnessScore, 'D1 should decay slowest');
  assert(computeFreshnessState({ timeframe: 'M5', hoursSinceLastMaterialUpdate: 6, lastMaterialUpdateAt: '2026-01-15T00:00:00.000Z', componentsVersion: 'c1r' }).stale, 'M5 stale threshold should trigger at 6h');

  assert(computeZoneTouchCountScore(0) === 0, 'touch 0 => 0');
  assert(computeZoneTouchCountScore(1) === 20, 'touch 1 => 20');
  assert(computeZoneTouchCountScore(5) === 100, 'touch 5 => 100');
  assert(computeZoneTouchCountScore(8) === 100, 'touch >5 => 100');

  const weakZone = computeZoneStrengthScore({
    touchCount: 1,
    reactionMagnitudeScore: 35,
    recencyScore: 40,
    wickBodyRespectScore: 42,
    multiTimeframeConfluenceScore: 33
  });
  const strongZone = computeZoneStrengthScore({
    touchCount: 5,
    reactionMagnitudeScore: 90,
    recencyScore: 75,
    wickBodyRespectScore: 70,
    multiTimeframeConfluenceScore: 72
  });
  assert(strongZone > weakZone, 'zone strength must increase with stronger weighted inputs');

  assert(mapInvalidationRiskLabel(null) === 'guarded', 'null => guarded');
  assert(mapInvalidationRiskLabel(0) === 'guarded', '0 => guarded');
  assert(mapInvalidationRiskLabel(24) === 'guarded', '24 => guarded');
  assert(mapInvalidationRiskLabel(25) === 'warning', '25 => warning');
  assert(mapInvalidationRiskLabel(49) === 'warning', '49 => warning');
  assert(mapInvalidationRiskLabel(50) === 'fragile', '50 => fragile');
  assert(mapInvalidationRiskLabel(74) === 'fragile', '74 => fragile');
  assert(mapInvalidationRiskLabel(75) === 'broken', '75 => broken');
  assert(mapInvalidationRiskLabel(100) === 'broken', '100 => broken');
}
