import { Reveal } from '@elceo/motion';
import { ApplicationStateService } from '@elceo/application-state';
import { AnalyticsService } from '@elceo/analytics';
import { requireAppUserState } from '../../../lib/auth/session';
import { AnalyticsWorkbench } from '../../../components/analytics/AnalyticsWorkbench';

const appState = new ApplicationStateService();
const analytics = new AnalyticsService();

export default async function AnalyticsPage() {
  const { appState: state } = await requireAppUserState();
  const entries = await appState.getTradeJournalEntries(state.profile.id, state.entitlement.journalEntryHistoryLimit);
  const report = analytics.computeFromJournal(entries);

  return (
    <Reveal>
      <AnalyticsWorkbench report={report} canAccessBehaviorCoaching={state.entitlement.canAccessBehaviorCoaching} />
    </Reveal>
  );
}
