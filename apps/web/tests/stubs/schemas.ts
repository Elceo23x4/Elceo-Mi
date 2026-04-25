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

export const validateTargetCreateRequest = (input: unknown) => validation<{ channel: string; value: string }>(input, ['channel', 'value']);
export const validateTargetStatusRequest = (input: unknown) => validation<{ isEnabled: boolean }>(input, ['isEnabled']);
export const validateSubscriptionCreateRequest = (input: unknown) => validation<{ channel: string }>(input, ['channel']);
export const validateSubscriptionUpdateRequest = (input: unknown) => validation<Record<string, unknown>>(input);
export const validateVerificationIssueRequest = (input: unknown) => validation<{ targetId: string }>(input, ['targetId']);
export const validateVerificationConsumeRequest = (input: unknown) => validation<{ targetId: string; token: string }>(input, ['targetId', 'token']);

export type SchemaValidationResult<T> = Ok<T> | Fail;
