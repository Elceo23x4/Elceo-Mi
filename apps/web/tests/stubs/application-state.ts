
export type StepUpPersistenceFailureMode = 'none' | 'challenge' | 'verify' | 'readiness' | 'consume';
export type CommercialPersistenceFailureMode = 'none' | 'social' | 'snapshot' | 'gift-after-consume' | 'finalize-once';
let stepUpPersistenceFailureMode: StepUpPersistenceFailureMode = 'none';
let commercialPersistenceFailureMode: CommercialPersistenceFailureMode = 'none';
let finalizeOnceRemaining = 0;
export function setStepUpPersistenceFailureMode(mode: StepUpPersistenceFailureMode) { stepUpPersistenceFailureMode = mode; }
export function setCommercialPersistenceFailureMode(mode: CommercialPersistenceFailureMode) { commercialPersistenceFailureMode = mode; finalizeOnceRemaining = mode === 'finalize-once' ? 1 : 0; }
export function isCommercialPersistenceError(error: unknown): boolean { return Boolean(error && typeof error === 'object' && (error as { code?: unknown }).code === 'commercial_persistence_unavailable'); }
const commercialPersistenceError = () => Object.assign(new Error('Commercial persistence unavailable'), { code: 'commercial_persistence_unavailable' });
export function isStepUpPersistenceError(error: unknown): boolean { return Boolean(error && typeof error === 'object' && (error as { code?: unknown }).code === 'step_up_persistence_unavailable'); }
const stepUpPersistenceError = () => Object.assign(new Error('Step-up persistence unavailable'), { code: 'step_up_persistence_unavailable' });

const socialStore = new Map<string, { userId: string; socialIdentifiers: Array<{ kind: 'linkedin_address' | 'telegram_id' | 'x_username'; value: string }>; paymentReadiness: { status: 'eligible' | 'blocked'; reason: string; normalizedIdentifiers: Array<{ kind: 'linkedin_address' | 'telegram_id' | 'x_username'; value: string }> }; updatedAt: string; persistenceStatus: 'memory_fallback' }>();

const gifts = new Map<string, { giftRecordId: string; status: 'active' | 'retracted'; startsAt: string; endsAt: string }>();
const stepUpChallenges = new Map<string, { challengeId: string; actorUserId: string; actionKind: string; routeScope: string; targetUserId: string | null; providerKind: string; verifiedProviderKind: string | null; status: 'pending' | 'verified' | 'replayed' | 'consumed'; expiresAt: string; createdAt: string; freshUntil: string | null }>();
export const SUPER_ADMIN_COMMERCIAL_ACTION_ROUTES = { focus_plan_gift: '/api/admin/commercial/users/[userId]/gift-focus-plan', focus_plan_gift_retract: '/api/admin/commercial/users/[userId]/retract-focus-gift', user_restriction: '/api/admin/commercial/users/[userId]/restrict' } as const;
export const getSuperAdminCommercialRouteScope = (actionKind: keyof typeof SUPER_ADMIN_COMMERCIAL_ACTION_ROUTES) => SUPER_ADMIN_COMMERCIAL_ACTION_ROUTES[actionKind];
export const isSuperAdminCommercialActionKind = (value: unknown): value is keyof typeof SUPER_ADMIN_COMMERCIAL_ACTION_ROUTES => typeof value === 'string' && Object.prototype.hasOwnProperty.call(SUPER_ADMIN_COMMERCIAL_ACTION_ROUTES, value);
export const commercialMutationCounts = { gift: 0, retract: 0, restrict: 0 };
export function resetCommercialMutationCounts() { commercialMutationCounts.gift = 0; commercialMutationCounts.retract = 0; commercialMutationCounts.restrict = 0; }
export function expireStepUpChallengeFreshness(challengeId: string) { const found = stepUpChallenges.get(challengeId); if (found) found.freshUntil = new Date(Date.now() - 60_000).toISOString(); }

export function getUserSocialIdentifiersSnapshot(userId: string) {
  if (commercialPersistenceFailureMode === 'social') throw commercialPersistenceError();
  return socialStore.get(userId) ?? { userId, socialIdentifiers: [], paymentReadiness: { status: 'blocked', reason: 'missing_social_identifier', normalizedIdentifiers: [] }, updatedAt: new Date(0).toISOString(), persistenceStatus: 'memory_fallback' as const };
}

