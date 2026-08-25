import { buildCanonicalCandleContentHash, buildCanonicalCandleObservationId, extractCanonicalCandleObservations, getCanonicalCandleObservation, validateCanonicalEvent, validateCanonicalMarketCandleObservation } from '@elceo/schemas';
import { LAUNCH_ASSET_SYMBOLS, type CanonicalAssetSymbol, type CanonicalEvent, type Timeframe } from '@elceo/types';
import { mapCandleToCanonical } from '../bridges/shared';
import { MemoryIngestionEventSnapshotRepository } from '../persistence/memory-ingestion-repository';

function assert(condition: boolean, message: string): asserts condition { if (!condition) throw new Error(`Assertion failed: ${message}`); }
function candle(asset: string, timeframe = '60', provider: 'finnhub' | 'fmp' = 'finnhub') {
  return { type: 'market_candle' as const, provider, assetCode: asset, timeframe, open: 100, high: 110, low: 90, close: 105, volume: 12, timestampUtc: '2026-01-01T00:00:00.000Z' };
}
function mustReject(run: () => unknown, message: string): void { try { run(); } catch { return; } throw new Error(`Assertion failed: ${message}`); }
async function mustRejectAsync(run: () => Promise<unknown>, message: string): Promise<void> { try { await run(); } catch { return; } throw new Error(`Assertion failed: ${message}`); }

