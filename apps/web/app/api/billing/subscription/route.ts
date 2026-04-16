import { NextResponse } from 'next/server';
import { requireAppUserState } from '../../../../lib/auth/session';

export async function GET() {
  try {
    const { appState } = await requireAppUserState();
    return NextResponse.json({ subscription: appState.subscription, entitlement: appState.entitlement }, { headers: { 'cache-control': 'no-store' } });
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401, headers: { 'cache-control': 'no-store' } });
  }
}
