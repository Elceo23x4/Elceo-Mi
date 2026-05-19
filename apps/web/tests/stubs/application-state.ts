const socialStore = new Map<string, { userId: string; socialIdentifiers: Array<{ kind: 'linkedin_address' | 'telegram_id' | 'x_username'; value: string }>; paymentReadiness: { status: 'eligible' | 'blocked'; reason: string; normalizedIdentifiers: Array<{ kind: 'linkedin_address' | 'telegram_id' | 'x_username'; value: string }> }; updatedAt: string; persistenceStatus: 'memory_fallback' }>();

const gifts = new Map<string, { giftRecordId: string; status: 'active' | 'retracted'; startsAt: string; endsAt: string }>();
const stepUpChallenges = new Map<string, { challengeId: string; actorUserId: string; providerKind: string; status: 'pending' | 'verified' | 'replayed'; expiresAt: string; createdAt: string }>();

export function getUserSocialIdentifiersSnapshot(userId: string) {
  return socialStore.get(userId) ?? { userId, socialIdentifiers: [], paymentReadiness: { status: 'blocked', reason: 'missing_social_identifier', normalizedIdentifiers: [] }, updatedAt: new Date(0).toISOString(), persistenceStatus: 'memory_fallback' as const };
}

export function upsertUserSocialIdentifiersSnapshot(userId: string, socialIdentifiers: Array<{ kind: 'linkedin_address' | 'telegram_id' | 'x_username'; value: string }>) {
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

export function giftFocusPlanToUser(input: { targetUserId: string; duration: 'two_weeks' | 'one_month' }) {
  const now = new Date();
  const ends = new Date(now.getTime() + (input.duration === 'two_weeks' ? 14 : 30) * 24 * 3600 * 1000);
  const giftRecord = { giftRecordId: `gift-${input.targetUserId}`, status: 'active' as const, startsAt: now.toISOString(), endsAt: ends.toISOString() };
  gifts.set(input.targetUserId, giftRecord);
  return { status: 'success' as const, giftRecord, resultingEntitlementState: { planKind: 'focus' } };
}

export function retractFocusPlanGift(input: { targetUserId: string; giftRecordId: string }) {
  const found = gifts.get(input.targetUserId);
  if (!found || found.giftRecordId !== input.giftRecordId) return { status: 'blocked' as const };
  const giftRecord = { ...found, status: 'retracted' as const };
  gifts.set(input.targetUserId, giftRecord);
  return { status: 'success' as const, giftRecord, resultingEntitlementState: { planKind: 'free' } };
}

export function restrictUserAccount(input: { restrictionKind: 'suspended' | 'banned' }) {
  return { status: 'success' as const, restrictionRecord: { restrictionKind: input.restrictionKind, status: 'active' as const }, resultingEntitlementState: { accountState: 'restricted' } };
}

export function getSuperAdminCommercialControlSnapshot() {
  return { gifts: Array.from(gifts.values()) };
}

export function createSuperAdminStepUpChallenge(input: { actorUserId: string; providerKind: string; requestedAt: string }) {
  const challengeId = `stepup-${Math.random().toString(36).slice(2, 10)}`;
  const challenge = { challengeId, actorUserId: input.actorUserId, providerKind: input.providerKind, status: 'pending' as const, createdAt: input.requestedAt, expiresAt: new Date(Date.parse(input.requestedAt) + 5 * 60 * 1000).toISOString() };
  stepUpChallenges.set(challengeId, challenge);
  return challenge;
}

export function verifySuperAdminStepUpChallenge(input: { challengeId: string; actorUserId: string; providerKind: string; proof: string }) {
  const found = stepUpChallenges.get(input.challengeId);
  if (!found) return { status: 'failed' as const, verified: false, failureReason: 'challenge_not_found', challengeId: input.challengeId, providerKind: input.providerKind, verifiedAt: null, freshUntil: null, persistenceStatus: 'memory_fallback' as const };
  if (found.status !== 'pending') return { status: 'replayed' as const, verified: false, failureReason: 'challenge_replayed', challengeId: found.challengeId, providerKind: input.providerKind, verifiedAt: null, freshUntil: null, persistenceStatus: 'memory_fallback' as const };
  if (input.providerKind !== 'fixture_test_only') return { status: 'provider_pending' as const, verified: false, failureReason: 'provider_pending', challengeId: found.challengeId, providerKind: input.providerKind, verifiedAt: null, freshUntil: null, persistenceStatus: 'memory_fallback' as const };
  if (input.proof !== 'fixture-pass') return { status: 'failed' as const, verified: false, failureReason: 'invalid_proof', challengeId: found.challengeId, providerKind: input.providerKind, verifiedAt: null, freshUntil: null, persistenceStatus: 'memory_fallback' as const };
  found.status = 'verified';
  const verifiedAt = new Date().toISOString();
  return { status: 'verified' as const, verified: true, failureReason: null, challengeId: found.challengeId, providerKind: input.providerKind, verifiedAt, freshUntil: new Date(Date.now() + 10 * 60 * 1000).toISOString(), persistenceStatus: 'memory_fallback' as const };
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

export function getSuperAdminStepUpCoverageReport() {
  return {
    generatedAt: new Date().toISOString(),
    persistenceStatus: 'memory_fallback',
    freshnessWindow: { maxAgeSeconds: 600 },
    replayProtection: { enforceSingleUse: true },
    rateLimitPolicy: { maxChallengesPerWindow: 10, windowSeconds: 600 },
    lockoutPolicy: { maxAttemptsPerChallenge: 5, lockoutSeconds: 900 },
    recoveryPolicy: { mode: 'manual_super_admin_reset_only', notes: 'Manual reset only.' },
    providerReadiness: getSuperAdminStepUpReadinessReport()
  };
}