export async function runCanonicalCandleObservationTests(): Promise<void> {
  for (const asset of LAUNCH_ASSET_SYMBOLS) {
    const event = mapCandleToCanonical(candle(asset), asset, 'H1');
    assert(event.observation?.asset === asset, `typed mapping must preserve ${asset}`);
    assert(validateCanonicalEvent(event).ok, `${asset} candle event must validate`);
  }

  const first = mapCandleToCanonical(candle('XAU/USD'), 'XAU/USD', 'H1');
  const repeated = mapCandleToCanonical(candle('XAU/USD'), 'XAU/USD', 'H1');
  assert(first.observation?.observationId === repeated.observation?.observationId, 'same candle must have stable identity');
  assert(first.observation?.contentHash === repeated.observation?.contentHash, 'same candle must have stable content hash');

  const revised = mapCandleToCanonical({ ...candle('XAU/USD'), close: 106 }, 'XAU/USD', 'H1');
  assert(first.observation?.observationId === revised.observation?.observationId, 'revision must retain semantic slot');
  assert(first.observation?.contentHash !== revised.observation?.contentHash, 'revision must change content hash');
  const otherAsset = mapCandleToCanonical(candle('BTC/USD'), 'BTC/USD', 'H1');
  const otherTimeframe = mapCandleToCanonical(candle('XAU/USD', '240'), 'XAU/USD', 'H4');
  const otherProvider = mapCandleToCanonical(candle('XAU/USD', '60', 'fmp'), 'XAU/USD', 'H1');
  assert(new Set([first.id, otherAsset.id, otherTimeframe.id, otherProvider.id]).size === 4, 'asset/timeframe/provider identities must not collide');
  assert(first.id === first.observation?.observationId && first.dedupeKey === first.id, 'event identity must use candle identity');
  const observation = first.observation!;
  assert(buildCanonicalCandleObservationId(observation) === observation.observationId, 'identity authority must reproduce ID');
  assert(buildCanonicalCandleContentHash(observation) === observation.contentHash, 'identity authority must reproduce content hash');
  assert(observation.observationId === 'market_candle:0d9cbc4919f382bc2673d539b862238651c4db84f7980b0f5b086bd37573702f', 'identity must match SHA-256 known vector');
  assert(observation.contentHash === 'sha256:8d0bb63c37ee67f92c0adbbc058929249bdf0ff2c8864f7046eeddc5f83ab9dd', 'content must match SHA-256 known vector');
  for (const tampered of [
    { ...observation, close: 104 }, { ...observation, volume: 13 },
    { ...observation, provider: 'fmp' }, { ...observation, asset: 'BTC/USD' },
    { ...observation, timeframe: 'H4' }, { ...observation, observedAt: '2026-01-01T01:00:00.000Z' },
    { ...observation, observationId: 'arbitrary' }, { ...observation, contentHash: 'arbitrary' }
  ]) assert(!validateCanonicalMarketCandleObservation(tampered).ok, 'tampered identity/content must reject');
  assert(getCanonicalCandleObservation({ ...first, attribution: { ...first.attribution, provider: 'fmp' } }) === null, 'provider envelope mismatch must reject');
  assert(getCanonicalCandleObservation({ ...first, id: 'arbitrary', dedupeKey: 'arbitrary' }) === null, 'event identity envelope mismatch must reject');

  mustReject(() => mapCandleToCanonical({ ...candle('XAU/USD'), high: 80 }, 'XAU/USD', 'H1'), 'invalid geometry must reject');
  mustReject(() => mapCandleToCanonical({ ...candle('XAU/USD'), open: Number.NaN }, 'XAU/USD', 'H1'), 'NaN must reject');
  mustReject(() => mapCandleToCanonical({ ...candle('XAU/USD'), close: Number.POSITIVE_INFINITY }, 'XAU/USD', 'H1'), 'Infinity must reject');
  mustReject(() => mapCandleToCanonical({ ...candle('XAU/USD'), volume: -1 }, 'XAU/USD', 'H1'), 'negative volume must reject');
  mustReject(() => mapCandleToCanonical(candle('XAU/USD', '1hour'), 'XAU/USD', 'H1'), 'unsupported timeframe must reject');
  mustReject(() => mapCandleToCanonical(candle('BTC/USD'), 'XAU/USD', 'H1'), 'asset mismatch must reject');

  const { observation: _typedTruth, ...eventWithoutObservation } = first;
  const legacy: CanonicalEvent = { ...eventWithoutObservation, id: 'legacy', rawPayload: candle('XAU/USD') };
  assert(getCanonicalCandleObservation(legacy) === null, 'rawPayload-only legacy candle is not typed truth');
  mustReject(() => extractCanonicalCandleObservations([legacy]), 'legacy candle candidate must be explicitly rejected');
  mustReject(() => extractCanonicalCandleObservations([first, revised]), 'conflicting revisions must be explicit');

  const later = mapCandleToCanonical({ ...candle('XAU/USD'), timestampUtc: '2026-01-01T01:00:00.000Z' }, 'XAU/USD', 'H1');
  const repository = new MemoryIngestionEventSnapshotRepository();
  await repository.saveEventSnapshots('duplicate-run', 'XAU/USD', 'H1', [first, repeated]);
  assert((await repository.getEventsByRunId('duplicate-run')).length === 1, 'identical slot/content duplicates deterministically collapse');
  await repository.saveEventSnapshots('candle-run', 'XAU/USD', 'H1', [later, first]);
  const reloaded = await repository.getEventsByRunId('candle-run');
  const observations = extractCanonicalCandleObservations(reloaded);
  assert(observations.length === 2, 'run must reload exact candle set');
  assert(observations[0]?.asset === 'XAU/USD' && observations[0]?.timeframe === 'H1', 'run candles retain asset and timeframe');
  assert(observations[0]?.observedAt === '2026-01-01T00:00:00.000Z', 'run candles sort deterministically');
  assert(JSON.stringify(getCanonicalCandleObservation(reloaded[1]!)) === JSON.stringify(first.observation), 'typed observation must roundtrip losslessly');
  await mustRejectAsync(() => repository.saveEventSnapshots('candle-run', 'XAU/USD', 'H1', [first, revised]), 'same-run conflicting revision must reject');
  const afterConflict = await repository.getEventsByRunId('candle-run');
  assert(afterConflict.length === 2, 'conflict rejection must leave prior snapshot intact');
}
