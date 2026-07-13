import type { ExpectationHorizon, ExpectationRealityEvaluation, ExpectationRecord, ObservationSet, PathClassification, RealityMeasures } from './contracts';
import { calculateObservationContentHash } from './identity';
import { EXPECTATION_REALITY_POLICY_V1 } from './policy';

function pct(from: number, to: number): number { return ((to - from) / from) * 100; }
function severity(score: number) { const t = EXPECTATION_REALITY_POLICY_V1.severityThresholds; return score >= t.critical ? 'critical' : score >= t.major ? 'major' : score >= t.moderate ? 'moderate' : score >= t.minor ? 'minor' : 'none'; }
function abs(n: number | null): number { return Math.abs(n ?? 0); }
function evaluationId(expectationId: string, horizon: string, observationVersion: string): string { return `exrev-${expectationId}-${horizon}-${observationVersion}`; }
function pushUnique(a: string[], c: string): void { if (!a.includes(c)) a.push(c); }
function finiteTime(value: string): boolean { const t = Date.parse(value); return Number.isFinite(t); }

export function validateObservationCandles(expectation: ExpectationRecord, observations: ObservationSet, evaluatedAt: string): string[] {
  const errors: string[] = [];
  if (observations.asset !== expectation.asset) pushUnique(errors, 'asset_mismatch_rejected');
  if (observations.timeframe !== expectation.timeframe) pushUnique(errors, 'timeframe_mismatch_rejected');
  if (!finiteTime(observations.observedWindow.start) || !finiteTime(observations.observedWindow.end) || Date.parse(observations.observedWindow.start) >= Date.parse(observations.observedWindow.end)) pushUnique(errors, 'invalid_observation_window');
  const calculatedHash = calculateObservationContentHash(observations);
  if (observations.contentHash && observations.contentHash !== calculatedHash) pushUnique(errors, 'observation_content_hash_mismatch');
  if (observations.source.contentHash && observations.source.contentHash !== calculatedHash) pushUnique(errors, 'source_content_hash_mismatch');
  let lastClosed = '';
  const durationMs = EXPECTATION_REALITY_POLICY_V1.timeframeMinutes[expectation.timeframe] * 60_000;
  for (const candle of observations.candles) {
    if (!finiteTime(candle.openedAt) || !finiteTime(candle.closedAt)) pushUnique(errors, 'invalid_timestamp_rejected');
    if (finiteTime(candle.openedAt) && Date.parse(candle.openedAt) < Date.parse(observations.observedWindow.start)) pushUnique(errors, 'candle_outside_observed_window');
    if (finiteTime(candle.closedAt) && Date.parse(candle.closedAt) > Date.parse(observations.observedWindow.end)) pushUnique(errors, 'candle_outside_observed_window');
    if (!candle.complete) pushUnique(errors, 'observation_window_incomplete');
    if (Date.parse(candle.openedAt) >= Date.parse(candle.closedAt)) pushUnique(errors, 'invalid_timestamp_rejected');
    if (Date.parse(candle.closedAt) - Date.parse(candle.openedAt) !== durationMs) pushUnique(errors, 'wrong_bar_duration_rejected');
    if (Date.parse(candle.openedAt) < Date.parse(expectation.issuedAt) && candle.verifiedPostEventSplit !== true) pushUnique(errors, 'pre_issuance_candle_rejected');
    if (Date.parse(candle.closedAt) <= Date.parse(expectation.issuedAt)) pushUnique(errors, 'observation_window_incomplete');
    if (Date.parse(candle.closedAt) > Date.parse(evaluatedAt)) pushUnique(errors, 'future_data_rejected');
    if ([candle.open, candle.high, candle.low, candle.close].some((v) => !Number.isFinite(v) || v <= 0)) pushUnique(errors, 'invalid_ohlc_rejected');
    if (lastClosed && candle.closedAt === lastClosed) pushUnique(errors, 'duplicate_candle_rejected');
    if (lastClosed && Date.parse(candle.closedAt) <= Date.parse(lastClosed)) pushUnique(errors, 'out_of_order_candle_rejected');
    if (candle.high < Math.max(candle.open, candle.close) || candle.low > Math.min(candle.open, candle.close) || candle.high < candle.low) pushUnique(errors, 'invalid_ohlc_rejected');
    lastClosed = candle.closedAt;
  }
  return errors;
}

