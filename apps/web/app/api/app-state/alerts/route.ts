import { NextResponse } from 'next/server';
import { ApplicationStateService } from '@elceo/application-state';
import { requireAppUserState } from '../../../../lib/auth/session';

const service = new ApplicationStateService();

export async function GET() {
  try {
    const { appState } = await requireAppUserState();
    const refreshed = await service.getApplicationStateByUserId(appState.profile.id);
    return NextResponse.json({ alerts: refreshed.alerts });
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
}

export async function PATCH(request: Request) {
  try {
    const { appState } = await requireAppUserState();
    const body = (await request.json()) as { alertId: string };
    await service.markAlertRead(appState.profile.id, body.alertId);
    const refreshed = await service.getApplicationStateByUserId(appState.profile.id);
    return NextResponse.json({ alerts: refreshed.alerts });
  } catch {
    return NextResponse.json({ error: 'Failed to update alert' }, { status: 400 });
  }
}
