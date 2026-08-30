import { requireOnboardedAppUserState } from '../../../../lib/auth/session';
import { withDashboardReadAdmission } from '../../../../lib/inbound-read-admission';
import { createDashboardGetHandler } from '../../../../lib/dashboard-route-handler';
import { readCanonicalDashboardWorkspace, readKickOffDashboard } from '../../../../lib/server/composition/dashboard-projection-runtime';
import { evaluateCommercialFeatureAccess, resolveUserCommercialEntitlementSnapshot } from '@elceo/application-state';

export const GET=createDashboardGetHandler({
  authenticate:requireOnboardedAppUserState,
  readDashboard:readCanonicalDashboardWorkspace,
  readKickOff:readKickOffDashboard,
  admit:withDashboardReadAdmission,
  resolveCommercialAccess:async userId=>{const snapshot=await resolveUserCommercialEntitlementSnapshot(userId);if(evaluateCommercialFeatureAccess({snapshot,featureKey:'premium.full_access'}).decision==='allow')return 'focus_plan';if(evaluateCommercialFeatureAccess({snapshot,featureKey:'dashboard.chart'}).decision!=='allow')return 'denied';return{access:'kick_off',features:{evidenceScore:evaluateCommercialFeatureAccess({snapshot,featureKey:'dashboard.evidence_score'}).decision==='allow',macroHeadlines:evaluateCommercialFeatureAccess({snapshot,featureKey:'dashboard.macro_headlines'}).decision==='allow'}};}
});
