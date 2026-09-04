import type { CanonicalAssetSymbol, Timeframe } from './events';
import type { JournalConvictionLabel, JournalExecutionQuality, JournalOutcomeLabel, TradeDirection } from './journal';
import type { NotificationChannel, NotificationTriggerKind } from './notifications';
import type { PortfolioActionKind, ThesisHealth, WatchlistEntryStatus, WatchlistPriority } from './portfolio';
import type { SnapshotRefreshTriggerKind } from './refresh-runtime';
import type { ElceoAccountState, ElceoFeatureKey, ElceoPlanKind } from './entitlements';
import type { BillingPlanInterval, BillingProviderKind } from './billing';
import type { BillingExternalProviderKind, StripeLikeWebhookEnvelope } from './payment-providers';
import type { TradingAssetCoverage } from './market-evidence';

export type ApiSuccessEnvelope<T> = {
  ok: true;
  data: T;
  meta?: Record<string, string | number | boolean | null>;
};

export const API_ERROR_CODES = [
  'unauthorized',
  'forbidden',
  'bad_request',
  'validation_error',
  'not_found',
  'conflict',
  'unprocessable_entity',
  'dependency_failed',
  'internal_error'
] as const;
export type ApiErrorCode = (typeof API_ERROR_CODES)[number];

export type ApiErrorEnvelope = {
  ok: false;
  error: {
    code: ApiErrorCode;
    message: string;
    details?: string[];
  };
};

export type WorkspaceRefreshRequest = { triggerKind: SnapshotRefreshTriggerKind };
export type JournalCreateDraftRequest = {
  asset: CanonicalAssetSymbol;
  timeframe: Timeframe;
  title: string;
  direction?: TradeDirection;
  setupType?: string;
  conviction?: JournalConvictionLabel;
  thesis?: string;
  linkedReasoningRunId?: string | null;
  linkedSnapshotId?: string | null;
  linkedDriftId?: string | null;
};
export type JournalPlanRequest = {
  title?: string;
  direction?: TradeDirection;
  thesis?: string;
  setupType?: string;
  conviction?: JournalConvictionLabel;
  entryPricePlanned?: number | null;
  stopLossPlanned?: number | null;
  takeProfitPlanned?: number[];
  riskAmountPlanned?: number | null;
  riskPercentPlanned?: number | null;
  invalidationNote?: string | null;
  executionChecklist?: string[];
};
export type JournalExecuteRequest = {
  entryPriceExecuted?: number | null;
  positionSize?: number | null;
  openedAt: string;
  notes?: string[];
  executionQuality?: JournalExecutionQuality | null;
};
export type JournalAdjustExecutionRequest = {
  entryPriceExecuted?: number | null;
  positionSize?: number | null;
  stopLossPlanned?: number | null;
  takeProfitPlanned?: number[];
  notes?: string[];
  executionQuality?: JournalExecutionQuality | null;
  lastAdjustedAt?: string;
};
export type JournalPartialCloseRequest = {
  exitPrice?: number | null;
  pnlAmount?: number | null;
  pnlPercent?: number | null;
  rMultiple?: number | null;
  closureReason?: string | null;
  outcome?: JournalOutcomeLabel;
};
export type JournalCloseRequest = {
  exitPrice?: number | null;
  closedAt: string;
  pnlAmount?: number | null;
  pnlPercent?: number | null;
  rMultiple?: number | null;
  outcome: JournalOutcomeLabel;
  closureReason?: string | null;
};
export type JournalCancelRequest = { closureReason?: string | null };
export type JournalReviewRequest = {
  reviewedAt: string;
  whatWentWell?: string[];
  whatWentWrong?: string[];
  lessons?: string[];
  behaviorTags?: string[];
  followUpActions?: string[];
};

export type WatchlistCreateRequest = {
  asset: CanonicalAssetSymbol;
  timeframe: Timeframe;
  priority: WatchlistPriority;
  status?: WatchlistEntryStatus;
  thesisHealth?: ThesisHealth;
  note?: string | null;
  linkedReasoningRunId?: string | null;
  linkedSnapshotId?: string | null;
  linkedDriftId?: string | null;
  linkedJournalCaseId?: string | null;
};
export type WatchlistUpdateRequest = { priority?: WatchlistPriority; note?: string | null };
export type WatchlistStatusRequest = { status: WatchlistEntryStatus };
export type WatchlistThesisHealthRequest = { thesisHealth: ThesisHealth };

