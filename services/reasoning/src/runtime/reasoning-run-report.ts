import type { CanonicalAssetSymbol, Timeframe } from '@elceo/types';
import type { CognitionDriftReport } from '../delta/contracts';

export type ReasoningRunReport = {
  reasoningRunId: string;
  asset: CanonicalAssetSymbol;
  timeframe: Timeframe;
  startedAt: string;
  endedAt: string;
  durationMs: number;
  status: 'success' | 'partial_success' | 'failed';
  sourceIngestionRunId: string | null;
  sourceIngestionRequestKey: string | null;
  inputEventCount: number;
  inputZoneCount: number;
  projectedEvidenceCount: number;
  priorSnapshotId: string | null;
  snapshotId: string | null;
  warnings: string[];
  failureReason: string | null;
  engineName: string;
  reasoningVersion: string;
  scoringVersion: string;
  drift: CognitionDriftReport | null;
  expectationId?: string | null;
};
