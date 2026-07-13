import type { ExpectationHorizon, ExpectationRealityEvaluation, ExpectationRecord, ObservationCandle, ObservationSet, PathClassification, RealityMeasures } from './contracts';
import { EXPECTATION_REALITY_POLICY_V1 } from './policy';

function pct(from: number, to: number): number { return ((to - from) / from) * 100; }
function severity(score: number) { return score >= 80 ? 'critical' : score >= 60 ? 'major' : score >= 35 ? 'moderate' : score >= 15 ? 'minor' : 'none'; }
function abs(n: number | null): number { return Math.abs(n ?? 0); }
function evaluationId(expectationId: string, horizon: string, observationVersion: string): string { return `exrev-${expectationId}-${horizon}-${observationVersion}`; }
function pushUnique(a: string[], c: string): void { if (!a.includes(c)) a.push(c); }

export function validateObservationCandles(expectation: ExpectationRecord, candles: ObservationCandle[], evaluatedAt: string): string[] {
  const errors: string[] = [];
  let lastClosed = '';
  for (const candle of candles) {
    if (!candle.complete) pushUnique(errors, 'observation_window_incomplete');
    if (Date.parse(candle.closedAt) <= Date.parse(expectation.issuedAt)) pushUnique(errors, 'observation_window_incomplete');
    if (Date.parse(candle.closedAt) > Date.parse(evaluatedAt)) pushUnique(errors, 'future_data_rejected');
    if (lastClosed && candle.closedAt === lastClosed) pushUnique(errors, 'duplicate_candle_rejected');
    if (lastClosed && Date.parse(candle.closedAt) <= Date.parse(lastClosed)) pushUnique(errors, 'out_of_order_candle_rejected');
    if (candle.high < Math.max(candle.open, candle.close) || candle.low > Math.min(candle.open, candle.close) || candle.high < candle.low) pushUnique(errors, 'invalid_ohlc_rejected');
    lastClosed = candle.closedAt;
  }
  return errors;
}

