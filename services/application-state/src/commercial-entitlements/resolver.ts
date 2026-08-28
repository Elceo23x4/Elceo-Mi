import type { CommercialProfileSocialIdentifier, UserCommercialEntitlementSnapshot } from '@elceo/types';
import { queryDb } from '../db/client';
import { getDefaultSuperAdminCommercialRepository } from '../persistence/super-admin-commercial-repository';
import { buildDefaultUserSocialIdentifiersRepository } from '../persistence/user-social-identifiers-repository';

const runtimeEnv = () => (globalThis as { process?: { env?: Record<string, string | undefined> } }).process?.env ?? {};
const deployed = () => runtimeEnv().APP_ENV === 'production' || runtimeEnv().APP_ENV === 'staging';

/** Canonical precedence: restriction, gift, Focus Plan subscription, Kick Off trial, denial. */
export async function resolveUserCommercialEntitlementSnapshot(userId: string, asOfIso = new Date().toISOString()): Promise<UserCommercialEntitlementSnapshot> {
  const env = runtimeEnv();
  if (deployed() && (env.APP_STATE_REPOSITORY !== 'sql' || !env.DATABASE_URL)) throw Object.assign(new Error('commercial_persistence_unavailable'), { code: 'commercial_persistence_unavailable' });
  const controls = await getDefaultSuperAdminCommercialRepository().getControlSnapshot(userId, asOfIso);
  const identifiers = await buildDefaultUserSocialIdentifiersRepository().get(userId);
  let subscription: { plan_kind?: string; subscription_state?: string; provider_kind?:string; current_period_end?:string|null; trial_started_at?: string | null; trial_ends_at?: string | null } | undefined;
  if (env.APP_STATE_REPOSITORY === 'sql') [subscription] = await queryDb(`SELECT plan_kind, subscription_state, provider_kind, current_period_end, trial_started_at, trial_ends_at FROM app_billing_subscriptions WHERE subject_kind='user' AND subject_id=$1 ORDER BY updated_at DESC NULLS LAST LIMIT 1`, [userId]);
  const restricted = controls.activeRestriction;
  const gift = controls.activeGift;
  const providerPeriodValid=subscription?.provider_kind!=='stripe'||Boolean(subscription.current_period_end&&Date.parse(subscription.current_period_end)>Date.parse(asOfIso));
  const focusActive = !restricted && ['active', 'trialing'].includes(subscription?.subscription_state ?? '') && subscription?.plan_kind === 'focus_plan' && providerPeriodValid;
  const trialStartedAt = subscription?.trial_started_at ?? null;
  const trialActive = !restricted && !focusActive && Boolean(trialStartedAt && subscription?.trial_ends_at && Date.parse(subscription.trial_ends_at) > Date.parse(asOfIso));
  const socialIdentifiers: CommercialProfileSocialIdentifier[] = identifiers?.socialIdentifiers ?? [];
  return { userId, nowIso: asOfIso, trialStartedAt, activePlanCode: focusActive || gift ? 'focus_plan' : trialActive ? 'kick_off' : null, subscriptionActive: focusActive, socialIdentifiers, superAdminGift: gift ? { status: gift.status, endsAt: gift.endsAt } : null, userRestrictionStatus: restricted ? (restricted.restrictionKind === 'banned' ? 'banned' : 'suspended') : 'none' };
}

/** One-way legacy feature-permission projection; never a commercial input. */
export function commercialCompatibilityPlan(snapshot: UserCommercialEntitlementSnapshot, internalOverride = false): 'free' | 'premium' | 'admin_internal' {
  if (internalOverride) return 'admin_internal';
  return snapshot.activePlanCode === 'focus_plan' && (snapshot.subscriptionActive || snapshot.superAdminGift?.status === 'active') ? 'premium' : 'free';
}