export type PositionCreateRequest = {
  asset: CanonicalAssetSymbol;
  timeframe: Timeframe;
  direction: TradeDirection;
  entryPrice?: number | null;
  stopLoss?: number | null;
  takeProfitLevels?: number[];
  size?: number | null;
  thesisHealth?: ThesisHealth;
  linkedJournalCaseId?: string | null;
  linkedReasoningRunId?: string | null;
  linkedSnapshotId?: string | null;
  linkedDriftId?: string | null;
  note?: string | null;
};
export type PositionOpenRequest = {
  openedAt: string;
  entryPrice?: number | null;
  stopLoss?: number | null;
  takeProfitLevels?: number[];
  size?: number | null;
  note?: string | null;
};
export type PositionReduceRequest = { size?: number | null; note?: string | null; updatedAt?: string };
export type PositionCloseRequest = { closedAt: string; note?: string | null };
export type PositionCancelRequest = { note?: string | null };
export type PositionUpdateRequest = {
  entryPrice?: number | null;
  stopLoss?: number | null;
  takeProfitLevels?: number[];
  size?: number | null;
  note?: string | null;
};
export type PositionThesisHealthRequest = { thesisHealth: ThesisHealth };

export type ActionCreateRequest = {
  kind: PortfolioActionKind;
  priority: WatchlistPriority;
  asset?: CanonicalAssetSymbol | null;
  timeframe?: Timeframe | null;
  headline: string;
  rationale: string;
  linkedEntryId?: string | null;
  linkedPositionId?: string | null;
  linkedJournalCaseId?: string | null;
  linkedReasoningRunId?: string | null;
  linkedNotificationDecisionId?: string | null;
};
export type ActionUpdateRequest = { priority?: WatchlistPriority; headline?: string; rationale?: string };

export type TargetCreateRequest =
  | { channel: 'email'; email: string; label?: string | null }
  | { channel: 'push'; subscriptionId: string; label?: string | null }
  | { channel: 'in_app'; label?: string | null };
export type TargetStatusRequest = { isEnabled: boolean };
export type SubscriptionCreateRequest = {
  channel: NotificationChannel;
  decisionKind?: NotificationTriggerKind | null;
  minimumPriority?: string | null;
  minimumMaterialityScore?: number | null;
  isEnabled?: boolean;
};
export type SubscriptionUpdateRequest = {
  minimumPriority?: string | null;
  minimumMaterialityScore?: number | null;
  isEnabled?: boolean;
};
export type VerificationIssueRequest = { targetId: string };
export type VerificationConsumeRequest = { targetId: string; token: string };

export type AccountAccessCheckRequest = { feature: ElceoFeatureKey };
export type AdminEntitlementPlanRequest = { subjectId: string; planKind: ElceoPlanKind; planStartedAt?: string | null; planEndsAt?: string | null; trialEndsAt?: string | null };
export type AdminEntitlementStateRequest = { subjectId: string; accountState: ElceoAccountState };
export type AdminEntitlementOverrideRequest = { subjectId: string; internalOverride: boolean };
export type AdminBillingTrialRequest = { subjectId: string; planKind: ElceoPlanKind; trialEndsAt: string; providerKind?: BillingProviderKind };
export type AdminBillingActivateRequest = { subjectId: string; planKind: ElceoPlanKind; interval: BillingPlanInterval; currentPeriodStart: string; currentPeriodEnd: string; providerKind?: BillingProviderKind };
export type AdminBillingRenewRequest = { subjectId: string; nextPeriodStart: string; nextPeriodEnd: string };
export type AdminBillingChangePlanRequest = { subjectId: string; nextPlanKind: ElceoPlanKind; interval: BillingPlanInterval; effectiveAt: string; reason: string };

export type BillingProviderEventReplayRequest = { limit?: number };
export type InternalBillingReconcileRequest = { subjectId: string; providerKind?: BillingExternalProviderKind; sourceEventId?: string };
export type InternalBillingPolicyEvaluateRequest = { subjectId: string; sourceReconciliationRunId?: string };

