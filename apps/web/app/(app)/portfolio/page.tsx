import { redirect } from 'next/navigation';
import { PortfolioShell } from '../../../components/portfolio/PortfolioShell';
import { getOnboardedUserState } from '../../../lib/app-user-state';

export default async function PortfolioPage() {
  try {
    const { uiState, appState } = await getOnboardedUserState();
    return <PortfolioShell initialState={uiState} trackedAssetLimit={appState.entitlement.trackedAssetLimit} subscriptionEligibleForPremium={appState.entitlement.subscriptionEligibleForPremium} />;
  } catch (error) {
    if (error instanceof Error && error.message === 'ONBOARDING_REQUIRED') {
      redirect('/onboarding');
    }
    redirect('/login?callbackUrl=/portfolio');
  }
}
