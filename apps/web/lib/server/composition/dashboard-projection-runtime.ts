import 'server-only';

import { Pool } from 'pg';
import {
  createAdaptiveMaterializationRedisClient,
  createProductionCanonicalDashboardProjectionReader,
  type CanonicalDashboardProjectionReader
} from '@elceo/reasoning';
import type { DashboardChartWorkspaceViewModel } from '@elceo/types';

const HORIZON = 'intraday';
const TIMEFRAME = 'H4' as const;
let reader: CanonicalDashboardProjectionReader | undefined;

/** Process-owned composition: requests reuse one Redis client, PostgreSQL pool, and bounded L1. */
export function getCanonicalDashboardProjectionReader(): CanonicalDashboardProjectionReader {
  if (reader) return reader;
  if (!process.env.DATABASE_URL) throw new Error('dashboard_projection_unavailable');
  const redisClient = createAdaptiveMaterializationRedisClient();
  const sqlPool = new Pool({ connectionString: process.env.DATABASE_URL });
  reader = createProductionCanonicalDashboardProjectionReader({
    redisClient,
    sqlPool,
    cacheLimits: { maxEntries: 24, maxSerializedBytes: 8 * 1024 * 1024 }
  });
  return reader;
}

/** Pure transport adapter. Stale and unavailable canonical truth fail closed. */
export async function readCanonicalDashboardWorkspace(asset: string, _signal: AbortSignal): Promise<DashboardChartWorkspaceViewModel | null> {
  try {
    const result = await getCanonicalDashboardProjectionReader().read(asset, HORIZON, TIMEFRAME);
    return result.state === 'available' ? result.artifact.payload.workspace : null;
  } catch {
    return null;
  }
}
