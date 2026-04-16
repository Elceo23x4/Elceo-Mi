import { getDashboardData } from '@elceo/ingestion';
import { NextResponse } from 'next/server';

export async function GET(_: Request, { params }: { params: { asset: string } }) {
  const assetCode = decodeURIComponent(params.asset);
  const data = await getDashboardData(assetCode);

  if (!data) {
    return NextResponse.json({ error: 'No dashboard data available yet.' }, { status: 404 });
  }

  return NextResponse.json(data, { status: 200 });
}
