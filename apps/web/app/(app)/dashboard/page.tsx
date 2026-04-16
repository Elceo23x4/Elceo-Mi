import { redirect } from 'next/navigation';
import { DashboardShell } from '../../../components/dashboard/DashboardShell';
import { buildDashboardViewModelFromAppData } from '../../../lib/dashboard-data';
import { getOnboardedUserState } from '../../../lib/app-user-state';
import { evaluateAndPersistAlerts } from '@elceo/notifications';

export default async function DashboardPage() {
  try {
    const { appState } = await getOnboardedUserState();
    const preferredAsset = appState.watchlist.assets[0] ?? 'XAU/USD';
    const workspace = await buildDashboardViewModelFromAppData(preferredAsset);

    if (!workspace) {
      return <div style={{ padding: '1rem' }}>Dashboard data is warming up. Please refresh shortly.</div>;
    }

    await evaluateAndPersistAlerts({ userId: appState.profile.id, current: workspace });

    return <DashboardShell workspace={workspace} dashboardModuleLimit={appState.entitlement.dashboardModuleLimit} canAccessPremiumDepth={appState.entitlement.canAccessPremiumDepth} />;
  } catch (error) {
    if (error instanceof Error && error.message === 'ONBOARDING_REQUIRED') {
      redirect('/onboarding');
    }
    redirect('/login?callbackUrl=/dashboard');
  }
}
