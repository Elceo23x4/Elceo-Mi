type Ok<T> = { ok: true; value: T };
type Fail = { ok: false; errors: string[] };

function validation<T extends Record<string, unknown>>(input: unknown, required: string[] = []): Ok<T> | Fail {
  if (typeof input !== 'object' || input === null) return { ok: false, errors: ['body must be object'] };
  const value = input as Record<string, unknown>;
  const missing = required.filter((field) => value[field] === undefined || value[field] === null || value[field] === '');
  if (missing.length > 0) return { ok: false, errors: missing.map((field) => `${field} required`) };
  return { ok: true, value: value as T };
}

export const validateWorkspaceRefreshRequest = (input: unknown) => validation<{ triggerKind: string }>(input, ['triggerKind']);
export const validateJournalCreateDraftRequest = (input: unknown) => validation<{ asset: string; timeframe: string; title: string }>(input, ['asset', 'timeframe', 'title']);
export const validateJournalPlanRequest = (input: unknown) => validation<Record<string, unknown>>(input);
export const validateJournalExecuteRequest = (input: unknown) => validation<{ openedAt: string }>(input, ['openedAt']);
export const validateJournalCloseRequest = (input: unknown) => validation<{ closedAt: string; outcome: string }>(input, ['closedAt', 'outcome']);
export const validateJournalReviewRequest = (input: unknown) => validation<{ reviewedAt: string }>(input, ['reviewedAt']);
export const validateJournalAdjustExecutionRequest = (input: unknown) => validation<Record<string, unknown>>(input);
export const validateJournalPartialCloseRequest = (input: unknown) => validation<Record<string, unknown>>(input);
export const validateJournalCancelRequest = (input: unknown) => validation<Record<string, unknown>>(input);

export const validateWatchlistCreateRequest = (input: unknown) => validation<{ asset: string; timeframe: string; priority: string }>(input, ['asset', 'timeframe', 'priority']);
export const validateWatchlistUpdateRequest = (input: unknown) => validation<Record<string, unknown>>(input);
export const validateWatchlistStatusRequest = (input: unknown) => validation<{ status: string }>(input, ['status']);
export const validateWatchlistThesisHealthRequest = (input: unknown) => validation<{ thesisHealth: string }>(input, ['thesisHealth']);

export const validatePositionCreateRequest = (input: unknown) => validation<{ asset: string; timeframe: string; direction: string }>(input, ['asset', 'timeframe', 'direction']);
export const validatePositionOpenRequest = (input: unknown) => validation<{ openedAt: string }>(input, ['openedAt']);
export const validatePositionReduceRequest = (input: unknown) => validation<Record<string, unknown>>(input);
export const validatePositionCloseRequest = (input: unknown) => validation<{ closedAt: string }>(input, ['closedAt']);
export const validatePositionCancelRequest = (input: unknown) => validation<Record<string, unknown>>(input);
export const validatePositionUpdateRequest = (input: unknown) => validation<Record<string, unknown>>(input);
export const validatePositionThesisHealthRequest = (input: unknown) => validation<{ thesisHealth: string }>(input, ['thesisHealth']);

export const validateActionCreateRequest = (input: unknown) => validation<{ kind: string; priority: string; headline: string; rationale: string }>(input, ['kind', 'priority', 'headline', 'rationale']);
export const validateActionUpdateRequest = (input: unknown) => validation<Record<string, unknown>>(input);

