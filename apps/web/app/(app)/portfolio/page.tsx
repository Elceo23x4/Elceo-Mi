import { redirect } from 'next/navigation';
import { PortfolioShell } from '../../../components/portfolio/PortfolioShell';
import { getOnboardedUserState } from '../../../lib/app-user-state';

export default async function PortfolioPage() {
  try {
    const { uiState } = await getOnboardedUserState();
    return <PortfolioShell initialState={uiState} />;
  } catch (error) {
    if (error instanceof Error && error.message === 'ONBOARDING_REQUIRED') {
      redirect('/onboarding');
    }
    redirect('/login?callbackUrl=/portfolio');
  }
}
