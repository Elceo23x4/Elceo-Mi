import { ApplicationStateService } from '../application-state-service';
import { InMemoryAlertRepository } from '../repositories/alert-repository';
import { InMemoryTradeJournalRepository } from '../repositories/trade-journal-repository';
import { InMemoryUserStateRepository } from '../repositories/user-state-repository';

function assert(condition: boolean, message: string): void {
  if (!condition) throw new Error(`Assertion failed: ${message}`);
}

export async function runEntitlementEnforcementTests(): Promise<void> {
  const users = new InMemoryUserStateRepository();
  const alerts = new InMemoryAlertRepository();
  const journal = new InMemoryTradeJournalRepository();
  const appState = new ApplicationStateService(users, alerts, journal);

  const state = await appState.ensureUserFromIdentity({ email: 'free@elceo.dev', name: 'Free Tester' });

  let failed = false;
  try {
    await appState.saveOnboardingState(state.profile.id, {
      termsAccepted: true,
      disclaimerAccepted: true,
      planTier: 'premium',
      selectedAssets: ['XAU/USD', 'Nasdaq 100']
    });
  } catch {
    failed = true;
  }

  assert(failed, 'premium onboarding must be rejected without active/trialing subscription');

  await appState.applySubscriptionState(state.profile.id, {
    provider: 'mock',
    status: 'trialing',
    planTier: 'premium',
    externalCustomerId: null,
    externalSubscriptionId: 'sub_trial',
    currentPeriodStartUtc: '2026-04-01T00:00:00.000Z',
    currentPeriodEndUtc: '2026-04-10T00:00:00.000Z',
    cancelAtPeriodEnd: false,
    lastWebhookEventId: 'evt_trial'
  });

  const upgraded = await appState.saveOnboardingState(state.profile.id, {
    termsAccepted: true,
    disclaimerAccepted: true,
    planTier: 'premium',
    selectedAssets: ['XAU/USD', 'Nasdaq 100', 'EUR/USD', 'USD/JPY', 'BTC/USD']
  });

  assert(upgraded.profile.planTier === 'premium', 'trialing subscription should allow premium onboarding state');
}
