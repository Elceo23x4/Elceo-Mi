import { NextResponse } from 'next/server';
import { getDashboardData } from '@elceo/ingestion';
import { requireOnboardedAppUserState } from '../../../../lib/auth/session';
import { withDashboardReadAdmission } from '../../../../lib/inbound-read-admission';

export async function GET(_: Request, context: { params: Promise<{ asset: string }> }) {
  try {
    const { session, appState } = await requireOnboardedAppUserState();
    const { asset } = await context.params;
    const requestedAsset = decodeURIComponent(asset ?? 'XAU/USD');
    const allowedAsset = appState.watchlist.assets.includes(requestedAsset) ? requestedAsset : appState.watchlist.assets[0] ?? 'XAU/USD';

    const admitted = await withDashboardReadAdmission(session.user!.id!, () => getDashboardData(allowedAsset));
    if (admitted.ok === false) {
      return NextResponse.json({ error: admitted.status === 429 ? 'Request limit reached' : 'Dashboard data unavailable' }, { status: admitted.status });
    }
    const data = admitted.value;
    if (!data) {
      return NextResponse.json({ error: 'Dashboard data unavailable' }, { status: 503 });
    }

    return NextResponse.json(data);
  } catch (error) {
    const code = error instanceof Error && error.message === 'ONBOARDING_REQUIRED' ? 403 : 401;
    return NextResponse.json({ error: 'Unauthorized' }, { status: code });
  }
}
