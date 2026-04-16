import { NextResponse } from 'next/server';
import { ApplicationStateService } from '@elceo/application-state';
import { requireAppUserState } from '../../../../lib/auth/session';

const service = new ApplicationStateService();

export async function PATCH(request: Request) {
  try {
    const { appState } = await requireAppUserState();
    const body = (await request.json()) as {
      motionIntensity: 'low' | 'medium' | 'high';
      notifications: { inApp: boolean; email: boolean; browserPush: boolean };
      notificationClasses: {
        biasChanges: boolean;
        contradictionSpikes: boolean;
        keyLevelInteractions: boolean;
        macroEventWarnings: boolean;
        postEventRegimeShift: boolean;
        journalCoaching: boolean;
      };
    };

    const nextState = await service.saveSettings(appState.profile.id, body);
    return NextResponse.json(nextState);
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Failed to persist settings' }, { status: 400 });
  }
}
