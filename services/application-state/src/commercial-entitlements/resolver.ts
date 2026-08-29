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
  let subscription: { plan_kind?: string; subscription_state?: string; provider_kind?:string; current_period_end?:string|null; trial_started_at?: string | null; trial_ends_at?: string | null; reconciliation_blocked?: boolean } | undefined;
  if (env.APP_STATE_REPOSITORY === 'sql') [subscription] = await queryDb(`SELECT s.plan_kind,s.subscription_state,s.provider_kind,s.current_period_end,s.trial_started_at,s.trial_ends_at,EXISTS(SELECT 1 FROM payment_operations p WHERE p.subject_user_id=$1 AND p.provider_subscription_reference=s.external_subscription_id AND p.reconciliation_state='required' AND p.safe_error_category='provider_equal_timestamp_conflict') AS reconciliation_blocked FROM app_billing_subscriptions s WHERE s.subject_kind='user' AND s.subject_id=$1 ORDER BY s.updated_at DESC NULLS LAST LIMIT 1`, [userId]);
  const restricted = controls.activeRestriction;
  const gift = controls.activeGift;
  const providerPeriodValid=subscription?.provider_kind!=='stripe'||Boolean(subscription.current_period_end&&Date.parse(subscription.current_period_end)>Date.parse(asOfIso));
  const focusActive = !restricted && ['active', 'trialing'].includes(subscription?.subscription_state ?? '') && subscription?.plan_kind === 'focus_plan' && providerPeriodValid && !subscription.reconciliation_blocked;
  const trialStartedAt = subscription?.trial_started_at ?? null;
  const trialActive = !restricted && !focusActive && Boolean(trialStartedAt && subscription?.trial_ends_at && Date.parse(subscription.trial_ends_at) > Date.parse(asOfIso));
  const socialIdentifiers: CommercialProfileSocialIdentifier[] = identifiers?.socialIdentifiers ?? [];
  return { userId, nowIso: asOfIso, trialStartedAt, activePlanCode: !restricted && (focusActive || gift) ? 'focus_plan' : trialActive ? 'kick_off' : null, subscriptionActive: focusActive, socialIdentifiers, superAdminGift: gift ? { status: gift.status, endsAt: gift.endsAt } : null, userRestrictionStatus: restricted ? (restricted.restrictionKind === 'banned' ? 'banned' : 'suspended') : 'none' };
}

/** One-way legacy feature-permission projection; never a commercial input. */
export function commercialCompatibilityPlan(snapshot: UserCommercialEntitlementSnapshot, internalOverride = false): 'free' | 'premium' | 'admin_internal' {
  if (internalOverride) return 'admin_internal';
  return snapshot.activePlanCode === 'focus_plan' && (snapshot.subscriptionActive || snapshot.superAdminGift?.status === 'active') ? 'premium' : 'free';
}