export function upsertUserSocialIdentifiersSnapshot(userId: string, socialIdentifiers: Array<{ kind: 'linkedin_address' | 'telegram_id' | 'x_username'; value: string }>) {
  if (commercialPersistenceFailureMode === 'social') throw commercialPersistenceError();
  const next = { userId, socialIdentifiers, paymentReadiness: { status: socialIdentifiers.length > 0 ? 'eligible' as const : 'blocked' as const, reason: socialIdentifiers.length > 0 ? 'ready' : 'missing_social_identifier', normalizedIdentifiers: socialIdentifiers }, updatedAt: new Date().toISOString(), persistenceStatus: 'memory_fallback' as const };
  socialStore.set(userId, next);
  return next;
}

export function clearUserSocialIdentifiersMemoryStore() { socialStore.clear(); }

export function validateSuperAdminStepUpVerification(input: unknown) {
  if (!input || typeof input !== 'object') return { ok: false as const, error: 'invalid' };
  const v = input as { status?: unknown; verifiedAt?: unknown };
  if (v.status !== 'verified') return { ok: true as const, value: { status: 'required' as const } };
  return { ok: true as const, value: { status: 'verified' as const, verifiedAt: typeof v.verifiedAt === 'string' ? v.verifiedAt : new Date().toISOString() } };
}

function consume(input: { stepUpChallengeId: string; actorSuperAdminId: string; targetUserId: string; actionKind: keyof typeof SUPER_ADMIN_COMMERCIAL_ACTION_ROUTES; requestedAt?: string }) {
  const found = stepUpChallenges.get(input.stepUpChallengeId);
  if (!found || found.status !== 'verified' || found.actorUserId !== input.actorSuperAdminId || found.actionKind !== input.actionKind || found.routeScope !== getSuperAdminCommercialRouteScope(input.actionKind) || found.targetUserId !== input.targetUserId || found.providerKind !== found.verifiedProviderKind || !found.freshUntil || Date.parse(found.freshUntil) < Date.parse(input.requestedAt ?? new Date().toISOString())) return false;
  found.status = 'consumed';
  found.freshUntil = null;
  return true;
}

export function giftFocusPlanToUser(input: { actorSuperAdminId: string; targetUserId: string; duration: 'two_weeks' | 'one_month'; stepUpChallengeId: string; requestedAt?: string }) {
  if (stepUpPersistenceFailureMode === 'consume') return { status: 'blocked' as const, failureReason: 'step_up_persistence_unavailable' as const };
  if (!consume({ ...input, actionKind: 'focus_plan_gift' })) return { status: 'blocked' as const };
  const now = new Date();
  const ends = new Date(now.getTime() + (input.duration === 'two_weeks' ? 14 : 30) * 24 * 3600 * 1000);
  if (commercialPersistenceFailureMode === 'gift-after-consume') throw commercialPersistenceError();
  const giftRecord = { giftRecordId: `gift-${input.targetUserId}`, status: 'active' as const, startsAt: now.toISOString(), endsAt: ends.toISOString() };
  commercialMutationCounts.gift += 1;
  gifts.set(input.targetUserId, giftRecord);
  if (commercialPersistenceFailureMode === 'finalize-once' && finalizeOnceRemaining > 0) { finalizeOnceRemaining -= 1; throw commercialPersistenceError(); }
  return { status: 'success' as const, giftRecord, resultingEntitlementState: { planKind: 'focus' } };
}

export function retractFocusPlanGift(input: { actorSuperAdminId: string; targetUserId: string; giftRecordId: string; stepUpChallengeId: string; requestedAt?: string }) {
  if (stepUpPersistenceFailureMode === 'consume') return { status: 'blocked' as const, failureReason: 'step_up_persistence_unavailable' as const };
  if (!consume({ ...input, actionKind: 'focus_plan_gift_retract' })) return { status: 'blocked' as const };
  const found = gifts.get(input.targetUserId);
  if (!found || found.giftRecordId !== input.giftRecordId) return { status: 'blocked' as const };
  const giftRecord = { ...found, status: 'retracted' as const };
  commercialMutationCounts.retract += 1;
  gifts.set(input.targetUserId, giftRecord);
  return { status: 'success' as const, giftRecord, resultingEntitlementState: { planKind: 'free' } };
}

