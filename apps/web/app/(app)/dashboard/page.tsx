import { DashboardShell } from '../../../components/dashboard/DashboardShell';
import { buildMockDashboardViewModel } from '../../../lib/mock-cognition';

export default function DashboardPage() {
  const viewModel = buildMockDashboardViewModel('XAU/USD');
  return <DashboardShell viewModel={viewModel} />;
}
