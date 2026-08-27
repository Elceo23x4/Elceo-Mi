import { requireOnboardedAppUserState } from '../../../../lib/auth/session';
import { withDashboardReadAdmission } from '../../../../lib/inbound-read-admission';
import { createDashboardGetHandler } from '../../../../lib/dashboard-route-handler';
import { readCanonicalDashboardWorkspace } from '../../../../lib/server/composition/dashboard-projection-runtime';
export const GET=createDashboardGetHandler({authenticate:requireOnboardedAppUserState,readDashboard:readCanonicalDashboardWorkspace,admit:withDashboardReadAdmission});