export function restrictUserAccount(input: { actorSuperAdminId: string; targetUserId: string; restrictionKind: 'suspended' | 'banned'; stepUpChallengeId: string; requestedAt?: string }) {
  if (stepUpPersistenceFailureMode === 'consume') return { status: 'blocked' as const, failureReason: 'step_up_persistence_unavailable' as const };
  if (!consume({ ...input, actionKind: 'user_restriction' })) return { status: 'blocked' as const };
  commercialMutationCounts.restrict += 1;
  return { status: 'success' as const, restrictionRecord: { restrictionKind: input.restrictionKind, status: 'active' as const }, resultingEntitlementState: { accountState: 'restricted' } };
}

export function getSuperAdminCommercialControlSnapshot(userId?: string) {
  if (commercialPersistenceFailureMode === 'snapshot') throw commercialPersistenceError();
  const activeGift = userId ? (gifts.get(userId) ?? null) : null;
  return { gifts: Array.from(gifts.values()), activeGift };
}

export function createSuperAdminStepUpChallenge(input: { actorUserId: string; actionKind: string; routeScope: string; targetUserId: string | null; providerKind: string; requestedAt: string }) {
  if (stepUpPersistenceFailureMode === 'challenge') throw stepUpPersistenceError();
  const challengeId = `stepup-${Math.random().toString(36).slice(2, 10)}`;
  const challenge = { challengeId, actorUserId: input.actorUserId, actionKind: input.actionKind, routeScope: input.routeScope, targetUserId: input.targetUserId, providerKind: input.providerKind, verifiedProviderKind: null, status: 'pending' as const, createdAt: input.requestedAt, expiresAt: new Date(Date.parse(input.requestedAt) + 5 * 60 * 1000).toISOString(), freshUntil: null as string | null };
  stepUpChallenges.set(challengeId, challenge);
  return challenge;
}

export function verifySuperAdminStepUpChallenge(input: { challengeId: string; actorUserId: string; providerKind: string; proof: string; requestedAt?: string }) {
  if (stepUpPersistenceFailureMode === 'verify') throw stepUpPersistenceError();
  const found = stepUpChallenges.get(input.challengeId);
  if (!found) return { status: 'failed' as const, verified: false, failureReason: 'challenge_not_found', challengeId: input.challengeId, providerKind: input.providerKind, verifiedAt: null, freshUntil: null, persistenceStatus: 'memory_fallback' as const };
  const requestedAt = input.requestedAt ?? new Date().toISOString();
  if (found.actorUserId !== input.actorUserId) return { status: 'failed' as const, verified: false, failureReason: 'invalid_proof', challengeId: found.challengeId, providerKind: input.providerKind, verifiedAt: null, freshUntil: null, persistenceStatus: 'memory_fallback' as const };
  if (Date.parse(found.expiresAt) < Date.parse(requestedAt)) return { status: 'expired' as const, verified: false, failureReason: 'challenge_expired', challengeId: found.challengeId, providerKind: input.providerKind, verifiedAt: null, freshUntil: null, persistenceStatus: 'memory_fallback' as const };
  if (found.status !== 'pending') return { status: 'replayed' as const, verified: false, failureReason: 'challenge_replayed', challengeId: found.challengeId, providerKind: input.providerKind, verifiedAt: null, freshUntil: null, persistenceStatus: 'memory_fallback' as const };
  if (input.providerKind !== found.providerKind) return { status: 'failed' as const, verified: false, failureReason: 'invalid_proof', challengeId: found.challengeId, providerKind: input.providerKind, verifiedAt: null, freshUntil: null, persistenceStatus: 'memory_fallback' as const };
  if (process.env.NODE_ENV === 'production') return { status: 'failed' as const, verified: false, failureReason: 'invalid_proof', challengeId: found.challengeId, providerKind: input.providerKind, verifiedAt: null, freshUntil: null, persistenceStatus: 'memory_fallback' as const };
  if (input.providerKind !== 'fixture_test_only') return { status: 'provider_pending' as const, verified: false, failureReason: 'provider_pending', challengeId: found.challengeId, providerKind: input.providerKind, verifiedAt: null, freshUntil: null, persistenceStatus: 'memory_fallback' as const };
  if (input.proof !== 'fixture-pass') return { status: 'failed' as const, verified: false, failureReason: 'invalid_proof', challengeId: found.challengeId, providerKind: input.providerKind, verifiedAt: null, freshUntil: null, persistenceStatus: 'memory_fallback' as const };
  found.status = 'verified';
  found.verifiedProviderKind = input.providerKind;
  const verifiedAt = new Date().toISOString();
  found.freshUntil = new Date(Date.now() + 10 * 60 * 1000).toISOString();
  return { status: 'verified' as const, verified: true, failureReason: null, challengeId: found.challengeId, providerKind: input.providerKind, verifiedAt, freshUntil: found.freshUntil, persistenceStatus: 'memory_fallback' as const };
}

