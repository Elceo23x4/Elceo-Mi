import { validateNormalizedMarketEvidencePayload } from '@elceo/schemas';
import type { ProviderSourceRequest } from '@elceo/types';
import { getProviderDescriptor } from '../provider-sources/provider-capability-registry.js';
import { getTiingoProviderHealth, TiingoMarketDataAdapter } from '../provider-sources/tiingo/index.js';

const req = (overrides: Partial<ProviderSourceRequest> = {}): ProviderSourceRequest => ({
  requestId: 'req-tiingo-1', providerId: 'tiingo_market_data', capability: 'market_price_history', asset: 'xau_usd', region: 'global', evidenceTypeId: 'market_price_history', requestedAt: '2026-01-10T00:00:00.000Z', paramsJson: '{}', ...overrides
});

export async function runTiingoAdapterTests(): Promise<void> {
  const fixtureAdapter = new TiingoMarketDataAdapter({ mode: 'fixture' });
  const descriptor = getProviderDescriptor('tiingo_market_data');
  if (!descriptor || fixtureAdapter.descriptor.providerId !== descriptor.providerId) throw new Error('tiingo descriptor mismatch');

  const defaultHealth = getTiingoProviderHealth();
  if (defaultHealth.liveEnabled || defaultHealth.mode !== 'live_disabled' || defaultHealth.capabilityStatus !== 'disabled') throw new Error('default tiingo config should be live disabled');

  const missingKeyHealth = getTiingoProviderHealth({ liveEnabled: true, mode: 'live_enabled' });
  if (missingKeyHealth.capabilityStatus !== 'missing_api_key') throw new Error('missing api key status expected');

  const configuredHealth = getTiingoProviderHealth({ liveEnabled: true, mode: 'live_enabled', apiKey: 'fake-key' });
  if (configuredHealth.capabilityStatus !== 'configured' || !configuredHealth.hasApiKey) throw new Error('configured health expected');

  const fetchedFixture = await fixtureAdapter.fetch(req());
  if (fetchedFixture.status !== 'success' || fetchedFixture.rawPayloadJson === null) throw new Error('tiingo fixture fetch failed');

  const payloads = await fixtureAdapter.normalize(fetchedFixture);
  if (payloads.length === 0 || payloads.some((x) => !validateNormalizedMarketEvidencePayload(x).ok)) throw new Error('fixture normalize invalid');

  const disabledAdapter = new TiingoMarketDataAdapter();
  const disabledFetch = await disabledAdapter.fetch(req());
  if (disabledFetch.errorCode !== 'tiingo_live_disabled') throw new Error('live disabled deterministic failure expected');

  let fetchCalled = false;
  const liveAdapter = new TiingoMarketDataAdapter({
    liveEnabled: true,
    mode: 'live_enabled',
    apiKey: 'fake-key',
    fetchImpl: async () => {
      fetchCalled = true;
      return new Response(JSON.stringify([{ date: '2026-01-01T00:00:00.000Z', open: 1, high: 2, low: 0.5, close: 1.5, volume: null, adjOpen: null, adjHigh: null, adjLow: null, adjClose: null, adjVolume: null, divCash: null, splitFactor: null }]), { status: 200 });
    }
  });
  const liveFetched = await liveAdapter.fetch(req());
  if (!fetchCalled || liveFetched.status !== 'success') throw new Error('live fake fetch should succeed');

  const timeoutAdapter = new TiingoMarketDataAdapter({
    liveEnabled: true,
    mode: 'live_enabled',
    apiKey: 'fake-key',
    timeoutMs: 1,
    fetchImpl: async (_input: URL | RequestInfo, init?: RequestInit) => {
      await new Promise((resolve, reject) => {
        const signal = init?.signal;
        if (!signal) return resolve(null);
        signal.addEventListener('abort', () => reject(new DOMException('aborted', 'AbortError')));
      });
      return new Response('[]', { status: 200 });
    }
  });
  const timedOut = await timeoutAdapter.fetch(req());
  if (timedOut.errorCode !== 'tiingo_timeout') throw new Error('timeout should map to deterministic error');
}
