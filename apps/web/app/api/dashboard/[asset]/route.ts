import { requireOnboardedAppUserState } from '../../../../lib/auth/session';
import { withDashboardReadAdmission } from '../../../../lib/inbound-read-admission';
import { createDashboardGetHandler } from '../../../../lib/dashboard-route-handler';
import { readCanonicalDashboardWorkspace } from '../../../../lib/server/composition/dashboard-projection-runtime';
import { evaluateCommercialFeatureAccess, resolveUserCommercialEntitlementSnapshot } from '@elceo/application-state';

export const GET=createDashboardGetHandler({
  authenticate:requireOnboardedAppUserState,
  readDashboard:readCanonicalDashboardWorkspace,
  admit:withDashboardReadAdmission,
  authorizeCommercial:async userId=>evaluateCommercialFeatureAccess({snapshot:await resolveUserCommercialEntitlementSnapshot(userId),featureKey:'premium.full_access'}).decision==='allow'
});