export const validateTargetCreateRequest = (input: unknown) => {
  const result = validation<{ channel: string; email?: string; subscriptionId?: string }>(input, ['channel']);
  if (!result.ok) return result;
  if (!['in_app', 'email', 'push'].includes(result.value.channel)) return { ok: false as const, errors: ['channel is invalid'] };
  if (result.value.channel === 'email') return validation(input, ['channel', 'email']);
  if (result.value.channel === 'push') return validation(input, ['channel', 'subscriptionId']);
  return result;
};
export const validateTargetStatusRequest = (input: unknown) => validation<{ isEnabled: boolean }>(input, ['isEnabled']);
export const validateSubscriptionCreateRequest = (input: unknown) => validation<{ channel: string }>(input, ['channel']);
export const validateSubscriptionUpdateRequest = (input: unknown) => validation<Record<string, unknown>>(input);
export const validateVerificationIssueRequest = (input: unknown) => validation<{ targetId: string }>(input, ['targetId']);
export const validateVerificationConsumeRequest = (input: unknown) => validation<{ targetId: string; token: string }>(input, ['targetId', 'token']);
export const validateAccountAccessCheckRequest = (input: unknown) => validation<{ feature: string }>(input, ['feature']);
export const validateAdminEntitlementPlanRequest = (input: unknown) => validation<{ subjectId: string; planKind: string }>(input, ['subjectId', 'planKind']);
export const validateAdminEntitlementStateRequest = (input: unknown) => validation<{ subjectId: string; accountState: string }>(input, ['subjectId', 'accountState']);
export const validateAdminEntitlementOverrideRequest = (input: unknown) => validation<{ subjectId: string; internalOverride: boolean }>(input, ['subjectId', 'internalOverride']);
export const validateAdminBillingTrialRequest = (input: unknown) => validation<{ subjectId: string; planKind: string; trialEndsAt: string }>(input, ['subjectId', 'planKind', 'trialEndsAt']);
export const validateAdminBillingActivateRequest = (input: unknown) => validation<{ subjectId: string; planKind: string; interval: string; currentPeriodStart: string; currentPeriodEnd: string }>(input, ['subjectId', 'planKind', 'interval', 'currentPeriodStart', 'currentPeriodEnd']);
export const validateAdminBillingRenewRequest = (input: unknown) => validation<{ subjectId: string; nextPeriodStart: string; nextPeriodEnd: string }>(input, ['subjectId', 'nextPeriodStart', 'nextPeriodEnd']);
export const validateAdminBillingChangePlanRequest = (input: unknown) => validation<{ subjectId: string; nextPlanKind: string; interval: string; effectiveAt: string; reason: string }>(input, ['subjectId', 'nextPlanKind', 'interval', 'effectiveAt', 'reason']);
export const validateAdminBillingOccurredAtRequest = (input: unknown) => validation<{ subjectId: string; occurredAt: string }>(input, ['subjectId', 'occurredAt']);

export type SchemaValidationResult<T> = Ok<T> | Fail;
export const validateBillingProviderEventIngestRequest = (input: unknown) => validation<{ providerKind: string; externalEventId: string; eventType: string; createdAt: string; dataJson: string }>(input, ['providerKind', 'externalEventId', 'eventType', 'createdAt', 'dataJson']);
export const validateBillingProviderEventReplayRequest = (input: unknown) => validation<{ limit?: number }>(input);
export const validateBillingProviderPlanMappingRequest = (input: unknown) => validation<{ providerKind: string; externalPriceId: string; mappedPlanKind: string; interval: string }>(input, ['providerKind', 'externalPriceId', 'mappedPlanKind', 'interval']);
export const parseAdminBillingProviderEventsQuery = (url: URL): Ok<{ providerKind?: string; subjectId?: string; limit?: number }> => {
  const providerKind = url.searchParams.get('providerKind');
  const subjectId = url.searchParams.get('subjectId');
  const limitRaw = url.searchParams.get('limit');
  const value: { providerKind?: string; subjectId?: string; limit?: number } = {};
  if (providerKind) value.providerKind = providerKind;
  if (subjectId) value.subjectId = subjectId;
  if (limitRaw) value.limit = Number.parseInt(limitRaw, 10);
  return { ok: true, value };
};

export const validateInternalBillingReconcileRequest = (input: unknown) => validation<{ subjectId: string; providerKind?: string; sourceEventId?: string }>(input, ['subjectId']);
export const validateInternalBillingPolicyEvaluateRequest = (input: unknown) => validation<{ subjectId: string; sourceReconciliationRunId?: string }>(input, ['subjectId']);
export const parseAdminBillingPolicySubjectQuery = (url: URL): Ok<{ subjectId: string }> | Fail => {
  const subjectId = url.searchParams.get('subjectId');
  if (!subjectId) return { ok: false, errors: ['subjectId must be non-empty string'] };
  return { ok: true, value: { subjectId } };
};
export const parseAdminBillingPolicyTransitionsQuery = (url: URL): Ok<{ subjectId: string; limit?: number }> | Fail => {
  const subject = parseAdminBillingPolicySubjectQuery(url);
  if (!subject.ok) return subject;
  const limitRaw = url.searchParams.get('limit');
  if (!limitRaw) return { ok: true, value: { subjectId: subject.value.subjectId } };
  const limit = Number.parseInt(limitRaw, 10);
  return Number.isNaN(limit)
    ? { ok: false, errors: ['limit must be integer 1..500'] }
    : { ok: true, value: { subjectId: subject.value.subjectId, limit } };
};

