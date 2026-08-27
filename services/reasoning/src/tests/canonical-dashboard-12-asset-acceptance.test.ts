import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import type { RedisClientType } from 'redis';
import {
  CANONICAL_DASHBOARD_DISPLAY_VERSION,
  CANONICAL_DASHBOARD_POLICY_VERSION,
  CANONICAL_DASHBOARD_PROJECTION_VERSION,
  CANONICAL_DASHBOARD_ZONE_RULE_VERSION,
  type CanonicalDashboardProjection
} from '@elceo/chart-intelligence';
import { validateMarketCognitionSnapshot } from '@elceo/schemas';
import {
  LAUNCH_ASSET_SYMBOLS,
  cognitionAssetForCanonicalDashboardAsset,
  type CanonicalAssetSymbol,
  type MarketCognitionSnapshot,
  type TradingAssetCoverage
} from '@elceo/types';
import { mapCandleToCanonical } from '../../../ingestion/src/bridges/shared.js';
import { SqlIngestionEventSnapshotRepository } from '../../../ingestion/src/persistence/sql-ingestion-repository.js';
import {
  CanonicalDashboardProjectionMaterializationService,
  FencedMaterializationRepository,
  PersistedCanonicalCandleObservationReader,
  RedisAdaptiveOwnershipStore,
  SqlImmutableMaterializationStore,
  buildArtifactIntegrityHash,
  buildCanonicalPayloadHash,
  buildDashboardProjectionArtifactIdentity,
  buildDashboardProjectionCoordinationHash,
  buildMaterializationScopeHash,
  createProductionCanonicalDashboardProjectionReader,
  type CanonicalArtifact,
  type DashboardProjectionArtifact,
  type EvidenceOrCognitionArtifact
} from '../adaptive-materialization/index.js';

type Row = { artifact_json: string; count?: string; identity?: string; [key: string]: unknown };
type Pool = { query(sql: string, params?: unknown[]): Promise<{ rows: Row[] }> };
type CognitionArtifact = EvidenceOrCognitionArtifact<MarketCognitionSnapshot> & { kind: 'cognition' };
type RuntimeCounters = { providerExecutions: number; schedulerExecutions: number; cognitionComputations: number };
type CandleMembership = Array<[observationId: string, contentHash: string]>;

const versions = {
  projectionVersion: CANONICAL_DASHBOARD_PROJECTION_VERSION,
  displayVersion: CANONICAL_DASHBOARD_DISPLAY_VERSION,
  zoneRuleVersion: CANONICAL_DASHBOARD_ZONE_RULE_VERSION,
  productPolicyVersion: CANONICAL_DASHBOARD_POLICY_VERSION
};
const scope = (asset: CanonicalAssetSymbol) => buildMaterializationScopeHash({ asset, horizon: 'intraday', kind: 'dashboard_projection', timeframe: 'H4', ...versions });
const coordination = (asset: CanonicalAssetSymbol) => buildDashboardProjectionCoordinationHash({ asset, horizon: 'intraday', timeframe: 'H4', ...versions });
const delta = (after: number, before: number) => after - before;

function cognitionFixture(template: MarketCognitionSnapshot, asset: TradingAssetCoverage, generatedAt: string): MarketCognitionSnapshot {
  const payload = structuredClone(template);
  payload.asset = asset;
  payload.generatedAt = generatedAt;
  payload.snapshotId = `dashboard-closure:${asset}:${randomUUID()}`;
  payload.signals = payload.signals.map((signal, index) => ({ ...signal, asset, generatedAt, signalId: `dashboard-closure:${asset}:signal:${index}` }));
  payload.confidence = { ...payload.confidence, asset, generatedAt };
  payload.contradictions = payload.contradictions.map((flag, index) => ({ ...flag, asset, generatedAt, flagId: `dashboard-closure:${asset}:contradiction:${index}` }));
  payload.narrative = { ...payload.narrative, asset, generatedAt, summaryId: `dashboard-closure:${asset}:narrative` };
  const validation = validateMarketCognitionSnapshot(payload);
  assert.equal(validation.ok, true, validation.ok ? undefined : validation.errors.join('; '));
  return payload;
}

