import { NextResponse } from 'next/server';
import { ApplicationStateService } from '@elceo/application-state';
import { requireAppUserState } from '../../../../lib/auth/session';

const service = new ApplicationStateService();

export async function POST(request: Request) {
  try {
    const { appState } = await requireAppUserState();
    const body = (await request.json()) as {
      termsAccepted: boolean;
      disclaimerAccepted: boolean;
      planTier: 'free' | 'premium';
      selectedAssets: string[];
    };

    const nextState = await service.saveOnboardingState(appState.profile.id, body);
    return NextResponse.json(nextState);
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Failed to persist onboarding' }, { status: 400 });
  }
}
