import { redirect } from 'next/navigation';
import { SettingsShell } from '../../../components/settings/SettingsShell';
import { getOnboardedUserState } from '../../../lib/app-user-state';

export default async function SettingsPage() {
  try {
    const { uiState, appState } = await getOnboardedUserState();
    return (
      <SettingsShell
        initialState={uiState}
        billing={{
          status: appState.subscription.status,
          provider: appState.subscription.provider,
          subscriptionEligibleForPremium: appState.entitlement.subscriptionEligibleForPremium,
          canAccessPremiumDepth: appState.entitlement.canAccessPremiumDepth
        }}
      />
    );
  } catch (error) {
    if (error instanceof Error && error.message === 'ONBOARDING_REQUIRED') {
      redirect('/onboarding');
    }
    redirect('/login?callbackUrl=/settings');
  }
}