export const validateInternalBillingOrchestrationRetryRequest = (input: unknown) => validation<{ subjectId: string }>(input, ['subjectId']);
export const validateInternalTiingoFixtureIngestionRequest = (input: unknown) => {
  const base = validation<{ asset: string; frequency?: string | null; requestedAt?: string | null }>(input, ['asset']);
  if (!base.ok) return base;
  const asset = (input as { asset: string }).asset;
  const validAssets = ['xau_usd','eur_usd','gbp_usd','usd_jpy','usd_chf','aud_usd','nzd_usd','usd_cad','btc_usd','nasdaq_100','sp500','de30'];
  if (!validAssets.includes(asset)) return { ok: false, errors: ['asset is invalid'] } as Fail;
  return base;
};
export const parseAdminBillingOrchestrationSubjectQuery = (url: URL): Ok<{ subjectId: string }> | Fail => {
  const subjectId = url.searchParams.get('subjectId');
  if (!subjectId) return { ok: false, errors: ['subjectId must be non-empty string'] };
  return { ok: true, value: { subjectId } };
};
export const parseAdminBillingOrchestrationRunsQuery = (url: URL): Ok<{ subjectId: string; limit?: number }> | Fail => {
  const subject = parseAdminBillingOrchestrationSubjectQuery(url);
  if (!subject.ok) return subject;
  const limitRaw = url.searchParams.get('limit');
  if (!limitRaw) return { ok: true, value: { subjectId: subject.value.subjectId } };
  const limit = Number.parseInt(limitRaw, 10);
  return Number.isNaN(limit) ? { ok: false, errors: ['limit must be integer 1..500'] } : { ok: true, value: { subjectId: subject.value.subjectId, limit } };
};
export const parseMarketEvidencePayloadQuery = (url: URL): Ok<Record<string, unknown>> | Fail => { const asset = url.searchParams.get('asset'); const limit = url.searchParams.get('limit'); if (asset && asset !== 'xau_usd') return { ok: false, errors: ['asset is invalid'] }; if (limit) { const parsed = Number.parseInt(limit, 10); if (Number.isNaN(parsed) || parsed < 1 || parsed > 100) return { ok: false, errors: ['limit must be integer 1..100'] }; } return { ok: true, value: { asset, limit: limit ? Number.parseInt(limit, 10) : null } }; };
export const parseProviderReplayQuery = (url: URL): Ok<{ requestId: string }> | Fail => { const requestId = url.searchParams.get('requestId'); return requestId ? { ok: true, value: { requestId } } : { ok: false, errors: ['requestId must be non-empty string'] }; };
export const parseEvidenceQualityQuery = (url: URL): Ok<Record<string, unknown>> | Fail => { const evidenceClass = url.searchParams.get('evidenceClass'); const evaluatedAt = url.searchParams.get('evaluatedAt'); if (evidenceClass && evidenceClass !== 'macro_calendar') return { ok: false, errors: ['evidenceClass is invalid'] }; if (evaluatedAt && Number.isNaN(Date.parse(evaluatedAt))) return { ok: false, errors: ['evaluatedAt must be ISO timestamp'] }; return { ok: true, value: { asset: url.searchParams.get('asset'), evidenceClass, limit: null, evaluatedAt } }; };
export const parseReasoningInputQuery = (url: URL): Ok<Record<string, unknown>> | Fail => { const min = url.searchParams.get('minFinalQualityScore'); if (min && Number.isNaN(Number(min))) return { ok: false, errors: ['minFinalQualityScore must be finite number'] }; return { ok: true, value: { asset: url.searchParams.get('asset'), evidenceClass: url.searchParams.get('evidenceClass'), limit: null, evaluatedAt: null } }; };
export const parseWeightedEvidenceQuery = (url: URL): Ok<{ asset: string; horizon: string; limit: number | null; evaluatedAt: string | null }> | Fail => { const asset = url.searchParams.get('asset'); const horizon = url.searchParams.get('horizon'); if (!asset || !horizon) return { ok: false, errors: ['asset is invalid'] }; if (asset !== 'xau_usd') return { ok: false, errors: ['asset is invalid'] }; if (!['intraday','short_term','swing','medium_term'].includes(horizon)) return { ok: false, errors: ['horizon is invalid'] }; return { ok: true, value: { asset, horizon, limit: null, evaluatedAt: null } }; };
export const parseMarketCognitionQuery = parseWeightedEvidenceQuery;
export const parseSeoFeedQuery = (url: URL): Ok<Record<string, unknown>> | Fail => { const pageKind = url.searchParams.get('pageKind'); const slug = url.searchParams.get('slug'); if (pageKind && pageKind !== 'asset_page') return { ok: false, errors: ['pageKind is invalid'] }; if (slug && (!/^[a-z0-9-]{1,140}$/.test(slug) || slug.includes('..') || slug.includes('/'))) return { ok: false, errors: ['slug is invalid'] }; return { ok: true, value: { pageKind, asset: url.searchParams.get('asset'), evidenceClass: url.searchParams.get('evidenceClass'), slug, limit: null, generatedAt: null } }; };
export const parseScheduledIngestionPolicyQuery = (url: URL): Ok<{ providerId: string | null; generatedAt: string | null }> | Fail => { const providerId = url.searchParams.get('providerId'); const generatedAt = url.searchParams.get('generatedAt'); if (providerId === '') return { ok: false, errors: ['providerId must be non-empty string'] }; if (generatedAt && Number.isNaN(Date.parse(generatedAt))) return { ok: false, errors: ['generatedAt must be ISO timestamp'] }; return { ok: true, value: { providerId, generatedAt } }; };
export const parseScheduledIngestionRunQuery = (url: URL): Ok<Record<string, unknown>> | Fail => { const status = url.searchParams.get('status'); const capability = url.searchParams.get('capability'); const valid = ['pending','running','succeeded','failed','skipped','blocked']; const validCapabilities = ['market_price_history','intraday_quotes','end_of_day_prices','chart_presentation_metadata','cot_report'];
  const safeId = /^[a-zA-Z0-9:_-]{1,128}$/; if (status && !valid.includes(status)) return { ok: false, errors: ['status is invalid'] }; if (capability && !validCapabilities.includes(capability)) return { ok: false, errors: ['capability is invalid'] }; const limitRaw = url.searchParams.get('limit'); if (limitRaw && Number.isNaN(Number.parseInt(limitRaw, 10))) return { ok: false, errors: ['limit must be integer 1..100'] }; const runId = url.searchParams.get('runId'); const jobId = url.searchParams.get('jobId'); if (runId && !safeId.test(runId)) return { ok: false, errors: ['runId is invalid'] }; if (jobId && !safeId.test(jobId)) return { ok: false, errors: ['jobId is invalid'] }; return { ok: true, value: { runId, jobId, providerId: url.searchParams.get('providerId'), capability, asset: url.searchParams.get('asset'), region: url.searchParams.get('region'), status, stalenessStatus: url.searchParams.get('stalenessStatus'), limit: limitRaw ? Number.parseInt(limitRaw, 10) : null } }; };
