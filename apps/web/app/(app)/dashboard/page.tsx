import { DashboardShell } from '../../../components/dashboard/DashboardShell';
import { buildDashboardViewModelFromInternalData } from '../../../lib/mock-cognition';

export default async function DashboardPage() {
  const viewModel = await buildDashboardViewModelFromInternalData('XAU/USD');

  if (!viewModel) {
    return <div style={{ padding: '1rem' }}>Dashboard data is warming up. Please refresh shortly.</div>;
  }

  return <DashboardShell viewModel={viewModel} />;
}
