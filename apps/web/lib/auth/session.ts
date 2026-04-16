import { auth } from './config';
import { ApplicationStateService } from '@elceo/application-state';

const stateService = new ApplicationStateService();

export async function requireAppUserState() {
  const session = await auth();
  if (!session?.user?.id) {
    throw new Error('UNAUTHORIZED');
  }

  const appState = await stateService.getApplicationStateByUserId(session.user.id);

  return {
    session,
    appState
  };
}

export async function requireOnboardedAppUserState() {
  const { session, appState } = await requireAppUserState();
  if (!appState.profile.onboardingCompletedAt) {
    throw new Error('ONBOARDING_REQUIRED');
  }
  return { session, appState };
}
