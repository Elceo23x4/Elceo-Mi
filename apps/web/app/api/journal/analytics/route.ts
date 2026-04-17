import { NextResponse } from 'next/server';
import { ApplicationStateService } from '@elceo/application-state';
import { AnalyticsService } from '@elceo/analytics';
import { requireAppUserState } from '../../../../lib/auth/session';

const appState = new ApplicationStateService();
const analytics = new AnalyticsService();

export async function GET() {
  try {
    const { appState: state } = await requireAppUserState();
    const entries = await appState.getTradeJournalEntries(state.profile.id, state.entitlement.journalEntryHistoryLimit);
    const report = analytics.computeFromJournal(entries);
    return NextResponse.json(report);
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
}
