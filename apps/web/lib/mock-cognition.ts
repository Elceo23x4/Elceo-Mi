import { ChartIntelligenceService } from '@elceo/chart-intelligence';
import { ReasoningService } from '@elceo/reasoning';
import type { DashboardCognitionViewModel, EvidenceAssembly } from '@elceo/types';
import type { NormalizedCandle } from '@elceo/schemas';

function buildMockEvidence(assetCode: string): EvidenceAssembly {
  return {
    assemblyId: `asm-${assetCode}`,
    assetCode,
    assembledAtUtc: new Date().toISOString(),
    evidence: [
      {
        evidenceId: `${assetCode}-macro-1`,
        eventClass: 'macro_event',
        provider: 'finnhub',
        occurredAtUtc: new Date(Date.now() - 35 * 60_000).toISOString(),
        summary: 'Macro release surprise with moderate policy implications.',
        relatedAssetCodes: [assetCode]
      },
      {
        evidenceId: `${assetCode}-news-1`,
        eventClass: 'news_article',
        provider: 'marketaux',
        occurredAtUtc: new Date(Date.now() - 18 * 60_000).toISOString(),
        summary: 'Cross-asset sentiment cluster supporting directional continuation.',
        relatedAssetCodes: [assetCode]
      }
    ],
    supportingEventIds: [`${assetCode}-macro-1`, `${assetCode}-news-1`],
    contradictoryEventIds: []
  };
}

function buildMockH4Candles(assetCode: string): NormalizedCandle[] {
  return Array.from({ length: 24 }).map((_, i) => ({
    type: 'market_candle',
    provider: 'finnhub',
    assetCode,
    timeframe: 'H4',
    open: 2300 + i * 0.7,
    high: 2304 + i * 0.9,
    low: 2296 + i * 0.6,
    close: 2301 + i * 0.8,
    timestampUtc: new Date(Date.now() - (24 - i) * 4 * 60 * 60 * 1000).toISOString()
  }));
}

export function buildMockDashboardViewModel(assetCode = 'XAU/USD'): DashboardCognitionViewModel {
  const reasoning = new ReasoningService();
  const chartIntelligence = new ChartIntelligenceService();

  const evidence = buildMockEvidence(assetCode);
  const cognition = reasoning.reasonAssembly(evidence).intraday;
  const candles = buildMockH4Candles(assetCode);

  return chartIntelligence.buildChartIntelligence(assetCode, cognition, evidence, candles).dashboardViewModel;
}
