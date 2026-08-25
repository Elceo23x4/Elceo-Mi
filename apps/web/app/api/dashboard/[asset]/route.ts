import { getDashboardData } from '@elceo/ingestion';
import { requireOnboardedAppUserState } from '../../../../lib/auth/session';
import { withDashboardReadAdmission } from '../../../../lib/inbound-read-admission';
import { createDashboardGetHandler } from '../../../../lib/dashboard-route-handler';
export const GET=createDashboardGetHandler({authenticate:requireOnboardedAppUserState,readDashboard:(asset)=>getDashboardData(asset),admit:withDashboardReadAdmission});
