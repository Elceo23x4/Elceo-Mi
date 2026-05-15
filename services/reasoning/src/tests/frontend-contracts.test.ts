import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { getFrontendAssetDashboardPayload, getFrontendEvidenceFeedPayload, getFrontendGoldenScenarioPreviewPayload, getFrontendMarketOverviewPayload, getFrontendMockPayloadRegistry, getFrontendProviderReadinessPayload, getFrontendScheduledIngestionStatusPayload, getFrontendSupportedAssets } from '../frontend-contracts/index';
import { validateFrontendAssetDashboardPayload, validateFrontendMarketOverviewPayload, validateFrontendMockPayloadRegistry } from '@elceo/schemas';

const tier1a=['xau_usd','eur_usd','gbp_usd','usd_jpy','btc_usd','nasdaq_100','sp500','de30','dxy','vix'];
const tier1b=['aud_usd','usd_chf','nzd_usd','usd_cad'];

describe('frontend contracts',()=>{
  it('has all assets and valid overview schema',()=>{ const p=getFrontendMarketOverviewPayload(); assert.equal(validateFrontendMarketOverviewPayload(p).ok,true); for(const a of [...tier1a,...tier1b]) assert.ok(p.assets.some(x=>x.assetId===a)); });
  it('builds dashboard for each asset with safe language',()=>{ for(const a of getFrontendSupportedAssets().map(x=>x.assetId)){ const d=getFrontendAssetDashboardPayload(a); assert.equal(validateFrontendAssetDashboardPayload(d).ok,true); const text=JSON.stringify(d); assert.equal(/\bbuy\b|\bsell\b|\bhold\b|guaranteed\s+profit/i.test(text),false); assert.equal(/token|api[_-]?key|secret|password/i.test(text),false); }});
  it('deterministic ordered evidence',()=>{ const e=getFrontendEvidenceFeedPayload(); const ids=e.items.map(x=>x.evidenceId); assert.deepEqual(ids,[...ids].sort()); });
  it('provider and ingestion are blocked live',()=>{ assert.equal(getFrontendProviderReadinessPayload().activationBlocked,true); assert.equal(getFrontendScheduledIngestionStatusPayload().fixtureModeStatus,'fixture_only'); });
  it('golden preview and registry',()=>{ assert.equal(getFrontendGoldenScenarioPreviewPayload().scenarioCount>0,true); assert.equal(validateFrontendMockPayloadRegistry(getFrontendMockPayloadRegistry()).ok,true); });
});
