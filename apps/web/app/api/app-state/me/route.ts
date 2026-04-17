import { NextResponse } from 'next/server';
import { requireAppUserState } from '../../../../lib/auth/session';

export async function GET() {
  try {
    const { appState } = await requireAppUserState();
    return NextResponse.json(appState);
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
}
