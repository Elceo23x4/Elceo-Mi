import { NextResponse } from 'next/server';
import { ApplicationStateService } from '@elceo/application-state';
import { requireAppUserState } from '../../../../lib/auth/session';

const service = new ApplicationStateService();

export async function PATCH(request: Request) {
  try {
    const { appState } = await requireAppUserState();
    const body = (await request.json()) as { assets: string[] };

    const nextState = await service.saveWatchlist(appState.profile.id, body.assets);
    return NextResponse.json(nextState);
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Failed to persist watchlist' }, { status: 400 });
  }
}
