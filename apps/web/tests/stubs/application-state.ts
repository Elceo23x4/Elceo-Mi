const socialStore = new Map<string, { userId: string; socialIdentifiers: Array<{ kind: 'linkedin_address' | 'telegram_id' | 'x_username'; value: string }>; paymentReadiness: { status: 'eligible' | 'blocked'; reason: string; normalizedIdentifiers: Array<{ kind: 'linkedin_address' | 'telegram_id' | 'x_username'; value: string }> }; updatedAt: string; persistenceStatus: 'memory_fallback' }>();

const gifts = new Map<string, { giftRecordId: string; status: 'active' | 'retracted'; startsAt: string; endsAt: string }>();

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