export function evaluateExpectationReality(params: { expectation: ExpectationRecord; observations: ObservationSet; horizon: ExpectationHorizon; evaluatedAt: string }): ExpectationRealityEvaluation {
  const { expectation, observations, horizon, evaluatedAt } = params;
  const reasonCodes: string[] = [];
  const warnings: string[] = [];
  const requiredBars: number = EXPECTATION_REALITY_POLICY_V1.horizons[horizon];
  const validation = validateObservationCandles(expectation, observations.candles, evaluatedAt);
  reasonCodes.push(...validation);
  const usable = observations.candles.filter((c) => c.complete && Date.parse(c.closedAt) > Date.parse(expectation.issuedAt) && Date.parse(c.closedAt) <= Date.parse(evaluatedAt));
  const insufficient = validation.length > 0 || usable.length < requiredBars;
  if (usable.length < requiredBars) pushUnique(reasonCodes, 'observation_window_incomplete');
  const candles = usable.slice(0, requiredBars);
  const badVol = !expectation.recentRangePct || expectation.recentRangePct <= 0 || !Number.isFinite(expectation.recentRangePct);
  if (badVol) { warnings.push('volatility_context_unavailable'); pushUnique(reasonCodes, 'volatility_context_unavailable'); }

  let maxUp = 0, maxDown = 0; let firstMaterialMoveAt: string | null = null; let firstMaterialMoveDirection: RealityMeasures['firstMaterialMoveDirection'] = 'none';
  let upConfirmAt: string | null = null, downConfirmAt: string | null = null, invalidationBreachedAt: string | null = null;
  for (const c of candles) {
    const up = pct(expectation.basePrice, c.high); const down = pct(expectation.basePrice, c.low);
    if (up > maxUp) maxUp = up; if (down < maxDown) maxDown = down;
    const upVu = badVol ? 0 : Math.max(0, up) / expectation.recentRangePct!; const downVu = badVol ? 0 : Math.max(0, -down) / expectation.recentRangePct!;
    if (!firstMaterialMoveAt && (upVu >= 0.5 || downVu >= 0.5)) { firstMaterialMoveAt = c.closedAt; firstMaterialMoveDirection = upVu >= downVu ? 'up' : 'down'; }
    if (!upConfirmAt && upVu >= 1) upConfirmAt = c.closedAt;
    if (!downConfirmAt && downVu >= 1) downConfirmAt = c.closedAt;
    const inv = expectation.invalidationState.primary;
    if (!invalidationBreachedAt && inv) {
      if (inv.side === 'bullish_invalidation' && c.low <= inv.price) invalidationBreachedAt = c.closedAt;
      if (inv.side === 'bearish_invalidation' && c.high >= inv.price) invalidationBreachedAt = c.closedAt;
      if (inv.side === 'neutral_break' && (c.high >= inv.price || c.low <= inv.price)) invalidationBreachedAt = c.closedAt;
    }
  }
  const terminal = candles[requiredBars - 1] ? pct(expectation.basePrice, candles[requiredBars - 1]!.close) : null;
  const bullish = expectation.expectedBias === 'bullish', bearish = expectation.expectedBias === 'bearish', neutral = expectation.expectedBias === 'neutral';
  const expectedAt = bullish ? upConfirmAt : bearish ? downConfirmAt : null; const oppositeAt = bullish ? downConfirmAt : bearish ? upConfirmAt : null;
  const favPct = bullish ? maxUp : bearish ? Math.abs(maxDown) : Math.max(maxUp, Math.abs(maxDown)); const advPct = bullish ? Math.abs(maxDown) : bearish ? maxUp : Math.max(maxUp, Math.abs(maxDown));
  const measures: RealityMeasures = { terminalReturnPct: terminal, maximumFavourableExcursionPct: favPct, maximumAdverseExcursionPct: advPct, terminalReturnVolUnits: badVol || terminal === null ? null : terminal / expectation.recentRangePct!, favourableExcursionVolUnits: badVol ? null : favPct / expectation.recentRangePct!, adverseExcursionVolUnits: badVol ? null : advPct / expectation.recentRangePct!, firstMaterialMoveDirection, firstMaterialMoveAt, confirmationReachedAt: expectedAt, contradictionReachedAt: oppositeAt, invalidationBreachedAt };

  let outcome: ExpectationRealityEvaluation['outcome'] = 'unresolved'; let path: PathClassification = 'range_bound';
  if (insufficient || badVol) { outcome = 'insufficient_data'; path = 'insufficient_path'; }
  else if (!bullish && !bearish && !neutral) { outcome = 'not_directionally_scorable'; path = 'range_bound'; }
  else if (neutral) { outcome = abs(measures.terminalReturnVolUnits) < 0.5 && !upConfirmAt && !downConfirmAt ? 'confirmed' : 'contradicted'; path = outcome === 'confirmed' ? 'range_bound' : 'two_sided_expansion'; pushUnique(reasonCodes, outcome === 'confirmed' ? 'neutral_expectation_preserved' : 'expected_direction_contradicted'); }
  else if (invalidationBreachedAt && (!expectedAt || Date.parse(invalidationBreachedAt) < Date.parse(expectedAt))) { outcome = 'invalidated'; path = 'invalidation_first'; pushUnique(reasonCodes, 'invalidation_before_confirmation'); }
  else if (expectedAt && oppositeAt) { outcome = 'two_sided_whipsaw'; path = Date.parse(expectedAt) < Date.parse(oppositeAt) ? 'confirmation_then_reversal' : 'contradiction_first'; pushUnique(reasonCodes, 'two_sided_whipsaw_detected'); if (path === 'confirmation_then_reversal') pushUnique(reasonCodes, 'confirmation_then_reversal'); }
  else if (expectedAt) { outcome = horizon === 'follow_through' && !upConfirmAt && !downConfirmAt ? 'delayed_confirmation' : 'confirmed'; path = oppositeAt && Date.parse(oppositeAt) < Date.parse(expectedAt) ? 'adverse_then_confirmed' : 'clean_confirmation'; pushUnique(reasonCodes, 'expected_direction_confirmed'); pushUnique(reasonCodes, path === 'adverse_then_confirmed' ? 'adversity_before_confirmation' : 'confirmation_before_adversity'); }
  else if (oppositeAt) { outcome = 'contradicted'; path = 'contradiction_first'; pushUnique(reasonCodes, 'expected_direction_contradicted'); }
  else if ((measures.favourableExcursionVolUnits ?? 0) >= 0.5) { outcome = 'partially_confirmed'; path = 'delayed_resolution'; pushUnique(reasonCodes, 'expected_direction_partially_confirmed'); }
  else { pushUnique(reasonCodes, 'terminal_move_unresolved'); }
  if (outcome === 'confirmed' && expectation.confidenceScore < 45) pushUnique(reasonCodes, 'underconfident_confirmation');
  if ((outcome === 'contradicted' || outcome === 'invalidated') && expectation.confidenceScore >= 70) pushUnique(reasonCodes, 'confidence_outcome_mismatch');
  const directionDelta = outcome === 'confirmed' ? 0 : outcome === 'partially_confirmed' ? 20 : outcome === 'unresolved' ? 35 : outcome === 'insufficient_data' ? 10 : 80;
  const pathDelta = path === 'clean_confirmation' || path === 'range_bound' ? 0 : path === 'insufficient_path' ? 10 : 45;
  const magnitudeDelta = Math.min(100, Math.max(0, abs(measures.adverseExcursionVolUnits) * 35));
  const timingDelta = outcome === 'delayed_confirmation' || path === 'delayed_resolution' ? 40 : 0;
  const invalidationDelta = outcome === 'invalidated' ? 100 : 0;
  const confidenceOutcomeConsistency = reasonCodes.includes('confidence_outcome_mismatch') ? 80 : reasonCodes.includes('underconfident_confirmation') ? 25 : 0;
  const compositeDeltaScore = Math.round(Math.min(100, directionDelta * .3 + pathDelta * .2 + magnitudeDelta * .15 + timingDelta * .1 + invalidationDelta * .15 + confidenceOutcomeConsistency * .1));
  return { evaluationId: evaluationId(expectation.expectationId, horizon, observations.observationVersion), expectationId: expectation.expectationId, asset: expectation.asset, timeframe: expectation.timeframe, horizon, observationVersion: observations.observationVersion, evaluatedAt, policyVersion: EXPECTATION_REALITY_POLICY_V1.version, outcome, pathClassification: path, measures, delta: { directionDelta, pathDelta, magnitudeDelta, timingDelta, invalidationDelta, confidenceOutcomeConsistency, compositeDeltaScore, deltaSeverity: severity(compositeDeltaScore), reasonCodes, warnings, rationale: `Expectation ${expectation.expectationId} evaluated against ${candles.length} completed observation bars for ${horizon}; outcome ${outcome} with path ${path}.` }, createdAt: evaluatedAt };
}
