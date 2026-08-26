import type { NormalizedCandle } from '@elceo/schemas';
import type { AssetCognitionState, EvidenceAssembly } from '@elceo/types';
import type { ChartIntelligenceOutput } from './contracts/chart-contract';
import { detectH4Zones, detectH4ZonesDeterministic } from './zones/detect-h4-zones';
import { buildChartAnnotations, buildChartAnnotationsDeterministic } from './annotations/build-annotations';
import { buildDashboardViewModel } from './dashboard/build-dashboard-view-model';

export class ChartIntelligenceService {
  computeH4Zones(assetCode: string, candles: NormalizedCandle[]) {
    return detectH4Zones(assetCode, candles);
  }

  computeH4ZonesAt(assetCode: string, candles: NormalizedCandle[], evaluatedAt: string) {
    return detectH4ZonesDeterministic(assetCode, candles, evaluatedAt);
  }

  buildAnnotationsAt(assetCode: string, cognition: AssetCognitionState, evidence: EvidenceAssembly, candles: NormalizedCandle[], evaluatedAt: string, impulseObservedAt?: string) {
    const zones = this.computeH4ZonesAt(assetCode, candles, evaluatedAt);
    return buildChartAnnotationsDeterministic(assetCode, zones, cognition, evidence, impulseObservedAt);
  }

  buildAnnotations(assetCode: string, cognition: AssetCognitionState, evidence: EvidenceAssembly, candles: NormalizedCandle[]) {
    const zones = this.computeH4Zones(assetCode, candles);
    return buildChartAnnotations(assetCode, zones, cognition, evidence);
  }

  buildChartIntelligence(assetCode: string, cognition: AssetCognitionState, evidence: EvidenceAssembly, candles: NormalizedCandle[]): ChartIntelligenceOutput {
    const zones = this.computeH4Zones(assetCode, candles);
    const annotations = buildChartAnnotations(assetCode, zones, cognition, evidence);
    const dashboardViewModel = buildDashboardViewModel(cognition, zones, annotations);

    return {
      zones,
      annotations,
      dashboardViewModel
    };
  }
}
