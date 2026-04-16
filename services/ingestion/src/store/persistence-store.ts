import type { DashboardCognitionViewModel, ProviderHealthRecord, AssetCognitionState, EvidenceAssembly } from '@elceo/types';
import type { InternalNormalizedEvent } from '@elceo/schemas';

export type PersistedState = {
  normalizedEvents: InternalNormalizedEvent[];
  sourceHealth: ProviderHealthRecord[];
  cognitionByAsset: Record<string, AssetCognitionState>;
  chartViewModelByAsset: Record<string, DashboardCognitionViewModel>;
  evidenceByAsset: Record<string, EvidenceAssembly>;
  updatedAtUtc?: string;
};

const state: PersistedState = {
  normalizedEvents: [],
  sourceHealth: [],
  cognitionByAsset: {},
  chartViewModelByAsset: {},
  evidenceByAsset: {}
};

export function persistNormalizedEvents(events: InternalNormalizedEvent[]): void {
  state.normalizedEvents.push(...events);
  state.updatedAtUtc = new Date().toISOString();
}

export function persistSourceHealth(rows: ProviderHealthRecord[]): void {
  state.sourceHealth = rows;
  state.updatedAtUtc = new Date().toISOString();
}

export function persistCognition(assetCode: string, cognition: AssetCognitionState): void {
  state.cognitionByAsset[assetCode] = cognition;
  state.updatedAtUtc = new Date().toISOString();
}

export function persistChartViewModel(assetCode: string, viewModel: DashboardCognitionViewModel): void {
  state.chartViewModelByAsset[assetCode] = viewModel;
  state.updatedAtUtc = new Date().toISOString();
}

export function persistEvidence(assetCode: string, evidence: EvidenceAssembly): void {
  state.evidenceByAsset[assetCode] = evidence;
  state.updatedAtUtc = new Date().toISOString();
}

export function readPersistedState(): PersistedState {
  return state;
}
