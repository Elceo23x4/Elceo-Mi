import { ApplicationStateService } from '../application-state-service';
import { InMemoryAlertRepository } from '../repositories/alert-repository';
import { InMemoryTradeJournalRepository } from '../repositories/trade-journal-repository';
import { InMemoryUserStateRepository } from '../repositories/user-state-repository';

function assert(condition: boolean, message: string): void {
  if (!condition) throw new Error(`Assertion failed: ${message}`);
}

export async function runSubscriptionMappingTests(): Promise<void> {
  const users = new InMemoryUserStateRepository();
  const alerts = new InMemoryAlertRepository();
  const journal = new InMemoryTradeJournalRepository();
  const appState = new ApplicationStateService(users, alerts, journal);

  const state = await appState.ensureUserFromIdentity({ email: 'entitlement@elceo.dev', name: 'Entitlement Tester' });

  await appState.applySubscriptionState(state.profile.id, {
    provider: 'mock',
    status: 'active',
    planTier: 'premium',
    externalCustomerId: 'cus_42',
    externalSubscriptionId: 'sub_42',
    currentPeriodStartUtc: '2026-04-01T00:00:00.000Z',
    currentPeriodEndUtc: '2026-05-01T00:00:00.000Z',
    cancelAtPeriodEnd: false,
    lastWebhookEventId: 'evt_42'
  });

  const premiumState = await appState.getApplicationStateByUserId(state.profile.id);
  assert(premiumState.profile.planTier === 'premium', 'active premium subscription should map to premium plan tier');
  assert(premiumState.entitlement.canAccessPremiumDepth, 'premium should grant premium depth entitlement');

  await appState.applySubscriptionState(state.profile.id, {
    provider: 'mock',
    status: 'past_due',
    planTier: 'premium',
    externalCustomerId: 'cus_42',
    externalSubscriptionId: 'sub_42',
    currentPeriodStartUtc: '2026-04-01T00:00:00.000Z',
    currentPeriodEndUtc: '2026-05-01T00:00:00.000Z',
    cancelAtPeriodEnd: true,
    lastWebhookEventId: 'evt_43'
  });

  const downgradedState = await appState.getApplicationStateByUserId(state.profile.id);
  assert(downgradedState.profile.planTier === 'free', 'past_due should downgrade effective plan tier to free');
  assert(!downgradedState.entitlement.canAccessPremiumDepth, 'downgraded state should revoke premium depth');
}
