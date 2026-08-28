import { NextResponse } from 'next/server';
import { requireAppUserState } from '../../../../lib/auth/session';
import { captureError } from '../../../../lib/monitoring';
import { getRequestId } from '../../../../lib/request-context';

/** Portal remains fail-closed until the canonical provider boundary persists a verified customer reference. */
export async function POST(request: Request) {
  const requestId = getRequestId(request);
  try {
    await requireAppUserState();
    return NextResponse.json({ error: 'portal_unavailable' }, { status: 503, headers: { 'x-request-id': requestId, 'cache-control': 'no-store' } });
  } catch (error) {
    captureError('api.billing.portal', error, { requestId });
    const unauthorized = error instanceof Error && error.message === 'UNAUTHORIZED';
    return NextResponse.json({ error: unauthorized ? 'unauthorized' : 'portal_unavailable' }, { status: unauthorized ? 401 : 503, headers: { 'x-request-id': requestId, 'cache-control': 'no-store' } });
  }
}
