import { redirect } from 'next/navigation';
import { DashboardShell } from '../../../components/dashboard/DashboardShell';
import { KickOffDashboard } from '../../../components/dashboard/KickOffDashboard';
import { readCanonicalDashboardWorkspace, readKickOffDashboard } from '../../../lib/server/composition/dashboard-projection-runtime';
import { evaluateCommercialFeatureAccess, resolveUserCommercialEntitlementSnapshot } from '@elceo/application-state';
import { getOnboardedUserState } from '../../../lib/app-user-state';
import { evaluateAndPersistAlerts } from '@elceo/notifications';

export default async function DashboardPage() {
  let appState;
  try { ({appState}=await getOnboardedUserState()); }
  catch(error){ redirect(error instanceof Error&&error.message==='ONBOARDING_REQUIRED'?'/onboarding':'/login?callbackUrl=/dashboard'); }
  const preferredAsset=appState.watchlist.assets[0]??'XAU/USD';
  const commercial=await resolveUserCommercialEntitlementSnapshot(appState.profile.id);
  const fullAccess=evaluateCommercialFeatureAccess({snapshot:commercial,featureKey:'premium.full_access'}).decision==='allow';
  const kickOffAccess=evaluateCommercialFeatureAccess({snapshot:commercial,featureKey:'dashboard.chart'}).decision==='allow';
  if(!fullAccess&&!kickOffAccess) redirect('/subscription');
  if(!fullAccess){const features={evidenceScore:evaluateCommercialFeatureAccess({snapshot:commercial,featureKey:'dashboard.evidence_score'}).decision==='allow',macroHeadlines:evaluateCommercialFeatureAccess({snapshot:commercial,featureKey:'dashboard.macro_headlines'}).decision==='allow'};const model=await readKickOffDashboard(preferredAsset,new AbortController().signal,features);if(!model)return <div style={{padding:'1rem'}}>Dashboard data is warming up. Please refresh shortly.</div>;return <KickOffDashboard model={model}/>;}
  const workspace=await readCanonicalDashboardWorkspace(preferredAsset,new AbortController().signal);
  if(!workspace)return <div style={{padding:'1rem'}}>Dashboard data is warming up. Please refresh shortly.</div>;
  await evaluateAndPersistAlerts({userId:appState.profile.id,current:workspace});
  return <DashboardShell workspace={workspace} dashboardModuleLimit={workspace.dashboard.modules.length} canAccessPremiumDepth />;
}
