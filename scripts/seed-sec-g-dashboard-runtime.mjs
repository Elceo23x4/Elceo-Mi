import { randomUUID } from 'node:crypto';
import pg from 'pg';
import { createClient } from 'redis';

if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL_required');
if (!process.env.REDIS_URL) throw new Error('REDIS_URL_required');

const adaptive = await import('../services/reasoning/dist-test-cjs/services/reasoning/src/adaptive-materialization/index.cjs');
const {
  RedisAdaptiveOwnershipStore,
  buildDashboardProjectionCoordinationHash,
  buildMaterializationScopeHash,
  createProductionCanonicalDashboardProjectionReader
} = adaptive;

const sql = new pg.Pool({ connectionString: process.env.DATABASE_URL, max: 2, connectionTimeoutMillis: 1000 });
const redis = createClient({ url: process.env.REDIS_URL, socket: { connectTimeout: 3000, reconnectStrategy: false } });
redis.on('error', () => undefined);
await redis.connect();
const ownership = new RedisAdaptiveOwnershipStore(redis);
const artifactSqlPool = {
  async query(query, params = []) {
    const result = await sql.query(query, params);
    return { rows: result.rows.map((row) => ({ artifact_json: String(row.artifact_json) })) };
  }
};

try {
  // The preceding 12-asset acceptance deliberately persists adversarial dashboard
  // artifacts as negative-test evidence. Do not assume the newest row per asset is
  // canonical; let the production reader validate candidates before selecting one
  // for the k6 runtime pointer set.
  const rows = await sql.query(`
    SELECT artifact_json::text AS artifact_json
    FROM app_canonical_materializations
    WHERE kind='dashboard_projection'
      AND (artifact_json->>'freshUntil')::timestamptz > now()
    ORDER BY artifact_json->>'asset', created_at DESC, identity DESC
  `);

  const candidatesByAsset = new Map();
  for (const row of rows.rows) {
    const artifact = JSON.parse(String(row.artifact_json));
    const candidates = candidatesByAsset.get(artifact.asset) ?? [];
    candidates.push(artifact);
    candidatesByAsset.set(artifact.asset, candidates);
  }
  if (candidatesByAsset.size < 12) throw new Error(`sec_g_dashboard_fixture_asset_count:${candidatesByAsset.size}`);

  const reader = createProductionCanonicalDashboardProjectionReader({
    redisClient: redis,
    sqlPool: artifactSqlPool,
    cacheLimits: { maxEntries: 24, maxSerializedBytes: 8 * 1024 * 1024 }
  });
  const published = [];

  for (const [asset, candidates] of candidatesByAsset) {
    let accepted = null;
    for (const artifact of candidates) {
      const versions = {
        projectionVersion: artifact.projectionVersion,
        displayVersion: artifact.dashboardDisplayContractVersion,
        zoneRuleVersion: artifact.chartZoneRuleVersion,
        productPolicyVersion: artifact.dashboardProductPolicyVersion
      };
      const coordination = buildDashboardProjectionCoordinationHash({
        asset: artifact.asset,
        horizon: artifact.horizon,
        timeframe: artifact.timeframe,
        ...versions
      });
      const scope = buildMaterializationScopeHash({
        asset: artifact.asset,
        horizon: artifact.horizon,
        kind: 'dashboard_projection',
        timeframe: artifact.timeframe,
        ...versions
      });
      if (scope !== artifact.scopeHash) continue;

      const acquired = await ownership.acquireMaterialization(
        coordination,
        `sec-g-runtime:${artifact.identity}`,
        randomUUID(),
        10_000
      );
      if (!acquired.acquired) throw new Error(`sec_g_dashboard_pointer_lease_failed:${asset}`);
      try {
        if (!await ownership.publishCurrent(acquired.lease, scope, artifact.identity)) {
          throw new Error(`sec_g_dashboard_pointer_publish_failed:${asset}`);
        }
      } finally {
        await ownership.release(acquired.lease);
      }

      const result = await reader.read(artifact.asset, artifact.horizon, artifact.timeframe);
      if (result.state === 'available' && result.artifact?.identity === artifact.identity) {
        accepted = { asset: artifact.asset, identity: artifact.identity, scopeHash: scope, freshUntil: artifact.freshUntil };
        break;
      }
    }
    if (!accepted) throw new Error(`sec_g_dashboard_no_valid_runtime_candidate:${asset}`);
    published.push(accepted);
  }

  if (published.length < 12) throw new Error(`sec_g_dashboard_valid_fixture_count:${published.length}`);

  await import('node:fs/promises').then(({ mkdir, writeFile }) =>
    mkdir('artifacts/sec-g', { recursive: true }).then(() =>
      writeFile('artifacts/sec-g/dashboard-runtime-seed.json', JSON.stringify({ count: published.length, published }, null, 2))
    )
  );
  console.log(JSON.stringify({
    secGDashboardRuntime: 'ready',
    count: published.length,
    assets: published.map((item) => item.asset),
    readerMetrics: reader.metrics
  }));
} finally {
  if (redis.isOpen) redis.destroy();
  await sql.end();
}
