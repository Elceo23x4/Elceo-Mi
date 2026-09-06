import { validateNormalizedMarketEvidencePayload } from '@elceo/schemas';
import type { ProviderSourceRequest } from '@elceo/types';
import { getProviderDescriptor } from '../provider-sources/provider-capability-registry.js';
import { getTiingoProviderHealth, TiingoMarketDataAdapter } from '../provider-sources/tiingo/index.js';

const req = (overrides: Partial<ProviderSourceRequest> = {}): ProviderSourceRequest => ({
  requestId: 'req-tiingo-1', providerId: 'tiingo_market_data', capability: 'market_price_history', asset: 'eur_usd', region: 'global', evidenceTypeId: 'market_price_history', requestedAt: '2026-01-10T00:00:00.000Z', paramsJson: '{}', ...overrides
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
  if (payloads.some((x) => !x.metadataJson.includes('tiingo_fixture'))) throw new Error('fixture provenance expected');

  const disabledAdapter = new TiingoMarketDataAdapter();
  const disabledFetch = await disabledAdapter.fetch(req());
  if (disabledFetch.errorCode !== 'tiingo_live_disabled') throw new Error('live disabled deterministic failure expected');

  let fetchCalled = false;
  let requestedUrl = '';
  let authorization = '';
  const sentinel = 'PROV_P0_TIINGO_SENTINEL_SECRET';
  const liveAdapter = new TiingoMarketDataAdapter({
    liveEnabled: true,
    mode: 'live_enabled',
    apiKey: sentinel,
    fetchImpl: async (input, init) => {
      fetchCalled = true;
      requestedUrl = String(input);
      authorization = new Headers(init?.headers).get('authorization') ?? '';
      return new Response(JSON.stringify([{ date: '2026-01-01T00:00:00.000Z', open: 1, high: 2, low: 0.5, close: 1.5, volume: null, adjOpen: null, adjHigh: null, adjLow: null, adjClose: null, adjVolume: null, divCash: null, splitFactor: null }]), { status: 200 });
    }
  });
  const liveFetched = await liveAdapter.fetch(req());
  if (!fetchCalled || liveFetched.status !== 'success') throw new Error('live fake fetch should succeed');
  if (liveFetched.sourceUrl?.includes(sentinel) || requestedUrl.includes(sentinel)) throw new Error('tiingo token must not appear in URL provenance');
  if (authorization !== `Token ${sentinel}`) throw new Error('tiingo credential should use authorization header');
  if (!requestedUrl.startsWith('https://api.tiingo.com/tiingo/fx/eurusd/prices?') || !requestedUrl.includes('resampleFreq=1day')) throw new Error(`EUR/USD FX route expected: ${requestedUrl}`);
  const livePayloads = await liveAdapter.normalize(liveFetched);
  if (livePayloads.some((x) => x.metadataJson.includes('fixture')) || livePayloads.some((x) => !x.metadataJson.includes('tiingo_live_staging'))) throw new Error('live provenance must be truthful');

  for (const asset of ['gbp_usd','usd_jpy','aud_usd','usd_chf','nzd_usd','usd_cad']) {
    let url=''; const adapter=new TiingoMarketDataAdapter({liveEnabled:true,mode:'live_enabled',apiKey:'secret',fetchImpl:async(input)=>{url=String(input);return new Response('[]',{status:200});}});
    const response=await adapter.fetch(req({asset}));
    if(response.status!=='empty'||!url.includes(`/tiingo/fx/${asset.replace('_','')}/prices`))throw new Error(`FX routing failed for ${asset}`);
  }

  let cryptoUrl='';
  const cryptoAdapter=new TiingoMarketDataAdapter({liveEnabled:true,mode:'live_enabled',apiKey:'secret',fetchImpl:async(input)=>{cryptoUrl=String(input);return new Response(JSON.stringify([{ticker:'btcusd',priceData:[{date:'2026-01-01T00:00:00.000Z',open:100,high:110,low:90,close:105}]}]),{status:200});}});
  const crypto=await cryptoAdapter.fetch(req({asset:'btc_usd',paramsJson:JSON.stringify({startDate:'2026-01-01',endDate:'2026-01-02',frequency:'hourly'})}));
  if(crypto.status!=='success'||!cryptoUrl.includes('/tiingo/crypto/prices?tickers=btcusd')||!cryptoUrl.includes('resampleFreq=1hour'))throw new Error(`crypto route failed: ${cryptoUrl}`);
  if((await cryptoAdapter.normalize(crypto)).length!==1)throw new Error('nested crypto priceData should normalize');

  for (const [asset,code] of [['nasdaq_100','tiingo_live_unsupported_index_proxy_nasdaq_100'],['sp500','tiingo_live_unsupported_index_proxy_sp500'],['de30','tiingo_live_unsupported_unverified_de30'],['xau_usd','tiingo_live_unsupported_unverified_xau_usd']] as const) {
    let calls=0;const adapter=new TiingoMarketDataAdapter({liveEnabled:true,mode:'live_enabled',apiKey:'secret',fetchImpl:async()=>{calls++;return new Response('[]');}});const response=await adapter.fetch(req({asset}));
    if(calls!==0||response.errorCode!==code||response.sourceUrl!==null)throw new Error(`${asset} must fail closed before provider execution`);
  }
  const unsupportedFrequency=await liveAdapter.fetch(req({paramsJson:JSON.stringify({frequency:'minute'})}));
  if(unsupportedFrequency.errorCode!=='tiingo_unsupported_frequency')throw new Error('unsupported frequency must fail closed');

  for (const [asset,payload] of [['eur_usd',{}],['eur_usd',[{date:'bad',open:1,high:2,low:0,close:1}]],['btc_usd',[{ticker:'btcusd'}]],['btc_usd',[{ticker:'other',priceData:[]}]],['btc_usd',[{ticker:'btcusd',priceData:[{date:'2026-01-01',open:1,high:0,low:2,close:1}]}]]] as const) {
    const adapter=new TiingoMarketDataAdapter({liveEnabled:true,mode:'live_enabled',apiKey:sentinel,fetchImpl:async()=>new Response(JSON.stringify(payload),{status:200})});const response=await adapter.fetch(req({asset}));
    if(response.errorCode!=='tiingo_malformed_live_payload'||response.errorMessage?.includes(sentinel)||response.sourceUrl?.includes(sentinel)||response.rawPayloadJson?.includes(sentinel))throw new Error(`malformed ${asset} payload must fail closed and redact credentials`);
  }

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
