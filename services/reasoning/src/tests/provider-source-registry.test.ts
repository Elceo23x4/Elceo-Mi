import assert from 'node:assert/strict';
import { validateProviderSourceRegistrySnapshot } from '@elceo/schemas';
import { buildProviderActivationChecklist, getProviderSourceDescriptor, getProviderSourceRegistrySnapshot, listProviderSourceGaps, listProviderSourcesByFamily, listProviderSourcesForAsset } from '../provider-source-registry/index.js';
import { CanonicalMarketIntelligenceBoundaryService } from '../runtime/canonical-market-intelligence-boundary.js';
import { MemoryMarketEvidenceRegistrySnapshotRepository, MemorySeoContentArchitectureSnapshotRepository } from '../persistence/registry-snapshot-repository.js';

export async function runProviderSourceRegistryTests(){
  const snap = getProviderSourceRegistrySnapshot('2026-01-01T00:00:00.000Z');
  assert.equal(validateProviderSourceRegistrySnapshot(snap).ok, true);
  assert.deepEqual(snap.sources.map((x)=>x.sourceId), [...snap.sources.map((x)=>x.sourceId)].sort());
  assert.equal(new Set(snap.sources.map((x)=>x.family)).size,7);
  ['tiingo_market_data','fred_macro','cftc_cot','marketaux_news','sec_edgar','crypto_onchain_public','credit_stress_source'].forEach((id)=>assert.equal(snap.sources.some((x)=>x.sourceId===id),true));
  assert.equal(snap.launchAssetCoverage.every((x)=>x.sourceIds.length>0),true);
  const forbiddenKeys = new Set(['apiKey','secret','token','password']);
  snap.sources.forEach((x)=>{ assert.notEqual(x.liveActivationMode,'manual_gated'); assert.equal(Object.keys(x).some((k)=>forbiddenKeys.has(k)),false); });
  assert.deepEqual(listProviderSourceGaps(),listProviderSourceGaps());
  assert.deepEqual(buildProviderActivationChecklist('tiingo_market_data'),buildProviderActivationChecklist('tiingo_market_data'));
  assert.equal(listProviderSourcesByFamily('macro_official').length>0,true);
  assert.equal(getProviderSourceDescriptor('tiingo_market_data')?.sourceId,'tiingo_market_data');
  assert.equal(listProviderSourcesForAsset('xau_usd').length>0,true);
  ['aud_usd','usd_chf','nzd_usd','usd_cad'].forEach((asset)=>assert.equal(listProviderSourcesForAsset(asset as any).length>0,true));
  const boundary = new CanonicalMarketIntelligenceBoundaryService(new MemoryMarketEvidenceRegistrySnapshotRepository(),new MemorySeoContentArchitectureSnapshotRepository());
  assert.equal(boundary.getProviderSourceRegistrySnapshot('2026-01-01T00:00:00.000Z').generatedAt,'2026-01-01T00:00:00.000Z');
  assert.equal(boundary.listProviderSourcesByFamily('crypto').length>0,true);
  assert.equal(boundary.listProviderSourcesForAsset('btc_usd').length>0,true);
  assert.equal(boundary.getProviderSourceDescriptor('sec_edgar')?.sourceId,'sec_edgar');
  assert.equal(boundary.listProviderSourceGaps().length>0,true);
  assert.equal(boundary.buildProviderActivationChecklist('sec_edgar')[0]?.order,1);
}
