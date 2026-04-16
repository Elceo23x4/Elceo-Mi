import { redirect } from 'next/navigation';
import { SettingsShell } from '../../../components/settings/SettingsShell';
import { getOnboardedUserState } from '../../../lib/app-user-state';

export default async function SettingsPage() {
  try {
    const { uiState } = await getOnboardedUserState();
    return <SettingsShell initialState={uiState} />;
  } catch (error) {
    if (error instanceof Error && error.message === 'ONBOARDING_REQUIRED') {
      redirect('/onboarding');
    }
    redirect('/login?callbackUrl=/settings');
  }
}
