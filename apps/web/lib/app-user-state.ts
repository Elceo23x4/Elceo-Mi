import { requireAppUserState, requireOnboardedAppUserState } from './auth/session';
import { toUiState } from './mock-state';

export async function getCurrentUserState() {
  const { session, appState } = await requireAppUserState();
  return { session, appState, uiState: toUiState(appState) };
}

export async function getOnboardedUserState() {
  const { session, appState } = await requireOnboardedAppUserState();
  return { session, appState, uiState: toUiState(appState) };
}