export const parseScheduledIngestionReplayQuery = (url: URL): Ok<{ runId: string }> | Fail => { const runId = url.searchParams.get('runId'); return runId && /^[a-zA-Z0-9:_-]{1,128}$/.test(runId) ? { ok: true, value: { runId } } : { ok: false, errors: ['runId is invalid'] }; };
export const validateInternalScheduledIngestionDryRunRequest = (input: unknown) => { const base = validation<{ jobId: string; startedAt?: string | null }>(input, ['jobId']); if (!base.ok) return base; const v = input as Record<string, unknown>; if (!/^[a-zA-Z0-9:_-]{1,128}$/.test(String(v.jobId ?? ''))) return { ok: false, errors: ['jobId is invalid'] } as Fail; if (v.runMode !== undefined) return { ok: false, errors: ['runMode is not allowed'] } as Fail; if (v.production_live !== undefined || v.productionLive !== undefined) return { ok: false, errors: ['production_live is not allowed'] } as Fail; if (v.providerApiKey !== undefined || v.apiKey !== undefined || v.tiingoApiKey !== undefined) return { ok: false, errors: ['provider API keys are not allowed'] } as Fail; return base; };

export const validateInternalScheduledIngestionReplayRequest = (input: unknown) => { const base = validation<{ runId: string; replayMode?: string | null; startedAt?: string | null }>(input, ['runId']); if (!base.ok) return base; const v = input as Record<string, unknown>; if (!/^[a-zA-Z0-9:_-]{1,128}$/.test(String(v.runId ?? ''))) return { ok: false, errors: ['runId is invalid'] } as Fail; if (v.replayMode !== undefined && v.replayMode !== null && v.replayMode !== 'dry_run_fixture') return { ok: false, errors: ['replayMode is invalid'] } as Fail; if (v.production_live !== undefined || v.productionLive !== undefined) return { ok: false, errors: ['production_live is not allowed'] } as Fail; if (v.providerApiKey !== undefined || v.apiKey !== undefined || v.tiingoApiKey !== undefined) return { ok: false, errors: ['provider API keys are not allowed'] } as Fail; return { ok: true, value: { runId: String(v.runId), replayMode: (v.replayMode as string | null | undefined) ?? null, startedAt: (v.startedAt as string | null | undefined) ?? null } }; };
export const validateSuperAdminMetricsQuery = (input: unknown): SchemaValidationResult<{ period: 'monthly' | 'quarterly' | 'yearly' | 'all_time'; asOf: string }> => {
  if (typeof input !== 'object' || input === null) return { ok: false, errors: ['query invalid'] };
  const value = input as Record<string, unknown>;
  const period = value.period;
  const asOf = value.asOf;
  if (!['monthly', 'quarterly', 'yearly', 'all_time'].includes(String(period))) return { ok: false, errors: ['query invalid'] };
  if (typeof asOf !== 'string' || Number.isNaN(Date.parse(asOf))) return { ok: false, errors: ['query invalid'] };
  return { ok: true, value: { period: period as 'monthly' | 'quarterly' | 'yearly' | 'all_time', asOf } };
};

