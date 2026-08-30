import { requireOnboardedAppUserState } from '../../../../lib/auth/session';
import { withDashboardReadAdmission } from '../../../../lib/inbound-read-admission';
import { createDashboardGetHandler } from '../../../../lib/dashboard-route-handler';
import { readCanonicalDashboardWorkspace, readKickOffDashboard } from '../../../../lib/server/composition/dashboard-projection-runtime';
import { resolveUserCommercialEntitlementSnapshot } from '@elceo/application-state';
import { resolveDashboardCommercialAccess } from '../../../../lib/server/dashboard-commercial-authority';

export const GET=createDashboardGetHandler({
  authenticate:requireOnboardedAppUserState,
  readDashboard:readCanonicalDashboardWorkspace,
  readKickOff:readKickOffDashboard,
  admit:withDashboardReadAdmission,
  resolveCommercialAccess:async userId=>resolveDashboardCommercialAccess(await resolveUserCommercialEntitlementSnapshot(userId))
});
