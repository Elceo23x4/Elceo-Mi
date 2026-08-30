import 'server-only';

import { Pool } from 'pg';
import {
  createAdaptiveMaterializationRedisClient,
  createProductionCanonicalDashboardProjectionReader,
  createProductionCanonicalKickOffContextReader,
  projectKickOffDashboard,
  type CanonicalDashboardProjectionReader
} from '@elceo/reasoning';
import type { DashboardChartWorkspaceViewModel, KickOffDashboardContextArtifact, KickOffDashboardViewModelV1 } from '@elceo/types';

const HORIZON = 'intraday';
const TIMEFRAME = 'H4' as const;
let reader: CanonicalDashboardProjectionReader | undefined;
let kickOffReader: ReturnType<typeof createProductionCanonicalKickOffContextReader> | undefined;

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

function getKickOffReader(){if(kickOffReader)return kickOffReader;if(!process.env.DATABASE_URL)throw new Error('kick_off_context_unavailable');const redisClient=createAdaptiveMaterializationRedisClient(),sqlPool=new Pool({connectionString:process.env.DATABASE_URL});return kickOffReader=createProductionCanonicalKickOffContextReader({redisClient,sqlPool,cacheLimits:{maxEntries:24,maxSerializedBytes:4*1024*1024}})}

/** Passive, same-epoch projection; context failure never suppresses validated D1 chart truth. */
export async function readKickOffDashboard(asset:string,_signal:AbortSignal,features={evidenceScore:true,macroHeadlines:true}):Promise<KickOffDashboardViewModelV1|null>{
  let dashboard:Awaited<ReturnType<CanonicalDashboardProjectionReader['read']>>;try{dashboard=await getCanonicalDashboardProjectionReader().read(asset,HORIZON,TIMEFRAME)}catch{return null}if(dashboard.state!=='available'||dashboard.artifact.kind!=='dashboard_projection')return null;const d=dashboard.artifact;
  let candidate:KickOffDashboardContextArtifact|null=null;try{const context=await getKickOffReader().read(asset,HORIZON,TIMEFRAME);candidate=context.state==='available'?context.artifact as KickOffDashboardContextArtifact:null}catch{candidate=null}
  const valid=!!candidate&&candidate.parentDashboardProjectionIdentity===d.identity&&candidate.parentDashboardProjectionIntegrityHash===d.integrityHash&&candidate.parentCognitionArtifactIdentity===d.parentCognitionArtifactIdentity&&candidate.parentCognitionIntegrityHash===d.parentCognitionIntegrityHash&&candidate.evaluatedAt===d.evaluatedAt;
  return projectKickOffDashboard(d.payload.workspace,valid?candidate:null,{asset:d.asset,horizon:d.horizon as KickOffDashboardViewModelV1['horizon'],evaluatedAt:d.evaluatedAt,features});
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
