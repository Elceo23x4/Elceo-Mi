import { redirect } from 'next/navigation';
import { SettingsShell } from '../../../components/settings/SettingsShell';
import { getOnboardedUserState } from '../../../lib/app-user-state';
import { commercialCompatibilityPlan, evaluateUserCommercialEntitlement, resolveUserCommercialEntitlementSnapshot } from '@elceo/application-state';

export default async function SettingsPage() {
  let state;
  try { state = await getOnboardedUserState(); }
  catch (error) { redirect(error instanceof Error && error.message === 'ONBOARDING_REQUIRED' ? '/onboarding' : '/login?callbackUrl=/settings'); }
  const commercial=await resolveUserCommercialEntitlementSnapshot(state.appState.profile.id);
  const status=evaluateUserCommercialEntitlement(commercial);
  const compatibility=commercialCompatibilityPlan(commercial);
  return <SettingsShell initialState={state.uiState} billing={{status,provider:'canonical',subscriptionEligibleForPremium:status==='active',canAccessPremiumDepth:compatibility==='premium'}} />;
}