export function getSuperAdminStepUpReadinessReport() {
  return [
    { providerKind: 'totp', readiness: 'provider_pending', activated: false, notes: 'Provider integration not configured.' },
    { providerKind: 'webauthn_passkey', readiness: 'provider_pending', activated: false, notes: 'Provider integration not configured.' },
    { providerKind: 'authenticator_app', readiness: 'provider_pending', activated: false, notes: 'Provider integration not configured.' },
    { providerKind: 'verified_email_fallback', readiness: 'readiness_only', activated: false, notes: 'Fallback policy only.' },
    { providerKind: 'fixture_test_only', readiness: 'fixture_test_only', activated: true, notes: 'Test fixture only.' }
  ];
}

export function buildSuperAdminStepUpCoverageReport(persistenceStatus: 'durable' | 'memory_fallback' | 'unavailable') {
  return {
    generatedAt: new Date().toISOString(),
    persistenceStatus,
    freshnessWindow: { maxAgeSeconds: 600 },
    replayProtection: { enforceSingleUse: true },
    rateLimitPolicy: { maxChallengesPerWindow: 10, windowSeconds: 600 },
    lockoutPolicy: { maxAttemptsPerChallenge: 5, lockoutSeconds: 900 },
    recoveryPolicy: { mode: 'manual_super_admin_reset_only', notes: 'Manual reset only.' },
    providerReadiness: getSuperAdminStepUpReadinessReport()
  };
}

export async function getSuperAdminStepUpPersistenceReadiness() {
  if (stepUpPersistenceFailureMode === 'readiness') return { selectedRepositoryMode: 'sql' as const, databaseConfigured: true, requiredRelationsAvailable: false, persistenceStatus: 'unavailable' as const };
  return { selectedRepositoryMode: 'memory' as const, databaseConfigured: false, requiredRelationsAvailable: true, persistenceStatus: 'memory_fallback' as const };
}

export async function getSuperAdminStepUpCoverageReport() { const readiness = await getSuperAdminStepUpPersistenceReadiness(); return buildSuperAdminStepUpCoverageReport(readiness.persistenceStatus); }
export async function resolveUserCommercialEntitlementSnapshot(userId:string){return {userId,nowIso:new Date().toISOString(),trialStartedAt:null,activePlanCode:'focus_plan' as const,subscriptionActive:true,socialIdentifiers:[{kind:'x_username' as const,value:'@fixture'}],userRestrictionStatus:'none' as const};}
export function evaluateCommercialFeatureAccess(){return {decision:'allow' as const,status:'active' as const,reason:'feature_allowed' as const,subscriptionWall:null};}
export function getCommercialPlanCatalog(){return {plans:[{planCode:'focus_plan' as const,displayName:'Focus Plan',billingIntervals:['monthly','quarterly','yearly'],monthlyPrice:{amount:70,currency:'USD'},quarterlyPrice:{status:'pending_price_config'},yearlyPrice:{status:'pending_price_config'}}]};}
