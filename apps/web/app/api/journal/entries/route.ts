import { NextResponse } from 'next/server';
import { ApplicationStateService } from '@elceo/application-state';
import { requireAppUserState } from '../../../../lib/auth/session';
import type { TradeJournalCreateInput } from '@elceo/types';

const appState = new ApplicationStateService();

export async function GET() {
  try {
    const { appState: state } = await requireAppUserState();
    const entries = await appState.getTradeJournalEntries(state.profile.id, state.entitlement.journalEntryHistoryLimit);
    return NextResponse.json(entries);
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
}

export async function POST(request: Request) {
  try {
    const { appState: state } = await requireAppUserState();
    const payload = (await request.json()) as TradeJournalCreateInput;
    const created = await appState.createTradeJournalEntry(state.profile.id, payload);
    return NextResponse.json(created, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Invalid journal entry' }, { status: 400 });
  }
}
