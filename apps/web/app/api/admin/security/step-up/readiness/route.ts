import { jsonSuccess, withApiErrorBoundary } from '@/lib/server/api';
import { requireFeatureAccess } from '@/lib/server/access';
import { requireInternalRouteAccess } from '@/lib/server/auth';
import { buildSuperAdminStepUpCoverageReport, getSuperAdminStepUpPersistenceReadiness, getSuperAdminStepUpReadinessReport } from '@elceo/application-state';

export const GET = withApiErrorBoundary(async (request: Request) => {
  requireInternalRouteAccess(request);
  const access = await requireFeatureAccess('admin.read', { request });
  if (!access.ok) return access.response;
  const persistence = await getSuperAdminStepUpPersistenceReadiness();
  return jsonSuccess({
    providerReadiness: getSuperAdminStepUpReadinessReport(),
    coverage: buildSuperAdminStepUpCoverageReport(persistence.persistenceStatus),
    persistence
  });
});
