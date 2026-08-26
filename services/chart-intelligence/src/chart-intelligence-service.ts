import type { NormalizedCandle } from '@elceo/schemas';
import type { AssetCognitionState, EvidenceAssembly } from '@elceo/types';
import type { ChartIntelligenceOutput } from './contracts/chart-contract';
import { detectH4Zones, detectH4ZonesDeterministic } from './zones/detect-h4-zones';
import { buildChartAnnotations, buildLegacyChartAnnotationsDeterministic } from './annotations/build-annotations';
import { buildLegacyDashboardViewModel } from './dashboard/build-legacy-dashboard-view-model';

export class ChartIntelligenceService {
  computeH4Zones(assetCode: string, candles: NormalizedCandle[]) {
    return detectH4Zones(assetCode, candles);
  }

  computeH4ZonesAt(assetCode: string, candles: NormalizedCandle[], evaluatedAt: string) {
    return detectH4ZonesDeterministic(assetCode, candles, evaluatedAt);
  }

  /** @deprecated Legacy AssetCognitionState compatibility; not a canonical projection seam. */
  buildLegacyAnnotationsAt(assetCode: string, cognition: AssetCognitionState, evidence: EvidenceAssembly, candles: NormalizedCandle[], evaluatedAt: string, impulseObservedAt?: string) {
    const zones = this.computeH4ZonesAt(assetCode, candles, evaluatedAt);
    return buildLegacyChartAnnotationsDeterministic(assetCode, zones, cognition, evidence, impulseObservedAt);
  }

  buildAnnotations(assetCode: string, cognition: AssetCognitionState, evidence: EvidenceAssembly, candles: NormalizedCandle[]) {
    const zones = this.computeH4Zones(assetCode, candles);
    return buildChartAnnotations(assetCode, zones, cognition, evidence);
  }

  buildChartIntelligence(assetCode: string, cognition: AssetCognitionState, evidence: EvidenceAssembly, candles: NormalizedCandle[]): ChartIntelligenceOutput {
    const zones = this.computeH4Zones(assetCode, candles);
    const annotations = buildChartAnnotations(assetCode, zones, cognition, evidence);
    const dashboardViewModel = buildLegacyDashboardViewModel(cognition, zones, annotations);

    return {
      zones,
      annotations,
      dashboardViewModel
    };
  }
}
