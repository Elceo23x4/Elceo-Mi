import type { CanonicalBillingSubscription, ElceoPlanKind } from '@elceo/types';
import type { AccountEntitlementRepository } from '../persistence';

export type EntitlementSyncResult = { previousPlanKind: ElceoPlanKind | null; nextPlanKind: ElceoPlanKind; changed: boolean };

export async function syncEntitlementsFromBilling(accountRepo: AccountEntitlementRepository, subjectId: string, subscription: CanonicalBillingSubscription | null, nowIso: string): Promise<EntitlementSyncResult> {
  const current = await accountRepo.getAccountEntitlement('user', subjectId);
  const previousPlanKind = current?.planKind ?? null;
  let nextPlanKind: ElceoPlanKind = 'free';
  if (subscription && (subscription.state === 'active' || subscription.state === 'trialing') && subscription.canonicalPlanKind === 'premium') nextPlanKind = 'premium';
  if (current?.internalOverride && current.planKind === 'admin_internal') nextPlanKind = 'admin_internal';
  const changed = previousPlanKind !== nextPlanKind;
  if (current && changed) {
    await accountRepo.saveAccountEntitlement({ ...current, planKind: nextPlanKind, updatedAt: nowIso });
  }
  return { previousPlanKind, nextPlanKind, changed };
}
