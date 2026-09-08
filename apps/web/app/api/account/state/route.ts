import { jsonSuccess, withApiErrorBoundary } from '@/lib/server/api';
import { requireAuthenticatedSubject } from '@/lib/server/auth';
import { getAccountStateRuntime } from '@/lib/server/composition';
import { toAccountStateDto } from '@/lib/server/account/state-contract';
export const GET=withApiErrorBoundary(async()=>{const s=await requireAuthenticatedSubject();return jsonSuccess(toAccountStateDto(await getAccountStateRuntime().getApplicationStateByUserId(s.userId)));});
