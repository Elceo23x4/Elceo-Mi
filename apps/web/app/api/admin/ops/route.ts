import { NextResponse } from 'next/server';
import { getAdminOperationalSnapshot } from '@elceo/admin-jobs';
import { requireAppUserState } from '../../../../lib/auth/session';

export async function GET() {
  try {
    const { appState } = await requireAppUserState();
    if (!['super_admin', 'analyst_admin', 'support_admin'].includes(appState.profile.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const snapshot = await getAdminOperationalSnapshot();
    return NextResponse.json(snapshot);
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
}
