import {
  computeConfidence,
  computeContradiction,
  computeDirectionalPressure,
  computeFreshness,
  computeRankingScore
} from '@elceo/domain';
import { normalizeEvent } from '@elceo/ingestion';
import { evidenceToCognition } from '../pipeline/evidence-to-cognition';
import type { EvidenceAssembly } from '@elceo/types';

function assert(condition: boolean, message: string): void {
  if (!condition) {
    throw new Error(`Assertion failed: ${message}`);
  }
}

const baseAssembly: EvidenceAssembly = {
  assemblyId: 'asm-1',
  assetCode: 'XAU/USD',
  assembledAtUtc: new Date().toISOString(),
  evidence: [
    {
      evidenceId: 'e-1',
      eventClass: 'macro_event',
      provider: 'finnhub',
      occurredAtUtc: new Date().toISOString(),
      summary: 'CPI surprise',
      relatedAssetCodes: ['XAU/USD']
    }
  ],
  supportingEventIds: ['evt-1'],
  contradictoryEventIds: []
};

export function runReasoningTests(): void {
  const normalized = normalizeEvent({
    type: 'news_article',
    provider: 'marketaux',
    articleId: 'a1',
    sourceName: 'marketaux',
    url: 'https://example.com',
    headline: 'Headline',
    summary: 'Summary',
    publishedAtUtc: new Date().toISOString(),
    mentionedAssets: ['XAU/USD'],
    dedupeKey: 'k'
  });
  assert(normalized.eventType === 'news_article', 'normalization handoff eventType');

  const pressure = computeDirectionalPressure('XAU/USD', {
    realYieldPressure: 10,
    dollarPressure: -5,
    safeHavenPressure: 8,
    policyPressure: 4,
    eventShockPressure: 7,
    growthPressure: 0,
    liquidityPressure: 0,
    sentimentPressure: 0,
    macroDivergencePressure: 0,
    policyDivergencePressure: 0,
    yieldsPressure: 0,
    eventSurprisePressure: 0
  });
  assert(pressure.components.length >= 5, 'gold pressure components');

  const confidence = computeConfidence({
    sourceConfidence: 70,
    eventStrength: 60,
    modelAgreement: 65,
    priceConfirmation: 58,
    historicalPattern: 54,
    contradictionPenalty: 20
  });
  assert(confidence.total > 0, 'confidence total');

  const contradiction = computeContradiction({
    expectedDirection: 'bullish',
    realizedDirection: 'bearish',
    deviationMagnitude: 70,
    elapsedMinutes: 120,
    zoneProximity: 65,
    regimeStress: 60
  });
  assert(contradiction.score >= 0, 'contradiction score');

  const freshness = computeFreshness('news_article', 90);
  assert(freshness >= 0 && freshness <= 100, 'freshness range');

  const ranking = computeRankingScore({
    portfolioRelevance: 80,
    recency: 65,
    significance: 70,
    confidence: 62,
    volatility: 55,
    contradiction: 60,
    urgency: 75
  });
  assert(ranking >= 0, 'ranking non-negative');

  const cognition = evidenceToCognition(baseAssembly);
  assert(cognition.intraday.asset_code === 'XAU/USD', 'cognition shape asset');
  assert(Array.isArray(cognition.intraday.directional_pressure_components), 'cognition pressure components shape');
}
