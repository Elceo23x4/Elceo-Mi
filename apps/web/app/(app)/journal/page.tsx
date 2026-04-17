import { Reveal } from '@elceo/motion';
import { ApplicationStateService } from '@elceo/application-state';
import { requireAppUserState } from '../../../lib/auth/session';
import { JournalWorkbench } from '../../../components/journal/JournalWorkbench';

const appState = new ApplicationStateService();

export default async function JournalPage() {
  const { appState: state } = await requireAppUserState();
  const entries = await appState.getTradeJournalEntries(state.profile.id, state.entitlement.journalEntryHistoryLimit);

  return (
    <Reveal>
      <JournalWorkbench initialEntries={entries} />
    </Reveal>
  );
}