function horizonCandles(expectation: ExpectationRecord, observations: ObservationSet, requiredBars: number) {
  return observations.candles.filter((c) => c.complete && Date.parse(c.openedAt) >= Date.parse(expectation.issuedAt) && Date.parse(c.closedAt) > Date.parse(expectation.issuedAt) ).slice(0, requiredBars);
}

export function evaluateExpectationReality(params: { expectation: ExpectationRecord; observations: ObservationSet; horizon: ExpectationHorizon; evaluatedAt: string }): ExpectationRealityEvaluation {
  const { expectation, observations, horizon, evaluatedAt } = params;
  const reasonCodes: string[] = [];
  const warnings: string[] = [];
  const requiredBars: number = EXPECTATION_REALITY_POLICY_V1.horizons[horizon];
  const calculatedObservationHash = calculateObservationContentHash(observations);
  const normalizedObservations = { ...observations, contentHash: calculatedObservationHash, source: { ...observations.source, contentHash: observations.source.contentHash ?? calculatedObservationHash } };
  const candles = horizonCandles(expectation, normalizedObservations, requiredBars);
  const validation = validateObservationCandles(expectation, normalizedObservations, evaluatedAt);
  reasonCodes.push(...validation);
  const insufficient = validation.length > 0 || candles.length < requiredBars;
  if (candles.length < requiredBars) pushUnique(reasonCodes, 'observation_window_incomplete');
  const badVol = !expectation.recentRangePct || expectation.recentRangePct <= 0 || !Number.isFinite(expectation.recentRangePct);
  if (badVol) { warnings.push('volatility_context_unavailable'); pushUnique(reasonCodes, 'volatility_context_unavailable'); }

  let maxUp = 0, maxDown = 0; let firstMaterialMoveAt: string | null = null; let firstMaterialMoveDirection: RealityMeasures['firstMaterialMoveDirection'] = 'none';
  let upConfirmAt: string | null = null, downConfirmAt: string | null = null, invalidationBreachedAt: string | null = null;
  let upConfirmIndex: number | null = null, downConfirmIndex: number | null = null;
  for (const [index, c] of candles.entries()) {
    const up = pct(expectation.basePrice, c.high); const down = pct(expectation.basePrice, c.low);
    if (up > maxUp) maxUp = up; if (down < maxDown) maxDown = down;
    const upVu = badVol ? 0 : Math.max(0, up) / expectation.recentRangePct!; const downVu = badVol ? 0 : Math.max(0, -down) / expectation.recentRangePct!;
    if (!firstMaterialMoveAt && (upVu >= EXPECTATION_REALITY_POLICY_V1.movementBoundaries.materialVolUnits || downVu >= EXPECTATION_REALITY_POLICY_V1.movementBoundaries.materialVolUnits)) { firstMaterialMoveAt = c.closedAt; firstMaterialMoveDirection = upVu >= downVu ? 'up' : 'down'; }
    if (!upConfirmAt && upVu >= EXPECTATION_REALITY_POLICY_V1.movementBoundaries.confirmationVolUnits) { upConfirmAt = c.closedAt; upConfirmIndex = index; }
    if (!downConfirmAt && downVu >= EXPECTATION_REALITY_POLICY_V1.movementBoundaries.confirmationVolUnits) { downConfirmAt = c.closedAt; downConfirmIndex = index; }
    const inv = expectation.invalidationState.primary;
    if (!invalidationBreachedAt && inv) {
      if (inv.side === 'bullish_invalidation' && c.low <= inv.price) invalidationBreachedAt = c.closedAt;
      if (inv.side === 'bearish_invalidation' && c.high >= inv.price) invalidationBreachedAt = c.closedAt;
      if (inv.side === 'neutral_break' && (c.high >= inv.price || c.low <= inv.price)) invalidationBreachedAt = c.closedAt;
    }
  }
  const terminal = candles[requiredBars - 1] ? pct(expectation.basePrice, candles[requiredBars - 1]!.close) : null;
  const bullish = expectation.expectedBias === 'bullish', bearish = expectation.expectedBias === 'bearish', neutral = expectation.expectedBias === 'neutral';
  const expectedAt = bullish ? upConfirmAt : bearish ? downConfirmAt : null; const oppositeAt = bullish ? downConfirmAt : bearish ? upConfirmAt : null; const expectedIndex = bullish ? upConfirmIndex : bearish ? downConfirmIndex : null;
  const favPct = bullish ? maxUp : bearish ? Math.abs(maxDown) : Math.max(maxUp, Math.abs(maxDown)); const advPct = bullish ? Math.abs(maxDown) : bearish ? maxUp : Math.max(maxUp, Math.abs(maxDown));
  const measures: RealityMeasures = { terminalReturnPct: terminal, maximumFavourableExcursionPct: favPct, maximumAdverseExcursionPct: advPct, terminalReturnVolUnits: badVol || terminal === null ? null : terminal / expectation.recentRangePct!, favourableExcursionVolUnits: badVol ? null : favPct / expectation.recentRangePct!, adverseExcursionVolUnits: badVol ? null : advPct / expectation.recentRangePct!, firstMaterialMoveDirection, firstMaterialMoveAt, confirmationReachedAt: expectedAt, contradictionReachedAt: oppositeAt, invalidationBreachedAt };

  let outcome: ExpectationRealityEvaluation['outcome'] = 'unresolved'; let path: PathClassification = 'range_bound';
  if (insufficient || badVol) { outcome = 'insufficient_data'; path = 'insufficient_path'; }
  else if (!bullish && !bearish && !neutral) { outcome = 'not_directionally_scorable'; path = 'range_bound'; }
  else if (neutral) { outcome = abs(measures.terminalReturnVolUnits) < EXPECTATION_REALITY_POLICY_V1.movementBoundaries.materialVolUnits && !upConfirmAt && !downConfirmAt ? 'confirmed' : 'contradicted'; path = outcome === 'confirmed' ? 'range_bound' : 'two_sided_expansion'; pushUnique(reasonCodes, outcome === 'confirmed' ? 'neutral_expectation_preserved' : 'expected_direction_contradicted'); }
  else if (invalidationBreachedAt && expectedAt === invalidationBreachedAt) { outcome = 'two_sided_whipsaw'; path = 'intrabar_order_unknown'; pushUnique(reasonCodes, 'intrabar_order_unknown'); }
  else if (invalidationBreachedAt && (!expectedAt || Date.parse(invalidationBreachedAt) < Date.parse(expectedAt))) { outcome = 'invalidated'; path = 'invalidation_first'; pushUnique(reasonCodes, 'invalidation_before_confirmation'); }
  else if (expectedAt && oppositeAt) { outcome = 'two_sided_whipsaw'; path = expectedAt === oppositeAt ? 'intrabar_order_unknown' : Date.parse(expectedAt) < Date.parse(oppositeAt) ? 'confirmation_then_reversal' : 'contradiction_first'; pushUnique(reasonCodes, 'two_sided_whipsaw_detected'); if (path === 'confirmation_then_reversal') pushUnique(reasonCodes, 'confirmation_then_reversal'); }
  else if (expectedAt) { outcome = horizon === 'follow_through' && expectedIndex !== null && expectedIndex >= EXPECTATION_REALITY_POLICY_V1.horizons.confirmation ? 'delayed_confirmation' : 'confirmed'; path = firstMaterialMoveDirection === (bullish ? 'down' : 'up') ? 'adverse_then_confirmed' : 'clean_confirmation'; pushUnique(reasonCodes, 'expected_direction_confirmed'); pushUnique(reasonCodes, path === 'adverse_then_confirmed' ? 'adversity_before_confirmation' : 'confirmation_before_adversity'); }
  else if (oppositeAt) { outcome = 'contradicted'; path = 'contradiction_first'; pushUnique(reasonCodes, 'expected_direction_contradicted'); }
  else if ((measures.favourableExcursionVolUnits ?? 0) >= EXPECTATION_REALITY_POLICY_V1.movementBoundaries.materialVolUnits) { outcome = 'partially_confirmed'; path = 'delayed_resolution'; pushUnique(reasonCodes, 'expected_direction_partially_confirmed'); }
  else { pushUnique(reasonCodes, 'terminal_move_unresolved'); }
  if ((measures.favourableExcursionVolUnits ?? 0) >= EXPECTATION_REALITY_POLICY_V1.movementBoundaries.strongVolUnits || (measures.adverseExcursionVolUnits ?? 0) >= EXPECTATION_REALITY_POLICY_V1.movementBoundaries.strongVolUnits) pushUnique(reasonCodes, 'strong_movement_detected');
  if (outcome === 'confirmed' && expectation.confidenceScore < 45) pushUnique(reasonCodes, 'underconfident_confirmation');
  if ((outcome === 'contradicted' || outcome === 'invalidated') && expectation.confidenceScore >= 70) pushUnique(reasonCodes, 'confidence_outcome_mismatch');
  const directionDelta = outcome === 'confirmed' ? 0 : outcome === 'partially_confirmed' ? 20 : outcome === 'unresolved' ? 35 : outcome === 'insufficient_data' ? 10 : outcome === 'not_directionally_scorable' ? 5 : 80;
  const pathDelta = path === 'clean_confirmation' || path === 'range_bound' ? 0 : path === 'insufficient_path' ? 10 : 45;
  const magnitudeDelta = Math.min(100, Math.max(0, abs(measures.adverseExcursionVolUnits) * 35));
  const timingDelta = outcome === 'delayed_confirmation' || path === 'delayed_resolution' ? 40 : 0;
  const invalidationDelta = outcome === 'invalidated' ? 100 : 0;
  const confidenceOutcomeConsistency = reasonCodes.includes('confidence_outcome_mismatch') ? 80 : reasonCodes.includes('underconfident_confirmation') ? 25 : 0;
  const compositeDeltaScore = Math.round(Math.min(100, directionDelta * (EXPECTATION_REALITY_POLICY_V1.deltaWeights.direction / 100) + pathDelta * (EXPECTATION_REALITY_POLICY_V1.deltaWeights.path / 100) + magnitudeDelta * (EXPECTATION_REALITY_POLICY_V1.deltaWeights.magnitude / 100) + timingDelta * (EXPECTATION_REALITY_POLICY_V1.deltaWeights.timing / 100) + invalidationDelta * (EXPECTATION_REALITY_POLICY_V1.deltaWeights.invalidation / 100) + confidenceOutcomeConsistency * (EXPECTATION_REALITY_POLICY_V1.deltaWeights.confidence / 100)));
  return { evaluationId: evaluationId(expectation.expectationId, horizon, observations.observationVersion), expectationId: expectation.expectationId, asset: expectation.asset, timeframe: expectation.timeframe, horizon, observationVersion: observations.observationVersion, observationContentHash: calculatedObservationHash, evaluatedAt, policyVersion: EXPECTATION_REALITY_POLICY_V1.version, outcome, pathClassification: path, measures, delta: { directionDelta, pathDelta, magnitudeDelta, timingDelta, invalidationDelta, confidenceOutcomeConsistency, compositeDeltaScore, deltaSeverity: severity(compositeDeltaScore), reasonCodes, warnings, rationale: `Expectation ${expectation.expectationId} evaluated against ${candles.length} completed observation bars for ${horizon}; outcome ${outcome} with path ${path}.` }, createdAt: evaluatedAt };
}