export const validateUpdateUserSocialIdentifiersRequest = (input: unknown): SchemaValidationResult<{ linkedinAddress?: string; telegramId?: string; xUsername?: string }> => {
  if (typeof input !== 'object' || input === null) return { ok: false, errors: ['body must be object'] };
  const value = input as Record<string, unknown>;
  const linkedinAddress = typeof value.linkedinAddress === 'string' ? value.linkedinAddress : undefined;
  const telegramId = typeof value.telegramId === 'string' ? value.telegramId : undefined;
  const xUsername = typeof value.xUsername === 'string' ? value.xUsername : undefined;
  if (!linkedinAddress && !telegramId && !xUsername) return { ok: false, errors: ['at least one social identifier is required'] };
  if (xUsername && (xUsername.includes('<') || xUsername.includes('>'))) return { ok: false, errors: ['xUsername is invalid'] };
  return { ok: true, value: { linkedinAddress, telegramId, xUsername } };
};

export const validateCommercialProfileSocialIdentifier = (input: unknown): SchemaValidationResult<{ kind: 'linkedin_address' | 'telegram_id' | 'x_username'; value: string }> => {
  if (typeof input !== 'object' || input === null) return { ok: false, errors: ['identifier invalid'] };
  const value = input as Record<string, unknown>;
  if (!['linkedin_address', 'telegram_id', 'x_username'].includes(String(value.kind))) return { ok: false, errors: ['kind invalid'] };
  if (typeof value.value !== 'string' || value.value.length === 0) return { ok: false, errors: ['value invalid'] };
  return { ok: true, value: { kind: value.kind as 'linkedin_address' | 'telegram_id' | 'x_username', value: value.value } };
};

export const validateSuperAdminStepUpVerification = (input: unknown): SchemaValidationResult<{ status: 'verified' | 'required'; verifiedAt?: string }> => {
  if (!input || typeof input !== 'object') return { ok: false, errors: ['step_up_required'] };
  const value = input as Record<string, unknown>;
  if (value.status === 'verified') {
    return { ok: true, value: { status: 'verified', verifiedAt: typeof value.verifiedAt === 'string' ? value.verifiedAt : new Date().toISOString() } };
  }
  return { ok: true, value: { status: 'required' } };
};

export const validateSuperAdminStepUpChallengeRequest = (input: unknown): SchemaValidationResult<{ actorUserId: string; actionKind: string; routeScope: string; targetUserId: string | null; providerKind: string; requestedAt: string }> => {
  const base = validation<{ actorUserId: string; actionKind: string; routeScope: string; targetUserId: string | null; providerKind: string; requestedAt: string }>(input, ['actorUserId', 'actionKind', 'routeScope', 'providerKind', 'requestedAt']);
  if (!base.ok) return base;
  const value = base.value;
  if (typeof value.targetUserId !== 'string' && value.targetUserId !== null) return { ok: false, errors: ['targetUserId invalid'] };
  return { ok: true, value };
};

export const validateSuperAdminStepUpVerificationRequest = (input: unknown): SchemaValidationResult<{ challengeId: string; providerKind: string; actorUserId: string; proof: string; requestedAt: string }> =>
  validation<{ challengeId: string; providerKind: string; actorUserId: string; proof: string; requestedAt: string }>(input, ['challengeId', 'providerKind', 'actorUserId', 'proof', 'requestedAt']);
