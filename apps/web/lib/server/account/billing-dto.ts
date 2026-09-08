import 'server-only';
import type { AccountBillingSnapshotDto, BillingLifecycleSnapshot } from '@elceo/types';

/** Explicit browser allowlist. No customer or provider identity is serialized. */
export function toAccountBillingSnapshotDto(snapshot: BillingLifecycleSnapshot): AccountBillingSnapshotDto {
  return {
    generatedAt: snapshot.generatedAt,
    plan: {
      kind: snapshot.entitlementState.planKind,
      accountState: snapshot.entitlementState.accountState,
      startedAt: snapshot.entitlementState.planStartedAt ?? null,
      endsAt: snapshot.entitlementState.planEndsAt ?? null,
      trialEndsAt: snapshot.entitlementState.trialEndsAt ?? null
    },
    subscription: snapshot.subscription ? {
      state: snapshot.subscription.state,
      currentPeriodStart: snapshot.subscription.currentPeriodStart,
      currentPeriodEnd: snapshot.subscription.currentPeriodEnd,
      trialEndsAt: snapshot.subscription.trialEndsAt,
      canceledAt: snapshot.subscription.canceledAt,
      willCancelAtPeriodEnd: snapshot.subscription.willCancelAtPeriodEnd
    } : null
  };
}
