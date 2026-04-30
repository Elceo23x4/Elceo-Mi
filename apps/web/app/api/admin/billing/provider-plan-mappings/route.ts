import { jsonSuccess, withApiErrorBoundary } from '@/lib/server/api';
import { requireInternalRouteAccess } from '@/lib/server/auth';
import { requireFeatureAccess } from '@/lib/server/access';
import { getPaymentProviderRuntime } from '@/lib/server/composition';

export const GET = withApiErrorBoundary(async (request: Request) => {
  requireInternalRouteAccess(request);
  const access = await requireFeatureAccess('admin.read', { request });
  if (!access.ok) return access.response;
  const providerKind = new URL(request.url).searchParams.get('providerKind') as 'stripe' | 'manual_test' | 'internal_import' | null;
  if (providerKind && providerKind !== 'stripe' && providerKind !== 'manual_test' && providerKind !== 'internal_import') throw new Error('validation_error:providerKind is invalid');
  const mappings = await getPaymentProviderRuntime().listProviderPlanMappings(providerKind ?? undefined);
  return jsonSuccess({ mappings });
});
