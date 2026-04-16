import { redirect } from 'next/navigation';
import { DashboardShell } from '../../../components/dashboard/DashboardShell';
import { buildDashboardViewModelFromAppData } from '../../../lib/dashboard-data';
import { getOnboardedUserState } from '../../../lib/app-user-state';

export default async function DashboardPage() {
  try {
    const { appState } = await getOnboardedUserState();
    const preferredAsset = appState.watchlist.assets[0] ?? 'XAU/USD';
    const viewModel = await buildDashboardViewModelFromAppData(preferredAsset);

    if (!viewModel) {
      return <div style={{ padding: '1rem' }}>Dashboard data is warming up. Please refresh shortly.</div>;
    }

    return <DashboardShell viewModel={viewModel} />;
  } catch (error) {
    if (error instanceof Error && error.message === 'ONBOARDING_REQUIRED') {
      redirect('/onboarding');
    }
    redirect('/login?callbackUrl=/dashboard');
  }
}
