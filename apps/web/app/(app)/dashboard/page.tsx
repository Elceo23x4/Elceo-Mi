import { DashboardShell } from '../../../components/dashboard/DashboardShell';
import { buildDashboardViewModelFromAppData } from '../../../lib/dashboard-data';

export default async function DashboardPage() {
  const viewModel = await buildDashboardViewModelFromAppData('XAU/USD');

  if (!viewModel) {
    return <div style={{ padding: '1rem' }}>Dashboard data is warming up. Please refresh shortly.</div>;
  }

  return <DashboardShell viewModel={viewModel} />;
}
