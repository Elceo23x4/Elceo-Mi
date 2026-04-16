import { redirect } from 'next/navigation';
import { OnboardingFlow } from '../../components/workflows/OnboardingFlow';
import { getCurrentUserState } from '../../lib/app-user-state';

export default async function OnboardingPage() {
  try {
    const { appState, uiState } = await getCurrentUserState();

    if (appState.profile.onboardingCompletedAt) {
      redirect('/dashboard');
    }

    return <OnboardingFlow initialState={uiState} />;
  } catch {
    redirect('/login?callbackUrl=/onboarding');
  }
}
