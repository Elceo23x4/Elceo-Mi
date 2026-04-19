import { ApplicationStateService } from '../application-state-service';
import { InMemoryUserStateRepository } from '../repositories/user-state-repository';

function assert(condition: boolean, message: string): void {
  if (!condition) throw new Error(message);
}

export async function runApplicationStateTests(): Promise<void> {
  const repository = new InMemoryUserStateRepository();
  const service = new ApplicationStateService(repository);

  const state = await service.ensureUserFromIdentity({ email: 'user@elceo.dev', name: 'ELCEO User' });
  assert(state.profile.onboardingCompletedAt === null, 'onboarding should start incomplete');

  const afterOnboarding = await service.saveOnboardingState(state.profile.id, {
    termsAccepted: true,
    disclaimerAccepted: true,
    planTier: 'free',
    selectedAssets: ['XAU/USD', 'Nasdaq 100', 'EUR/USD', 'GBP/USD', 'BTC/USD']
  });
  assert(Boolean(afterOnboarding.profile.onboardingCompletedAt), 'onboarding completion should persist');
  assert(afterOnboarding.watchlist.assets.length === 4, 'free plan tracked asset limit should be enforced');

  const afterWatchlist = await service.saveWatchlist(state.profile.id, ['XAU/USD', 'EUR/USD', 'BTC/USD', 'USD/JPY', 'USD/CHF']);
  assert(afterWatchlist.watchlist.assets.length === 4, 'watchlist update should enforce tracked asset limit');

  const afterSettings = await service.saveSettings(state.profile.id, {
    motionIntensity: 'high',
    notifications: {
      inApp: true,
      email: false,
      browserPush: true
    },
    notificationClasses: {
      biasChanges: true,
      contradictionSpikes: true,
      keyLevelInteractions: true,
      macroEventWarnings: false,
      postEventRegimeShift: true,
      journalCoaching: true
    }
  });

  assert(afterSettings.notifications.browserPush, 'settings updates should persist');
}
