import { redirect } from 'next/navigation';
import { DashboardShell } from '../../../components/dashboard/DashboardShell';
import { readCanonicalDashboardWorkspace } from '../../../lib/server/composition/dashboard-projection-runtime';
import { evaluateCommercialFeatureAccess, resolveUserCommercialEntitlementSnapshot } from '@elceo/application-state';
import { getOnboardedUserState } from '../../../lib/app-user-state';
import { evaluateAndPersistAlerts } from '@elceo/notifications';

export default async function DashboardPage() {
  let appState;
  try { ({appState}=await getOnboardedUserState()); }
  catch(error){ redirect(error instanceof Error&&error.message==='ONBOARDING_REQUIRED'?'/onboarding':'/login?callbackUrl=/dashboard'); }
  const preferredAsset=appState.watchlist.assets[0]??'XAU/USD';
  const commercial=await resolveUserCommercialEntitlementSnapshot(appState.profile.id);
  if(evaluateCommercialFeatureAccess({snapshot:commercial,featureKey:'premium.full_access'}).decision!=='allow') redirect('/subscription');
  const workspace=await readCanonicalDashboardWorkspace(preferredAsset,new AbortController().signal);
  if(!workspace)return <div style={{padding:'1rem'}}>Dashboard data is warming up. Please refresh shortly.</div>;
  await evaluateAndPersistAlerts({userId:appState.profile.id,current:workspace});
  return <DashboardShell workspace={workspace} dashboardModuleLimit={workspace.dashboard.modules.length} canAccessPremiumDepth />;
}