function withIntegrity<T extends CanonicalArtifact<unknown>>(artifact: T): T {
  const { integrityHash: _integrity, ...body } = artifact;
  void _integrity;
  return { ...body, integrityHash: buildArtifactIntegrityHash(body) } as T;
}

async function redisSnapshot(client: RedisClientType, namespace: string) {
  const keys = (await client.keys(`${namespace}:*`)).sort();
  const values: Array<[string, unknown]> = [];
  for (const key of keys) {
    const kind = await client.type(key);
    values.push([key, kind === 'string' ? await client.get(key) : kind === 'hash' ? await client.hGetAll(key) : kind]);
  }
  return { keys, values };
}

async function identities(pool: Pool, kind: 'cognition' | 'dashboard_projection') {
  return (await pool.query('SELECT identity FROM app_canonical_materializations WHERE kind=$1 ORDER BY identity', [kind])).rows.map((row) => String(row.identity));
}

/** Acceptance-only fixture chain: typed ingestion -> persisted cognition -> D1-A/D1-B producer -> D1-C reader. */
export async function runCanonicalDashboard12AssetAcceptance(input: {
  client: RedisClientType;
  sqlPool: Pool;
  namespace: string;
  template: CognitionArtifact;
  runtimeCounters: () => RuntimeCounters;
}) {
  if (process.env.CANONICAL_DASHBOARD_12_ASSET_ACCEPTANCE !== '1') return;
  const ownership = new RedisAdaptiveOwnershipStore(input.client, input.namespace);
  const immutable = new SqlImmutableMaterializationStore(input.sqlPool);
  const repository = new FencedMaterializationRepository(ownership, immutable);
  const candleRepository = new SqlIngestionEventSnapshotRepository(async <T extends Record<string, unknown>>(query: string, params: unknown[] = []) =>
    (await input.sqlPool.query(query, params)).rows as unknown as T[]);
  let projectionCandleLoads = 0;
  const persistedCandles = new PersistedCanonicalCandleObservationReader({
    async getLatestEventsForAssetTimeframe(asset, timeframe) {
      projectionCandleLoads++;
      return candleRepository.getLatestEventsForAssetTimeframe(asset, timeframe);
    }
  });
  const producer = new CanonicalDashboardProjectionMaterializationService(repository, ownership, persistedCandles);
  const artifacts = new Map<CanonicalAssetSymbol, DashboardProjectionArtifact<CanonicalDashboardProjection>>();
  const parents = new Map<CanonicalAssetSymbol, CognitionArtifact>();
  const memberships = new Map<CanonicalAssetSymbol, CandleMembership>();
  const baseTime = Date.parse(input.template.evaluatedAt) - 48 * 60 * 60 * 1000;
  let persistenceSequence = Date.now();

  const saveCandleRun = async (asset: CanonicalAssetSymbol, assetCoverage: TradingAssetCoverage, events: ReturnType<typeof mapCandleToCanonical>[]) => {
    const runId = `dashboard-closure-${assetCoverage}-${randomUUID()}`;
    const persistedAt = new Date(persistenceSequence++).toISOString();
    await input.sqlPool.query(`INSERT INTO app_ingestion_runs(run_id,asset,timeframe,mode,active_boundary,status,started_at,ended_at,duration_ms,canonical_event_count,legacy_event_count,output_event_count,fallback_applied,fallback_reason,boundary_version,trigger_kind,request_key,comparison_json,diagnostics_summary_json,provider_capabilities_json,created_at) VALUES($1,$2,'H4','canonical','canonical','success',$3,$3,0,$4,NULL,$4,false,NULL,'dashboard-closure-v1','manual',$1,NULL,'{}','[]',$3)`, [runId, asset, persistedAt, events.length]);
    await candleRepository.saveEventSnapshots(runId, asset, 'H4', events);
    return runId;
  };

  for (const [assetIndex, asset] of LAUNCH_ASSET_SYMBOLS.entries()) {
    const assetCoverage = cognitionAssetForCanonicalDashboardAsset(asset);
    const evaluatedAt = new Date(baseTime + 40 * 60 * 60 * 1000 + assetIndex).toISOString();
    const payload = cognitionFixture(input.template.payload, assetCoverage, evaluatedAt);
    const { integrityHash: _templateIntegrity, ...templateBody } = input.template;
    void _templateIntegrity;
    const parentBody = {
      ...templateBody,
      identity: `cognition:dashboard-closure:${assetCoverage}:${randomUUID()}`,
      payload,
      evaluatedAt,
      generatedAt: evaluatedAt,
      freshUntil: new Date(Date.now() + 3_600_000).toISOString()
    };
    const parent = { ...parentBody, integrityHash: buildArtifactIntegrityHash(parentBody) } as CognitionArtifact;
    await immutable.saveImmutable(parent);
    parents.set(asset, parent);

    const events = Array.from({ length: 4 }, (_, index) => mapCandleToCanonical({
      type: 'market_candle', provider: 'finnhub', assetCode: asset, timeframe: '240',
      open: 100 + assetIndex, high: 104 + assetIndex + index, low: 98 + assetIndex,
      close: 101 + assetIndex + index, volume: 10 + index,
      timestampUtc: new Date(baseTime + index * 4 * 60 * 60 * 1000).toISOString()
    }, asset, 'H4'));
    assert.ok(events.every((event) => event.observation?.observationId && event.observation.contentHash));
    await saveCandleRun(asset, assetCoverage, events);
    const persisted = await candleRepository.getLatestEventsForAssetTimeframe(asset, 'H4');
    const membership = events.map((event) => [event.observation!.observationId, event.observation!.contentHash] as [string, string]);
    assert.deepEqual(persisted.map((event) => event.observation!.observationId).sort(), membership.map(([id]) => id).sort());
    memberships.set(asset, membership);

    const artifact = await producer.materialize({ asset, horizon: 'intraday', timeframe: 'H4', parentCognitionArtifactIdentity: parent.identity, leaseDurationMs: 500, retryMaximumMs: 5000 });
    artifacts.set(asset, artifact);
    assert.equal(artifact.asset, asset);
    assert.equal(artifact.payload.workspace.dashboard.asset_code, asset);
    assert.equal(artifact.horizon, 'intraday');
    assert.equal(artifact.timeframe, 'H4');
    assert.equal(artifact.projectionVersion, versions.projectionVersion);
    assert.equal(artifact.dashboardDisplayContractVersion, versions.displayVersion);
    assert.equal(artifact.chartZoneRuleVersion, versions.zoneRuleVersion);
    assert.equal(artifact.dashboardProductPolicyVersion, versions.productPolicyVersion);
    assert.equal(artifact.parentCognitionArtifactIdentity, parent.identity);
    assert.equal(artifact.parentCognitionIntegrityHash, parent.integrityHash);
    assert.equal(artifact.parentCognitionContentIdentity, buildCanonicalPayloadHash(parent.payload));
    assert.deepEqual(artifact.orderedCandleObservationIds, membership.map(([id]) => id));
    assert.deepEqual(artifact.orderedCandleContentHashes, membership.map(([, hash]) => hash));
    assert.equal(artifact.scopeHash, scope(asset));
    assert.equal(artifact.identity, buildDashboardProjectionArtifactIdentity({ projectionIdentity: artifact.projectionIdentity, schemaVersion: artifact.schemaVersion, parentCognitionArtifactIdentity: artifact.parentCognitionArtifactIdentity, parentCognitionIntegrityHash: artifact.parentCognitionIntegrityHash, orderedCandleObservationIds: artifact.orderedCandleObservationIds, orderedCandleContentHashes: artifact.orderedCandleContentHashes, freshnessPolicyVersion: artifact.freshnessPolicyVersion }), `${asset} reconstructed identity`);
    assert.deepEqual(await immutable.getImmutable(artifact.identity), artifact);
    assert.equal(await ownership.readCurrentIdentity(coordination(asset), scope(asset)), artifact.identity, `${asset} pointer`);
  }

  const passive = createProductionCanonicalDashboardProjectionReader({ redisClient: input.client, sqlPool: input.sqlPool, cacheLimits: { maxEntries: 12, maxSerializedBytes: 4_000_000 }, namespace: input.namespace });
  for (const asset of LAUNCH_ASSET_SYMBOLS) {
    const result = await passive.read(asset, 'intraday', 'H4');
    const expected = artifacts.get(asset)!;
    assert.equal(result.state, 'available');
    assert.equal(result.artifact?.identity, expected.identity, `${asset} initial passive identity`);
    assert.deepEqual(result.artifact?.payload, expected.payload);
  }

  const a = 'XAU/USD' as const;
  const b = 'BTC/USD' as const;
  const contaminationResults: Record<string, string> = {};
  await assert.rejects(() => producer.materialize({ asset: a, horizon: 'intraday', timeframe: 'H4', parentCognitionArtifactIdentity: parents.get(b)!.identity, leaseDurationMs: 500, retryMaximumMs: 5000 }), /dashboard_projection_parent_scope_mismatch/);
  contaminationResults.cognitionParent = 'producer rejected dashboard_projection_parent_scope_mismatch';
  const wrongCandles = new CanonicalDashboardProjectionMaterializationService(repository, ownership, new PersistedCanonicalCandleObservationReader({ getLatestEventsForAssetTimeframe: () => candleRepository.getLatestEventsForAssetTimeframe(b, 'H4') }));
  await assert.rejects(() => wrongCandles.materialize({ asset: a, horizon: 'intraday', timeframe: 'H4', parentCognitionArtifactIdentity: parents.get(a)!.identity, leaseDurationMs: 500, retryMaximumMs: 5000 }), /canonical candle scope mismatch/);
  contaminationResults.candleMembership = 'producer rejected canonical candle scope mismatch';

  const testPassiveRejection = async (name: string, artifact: DashboardProjectionArtifact<CanonicalDashboardProjection>, targetCoordination: CanonicalAssetSymbol, intendedAsset: CanonicalAssetSymbol) => {
    const namespace = `${input.namespace}:contamination:${name}:${randomUUID()}`;
    const localOwnership = new RedisAdaptiveOwnershipStore(input.client, namespace);
    await immutable.saveImmutable(artifact);
    const acquired = await localOwnership.acquireMaterialization(coordination(targetCoordination), `contamination:${name}:${randomUUID()}`, randomUUID(), 10_000);
    assert.ok(acquired.acquired);
    if (!acquired.acquired) throw new Error('contamination lease unavailable');
    assert.equal(await localOwnership.publishCurrent(acquired.lease, scope(intendedAsset), artifact.identity), true);
    await localOwnership.release(acquired.lease);
    const before = { counters: input.runtimeCounters(), ingestion: (await input.sqlPool.query('SELECT count(*)::text AS count FROM app_ingestion_runs')).rows[0]!.count, materializations: await identities(input.sqlPool, 'dashboard_projection'), redis: await redisSnapshot(input.client, namespace), projectionCandleLoads };
    const reader = createProductionCanonicalDashboardProjectionReader({ redisClient: input.client, sqlPool: input.sqlPool, cacheLimits: { maxEntries: 2, maxSerializedBytes: 1_000_000 }, namespace });
    const result = await reader.read(intendedAsset, 'intraday', 'H4');
    const after = { counters: input.runtimeCounters(), ingestion: (await input.sqlPool.query('SELECT count(*)::text AS count FROM app_ingestion_runs')).rows[0]!.count, materializations: await identities(input.sqlPool, 'dashboard_projection'), redis: await redisSnapshot(input.client, namespace), projectionCandleLoads };
    assert.equal(result.state, 'unavailable');
    assert.deepEqual(after, before, `${name} passive rejection must not repair or produce`);
    contaminationResults[name] = result.state;
  };

  const artifactA = artifacts.get(a)!;
  const artifactB = artifacts.get(b)!;
  await testPassiveRejection('pointerAtoArtifactB', artifactB, a, a);
  const cognitionLineage = withIntegrity({ ...artifactA, identity: `dashboard-projection:invalid-cognition-lineage:${randomUUID()}`, parentCognitionArtifactIdentity: artifactB.parentCognitionArtifactIdentity, parentCognitionIntegrityHash: artifactB.parentCognitionIntegrityHash });
  await testPassiveRejection('artifactAwithCognitionB', cognitionLineage, a, a);
  const candleLineageBody = { ...artifactA, orderedCandleObservationIds: artifactB.orderedCandleObservationIds, orderedCandleContentHashes: artifactB.orderedCandleContentHashes };
  const candleLineage = withIntegrity({ ...candleLineageBody, identity: buildDashboardProjectionArtifactIdentity(candleLineageBody) });
  await testPassiveRejection('artifactAwithCandlesB', candleLineage, a, a);
  await testPassiveRejection('wrongScope', withIntegrity({ ...artifactA, identity: `dashboard-projection:wrong-scope:${randomUUID()}`, scopeHash: scope(b) }), a, a);
  await testPassiveRejection('wrongCoordination', artifactA, b, a);
  const semanticCrossAsset = withIntegrity({ ...artifactB });
  await testPassiveRejection('validIntegrityCrossAsset', semanticCrossAsset, a, a);

  const before = {
    counters: input.runtimeCounters(),
    ingestionRuns: Number((await input.sqlPool.query('SELECT count(*)::text AS count FROM app_ingestion_runs')).rows[0]!.count),
    cognitionIdentities: await identities(input.sqlPool, 'cognition'),
    projectionIdentities: await identities(input.sqlPool, 'dashboard_projection'),
    materializationRows: Number((await input.sqlPool.query('SELECT count(*)::text AS count FROM app_canonical_materializations')).rows[0]!.count),
    redis: await redisSnapshot(input.client, input.namespace),
    projectionCandleLoads
  };
  const reads = [];
  for (let cycle = 0; cycle < 100; cycle++) for (const asset of LAUNCH_ASSET_SYMBOLS) reads.push(passive.read(asset, 'intraday', 'H4'));
  const results = await Promise.all(reads);
  assert.equal(results.length, 1200);
  for (let index = 0; index < results.length; index++) assert.equal(results[index]!.artifact?.identity, artifacts.get(LAUNCH_ASSET_SYMBOLS[index % LAUNCH_ASSET_SYMBOLS.length]!)!.identity);
  const after = {
    counters: input.runtimeCounters(),
    ingestionRuns: Number((await input.sqlPool.query('SELECT count(*)::text AS count FROM app_ingestion_runs')).rows[0]!.count),
    cognitionIdentities: await identities(input.sqlPool, 'cognition'),
    projectionIdentities: await identities(input.sqlPool, 'dashboard_projection'),
    materializationRows: Number((await input.sqlPool.query('SELECT count(*)::text AS count FROM app_canonical_materializations')).rows[0]!.count),
    redis: await redisSnapshot(input.client, input.namespace),
    projectionCandleLoads
  };
  assert.deepEqual(after, before);
  assert.equal(passive.metrics.postgresReads, 12);
  assert.equal(passive.metrics.cacheEntries, 12);
  assert.equal(passive.metrics.evictions, 0);
  assert.ok(passive.metrics.cacheBytes <= 4_000_000);
  const passiveReadMetrics = { l1Entries: passive.metrics.cacheEntries, l1Bytes: passive.metrics.cacheBytes, evictions: passive.metrics.evictions, postgresReaderLoads: passive.metrics.postgresReads };

  const p1 = artifacts.get(a)!;
  assert.equal((await passive.read(a, 'intraday', 'H4')).artifact?.identity, p1.identity);
  const pointerBefore = await ownership.readCurrentIdentity(coordination(a), scope(a));
  const transitionObservation = mapCandleToCanonical({
    type: 'market_candle', provider: 'finnhub', assetCode: a, timeframe: '240',
    open: 104, high: 112, low: 102, close: 110, volume: 19,
    timestampUtc: new Date(baseTime + 16 * 60 * 60 * 1000).toISOString()
  }, a, 'H4');
  const transitionEvents = [
    ...(await candleRepository.getLatestEventsForAssetTimeframe(a, 'H4')),
    transitionObservation
  ];
  await saveCandleRun(a, cognitionAssetForCanonicalDashboardAsset(a), transitionEvents);
  const transitionMembership = transitionEvents.map((event) => event.observation!).sort((left, right) => Date.parse(left.observedAt) - Date.parse(right.observedAt) || left.observationId.localeCompare(right.observationId)).map((observation) => [observation.observationId, observation.contentHash] as [string, string]);
  const producerLoadsBeforeP2 = projectionCandleLoads;
  const p2 = await producer.materialize({ asset: a, horizon: 'intraday', timeframe: 'H4', parentCognitionArtifactIdentity: parents.get(a)!.identity, leaseDurationMs: 500, retryMaximumMs: 5000 });
  assert.equal(projectionCandleLoads - producerLoadsBeforeP2, 1);
  assert.notEqual(p1.identity, p2.identity);
  assert.notEqual(p1.projectionIdentity, p2.projectionIdentity);
  assert.notDeepEqual(p1.orderedCandleObservationIds, p2.orderedCandleObservationIds);
  assert.notDeepEqual(p1.orderedCandleContentHashes, p2.orderedCandleContentHashes);
  assert.deepEqual(p2.orderedCandleObservationIds, transitionMembership.map(([id]) => id));
  assert.deepEqual(p2.orderedCandleContentHashes, transitionMembership.map(([, hash]) => hash));
  assert.equal(p2.parentCognitionArtifactIdentity, parents.get(a)!.identity);
  const pointerAfter = await ownership.readCurrentIdentity(coordination(a), scope(a));
  assert.equal(pointerBefore, p1.identity, 'transition pointer before');
  assert.equal(pointerAfter, p2.identity, 'transition pointer after');
  const sameReader = await passive.read(a, 'intraday', 'H4');
  assert.equal(sameReader.artifact?.identity, p2.identity);
  assert.deepEqual(sameReader.artifact?.payload, p2.payload);

  const measuredDeltas = {
    providerExecutions: delta(after.counters.providerExecutions, before.counters.providerExecutions),
    schedulerExecutions: delta(after.counters.schedulerExecutions, before.counters.schedulerExecutions),
    cognitionComputations: delta(after.counters.cognitionComputations, before.counters.cognitionComputations),
    ingestionRuns: delta(after.ingestionRuns, before.ingestionRuns),
    cognitionMaterializations: after.cognitionIdentities.length - before.cognitionIdentities.length,
    projectionComputations: delta(after.projectionCandleLoads, before.projectionCandleLoads),
    projectionMaterializations: after.projectionIdentities.length - before.projectionIdentities.length,
    canonicalMaterializationRows: delta(after.materializationRows, before.materializationRows),
    redisNamespaceChanged: JSON.stringify(after.redis) === JSON.stringify(before.redis) ? 0 : 1
  };
  assert.ok(Object.values(measuredDeltas).every((value) => value === 0));
  console.log(JSON.stringify({
    acceptance: 'canonical-dashboard-12-asset-end-to-end', productionAcceptance: false,
    assets: [...artifacts].map(([asset, artifact]) => ({ asset, cognition: parents.get(asset)!.identity, candles: memberships.get(asset), projection: artifact.projectionIdentity, artifact: artifact.identity, pointer: artifact.identity, passive: artifact.identity, status: 'PASS' })),
    contamination: contaminationResults,
    transition: { asset: a, p1: { identity: p1.identity, projection: p1.projectionIdentity, candles: memberships.get(a), pointer: pointerBefore }, newObservation: [transitionObservation.observation!.observationId, transitionObservation.observation!.contentHash], p2: { identity: p2.identity, projection: p2.projectionIdentity, candles: transitionMembership, pointer: pointerAfter }, sameReader: sameReader.artifact?.identity, status: 'PASS' },
    passiveEconomics: { reads: results.length, readsPerAsset: results.length / LAUNCH_ASSET_SYMBOLS.length, measuredDeltas, providerGateEvidence: 'provider execution is the sole authoritative gate-execution observable in this integration harness; not independently aliased', providerCacheSingleFlight: 'not independently instrumented; structurally unreachable from passive consumer', ...passiveReadMetrics }
  }));
}