export type InternalBillingOrchestrationRetryRequest = { subjectId: string };
export type InternalTiingoFixtureIngestionRequest = { asset: TradingAssetCoverage; frequency?: string | null; requestedAt?: string | null };
export type AdminBillingOrchestrationSubjectQuery = { subjectId: string };
export type AdminBillingOrchestrationRunsQuery = { subjectId: string; limit?: number };
export type BillingProviderPlanMappingRequest = { providerKind: BillingExternalProviderKind; externalPriceId: string; mappedPlanKind: ElceoPlanKind; interval: BillingPlanInterval };
export type AdminBillingProviderEventsQuery = { providerKind?: BillingExternalProviderKind; subjectId?: string; limit?: number };
export type AdminBillingPolicySubjectQuery = { subjectId: string };
export type AdminBillingPolicyTransitionsQuery = { subjectId: string; limit?: number };
export type BillingProviderEventIngestRequest = StripeLikeWebhookEnvelope;
export type AdminBillingOccurredAtRequest = { subjectId: string; occurredAt: string };


export type MarketEvidencePayloadQuery = { asset: TradingAssetCoverage | null; evidenceClass: import('./market-evidence').MarketEvidenceClass | null; evidenceTypeId: string | null; providerId: string | null; region: import('./market-evidence').MarketEvidenceRegion | null; limit: number | null };
export type ProviderReplayQuery = { requestId: string };
export type EvidenceQualityQuery = { asset: TradingAssetCoverage | null; evidenceClass: import('./market-evidence').MarketEvidenceClass | null; limit: number | null; evaluatedAt: string | null };
export type ReasoningInputQuery = { asset: TradingAssetCoverage | null; evidenceClass: import('./market-evidence').MarketEvidenceClass | null; limit: number | null; evaluatedAt: string | null; includeFixtureEvidence: boolean | null; includeExpiredEvidence: boolean | null; includeBlockedEvidence: boolean | null; minFinalQualityScore: number | null };
export type WeightedEvidenceQuery = { asset: TradingAssetCoverage; horizon: import('./market-evidence-weighting').EvidenceWeightHorizon; limit: number | null; evaluatedAt: string | null };
export type MarketCognitionQuery = { asset: TradingAssetCoverage; horizon: import('./market-evidence-weighting').EvidenceWeightHorizon; limit: number | null; evaluatedAt: string | null };
export type SeoFeedQuery = { pageKind: import('./seo-content').SeoPageKind | null; asset: TradingAssetCoverage | null; evidenceClass: import('./market-evidence').MarketEvidenceClass | null; slug: string | null; limit: number | null; generatedAt: string | null };
export type AdminBillingOperationsLimitQuery = { limit?: number };
export type AdminBillingOperationsSubjectQuery = { subjectId: string };


export type ScheduledIngestionPolicyQuery = { providerId: string | null; generatedAt: string | null };
export type ScheduledIngestionRunQuery = { runId: string | null; jobId: string | null; providerId: string | null; capability: import('./market-data-providers').ProviderCapabilityKind | null; asset: TradingAssetCoverage | null; region: import('./market-evidence').MarketEvidenceRegion | null; status: import('./market-evidence-ingestion-schedule').ScheduledIngestionJobStatus | null; stalenessStatus: import('./market-evidence-ingestion-schedule').ScheduledIngestionStalenessStatus | null; limit: number | null };
export type ScheduledIngestionReplayQuery = { runId: string };
export type InternalScheduledIngestionDryRunRequest = { jobId: string; startedAt?: string | null };
export type InternalScheduledIngestionReplayRequest = { runId: string; replayMode?: import('./market-evidence-ingestion-schedule').ScheduledIngestionRunMode | null; startedAt?: string | null };
export type InternalMarketEvidenceInspectionSection = 'full' | 'provider_registry' | 'launch_asset_fixtures' | 'official_macro' | 'news_extraction_filings' | 'crypto_risk_liquidity' | 'golden_scenarios' | 'cognition_calibration' | 'scheduled_ingestion';
export type InternalMarketEvidenceInspectionQuery = { section: InternalMarketEvidenceInspectionSection; asset: TradingAssetCoverage | null };
