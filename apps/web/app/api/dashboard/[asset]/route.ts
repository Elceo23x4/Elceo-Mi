import { NextResponse } from 'next/server';
import { getDashboardData } from '@elceo/ingestion';
import { requireOnboardedAppUserState } from '../../../../lib/auth/session';

export async function GET(_: Request, context: { params: Promise<{ asset: string }> }) {
  try {
    const { appState } = await requireOnboardedAppUserState();
    const { asset } = await context.params;
    const requestedAsset = decodeURIComponent(asset ?? 'XAU/USD');
    const allowedAsset = appState.watchlist.assets.includes(requestedAsset) ? requestedAsset : appState.watchlist.assets[0] ?? 'XAU/USD';

    const data = await getDashboardData(allowedAsset);
    if (!data) {
      return NextResponse.json({ error: 'Dashboard data unavailable' }, { status: 503 });
    }

    return NextResponse.json(data);
  } catch (error) {
    const code = error instanceof Error && error.message === 'ONBOARDING_REQUIRED' ? 403 : 401;
    return NextResponse.json({ error: 'Unauthorized' }, { status: code });
  }
}
