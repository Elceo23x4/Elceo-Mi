import { redirect } from 'next/navigation';
import { DashboardShell } from '../../../components/dashboard/DashboardShell';
import { KickOffDashboard } from '../../../components/dashboard/KickOffDashboard';
import { readCanonicalDashboardWorkspace, readKickOffDashboard } from '../../../lib/server/composition/dashboard-projection-runtime';
import { resolveUserCommercialEntitlementSnapshot } from '@elceo/application-state';
import { getOnboardedUserState } from '../../../lib/app-user-state';
import { evaluateAndPersistAlerts } from '@elceo/notifications';
import { resolveDashboardCommercialAccess } from '../../../lib/server/dashboard-commercial-authority';
import { resolveDashboardPageExperience } from '../../../lib/server/dashboard-page-orchestration';

export default async function DashboardPage() {
  let appState;
  try { ({appState}=await getOnboardedUserState()); }
  catch(error){ redirect(error instanceof Error&&error.message==='ONBOARDING_REQUIRED'?'/onboarding':'/login?callbackUrl=/dashboard'); }
  const preferredAsset=appState.watchlist.assets[0]??'XAU/USD';
  const commercial=await resolveUserCommercialEntitlementSnapshot(appState.profile.id);
  const experience=await resolveDashboardPageExperience({userId:appState.profile.id,asset:preferredAsset,access:resolveDashboardCommercialAccess(commercial),readDashboard:readCanonicalDashboardWorkspace,readKickOff:readKickOffDashboard,evaluatePremiumAlerts:evaluateAndPersistAlerts});
  if(experience.kind==='denied')redirect('/subscription');
  if(experience.kind==='warming')return <div style={{padding:'1rem'}}>Dashboard data is warming up. Please refresh shortly.</div>;
  if(experience.kind==='kick_off')return <KickOffDashboard model={experience.model}/>;
  return <DashboardShell workspace={experience.workspace} dashboardModuleLimit={experience.workspace.dashboard.modules.length} canAccessPremiumDepth />;
}
