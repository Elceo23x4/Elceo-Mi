import {
  computeConfidence,
  computeContradiction,
  computeDirectionalPressure,
  computeFreshness,
  computeRankingScore,
  type PressureEvidenceInput
} from '@elceo/domain';
import type { EvidenceAssembly, AssetCognitionState } from '@elceo/types';

function derivePressureEvidence(assembly: EvidenceAssembly): PressureEvidenceInput {
  const shockCount = assembly.evidence.filter((item) => item.eventClass === 'geopolitical_event').length;
  const macroCount = assembly.evidence.filter((item) => item.eventClass === 'macro_event').length;
  const newsCount = assembly.evidence.filter((item) => item.eventClass === 'news_article').length;

  return {
    realYieldPressure: macroCount * 8,
    dollarPressure: macroCount * -5,
    safeHavenPressure: shockCount * 10,
    policyPressure: macroCount * 6,
    eventShockPressure: shockCount * 12,
    growthPressure: macroCount * 7,
    liquidityPressure: newsCount * 4,
    sentimentPressure: newsCount * 5,
    macroDivergencePressure: macroCount * 6,
    policyDivergencePressure: macroCount * 5,
    yieldsPressure: macroCount * 4,
    eventSurprisePressure: shockCount * 9
  };
}

function buildState(assetCode: string, timeHorizon: 'intraday' | 'swing', assembly: EvidenceAssembly): AssetCognitionState {
  const pressure = computeDirectionalPressure(assetCode, derivePressureEvidence(assembly));

  const contradiction = computeContradiction({
    expectedDirection: pressure.bias,
    realizedDirection: pressure.bias,
    deviationMagnitude: 15,
    elapsedMinutes: timeHorizon === 'intraday' ? 45 : 160,
    zoneProximity: 30,
    regimeStress: 28
  });

  const confidence = computeConfidence({
    sourceConfidence: 72,
    eventStrength: 66,
    modelAgreement: 62,
    priceConfirmation: 58,
    historicalPattern: 55,
    contradictionPenalty: contradiction.score
  });

  const freshness = computeFreshness('news_article', timeHorizon === 'intraday' ? 30 : 120);
  const freshnessExpiresAt = new Date(Date.now() + freshness * 60_000).toISOString();

  const ranking = computeRankingScore({
    portfolioRelevance: 78,
    recency: freshness,
    significance: 64,
    confidence: confidence.total,
    volatility: 57,
    contradiction: 100 - contradiction.score,
    urgency: 63
  });

  return {
    asset_code: assetCode,
    time_horizon: timeHorizon,
    directional_bias: pressure.bias,
    confidence_total: confidence.total,
    confidence_anatomy: confidence.anatomy,
    directional_pressure_components: pressure.components,
    contradiction_score: contradiction.score,
    contradiction_state: contradiction.state,
    supporting_event_ids: assembly.supportingEventIds,
    invalidating_event_ids: assembly.contradictoryEventIds,
    current_regime: contradiction.state === 'aligned' ? 'coherent' : 'transition',
    freshness_expires_at: freshnessExpiresAt,
    short_explanation: 'Deterministic cognition state assembled from normalized evidence.',
    deep_explanation: 'Pressure, confidence, contradiction, and freshness computed deterministically; narrative layer pending.',
    ranking_score: ranking
  };
}

export function evidenceToCognition(assembly: EvidenceAssembly): { intraday: AssetCognitionState; swing: AssetCognitionState } {
  return {
    intraday: buildState(assembly.assetCode, 'intraday', assembly),
    swing: buildState(assembly.assetCode, 'swing', assembly)
  };
}
