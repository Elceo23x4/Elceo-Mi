import assert from 'node:assert/strict';
import { validateProviderLiveActivationPolicy, validateProviderLiveReadinessSnapshot, validateProviderLiveReadinessStatus, validateProviderLiveSmokePlan, validateProviderQuotaPolicy } from '@elceo/schemas';
import { buildProviderLiveSmokePlan, evaluateProviderLiveReadiness, getDefaultProviderQuotaPolicies, getProviderLiveActivationPolicy, getProviderLiveReadinessSnapshot } from '../provider-live-readiness/index.js';
import { CanonicalMarketIntelligenceBoundaryService } from '../runtime/canonical-market-intelligence-boundary.js';
import { MemoryMarketEvidenceRegistrySnapshotRepository, MemorySeoContentArchitectureSnapshotRepository } from '../persistence/registry-snapshot-repository.js';

export async function runProviderLiveReadinessTests(){
  const policy = getProviderLiveActivationPolicy('tiingo_market_data','production');
  assert.equal(policy.productionBlockedByDefault,true); assert.ok(validateProviderLiveActivationPolicy(policy).ok);
  const quotas = getDefaultProviderQuotaPolicies(); assert.ok(quotas.every((q)=>validateProviderQuotaPolicy(q).ok));
  const tiingoReady = evaluateProviderLiveReadiness('tiingo_market_data','staging',{liveEnabled:true,tiingo:{liveEnabled:true,mode:'live_enabled',apiKey:'fake',baseUrl:'https://api.tiingo.com'}});
  assert.equal(tiingoReady.activationStatus,'staging_ready'); assert.equal(tiingoReady.allowLiveFetch,true); assert.equal(tiingoReady.reasons.length,0); assert.ok(validateProviderLiveReadinessStatus(tiingoReady).ok);
  for (const baseUrl of ['http://api.tiingo.com','https://example.com']) {
    const invalidOrigin = evaluateProviderLiveReadiness('tiingo_market_data','staging',{liveEnabled:true,tiingo:{liveEnabled:true,mode:'live_enabled',apiKey:'fake',baseUrl}});
    assert.equal(invalidOrigin.allowLiveFetch,false); assert.equal(invalidOrigin.activationStatus,'invalid_config'); assert.ok(invalidOrigin.reasons.includes('tiingo_health_invalid_config')); assert.ok(validateProviderLiveReadinessStatus(invalidOrigin).ok);
  }
  const fixtureMode = evaluateProviderLiveReadiness('tiingo_market_data','staging',{liveEnabled:true,tiingo:{liveEnabled:true,mode:'fixture',apiKey:'fake'}});
  assert.equal(fixtureMode.allowLiveFetch,false); assert.equal(fixtureMode.activationStatus,'disabled'); assert.ok(fixtureMode.reasons.includes('tiingo_adapter_live_state_inconsistent'));
  const liveDisabled = evaluateProviderLiveReadiness('tiingo_market_data','staging',{liveEnabled:true,tiingo:{liveEnabled:true,mode:'live_disabled',apiKey:'fake'}});
  assert.equal(liveDisabled.allowLiveFetch,false); assert.equal(liveDisabled.activationStatus,'disabled');
  const missingKey = evaluateProviderLiveReadiness('tiingo_market_data','staging',{liveEnabled:true,tiingo:{liveEnabled:true,mode:'live_enabled'}});
  assert.equal(missingKey.allowLiveFetch,false); assert.equal(missingKey.activationStatus,'disabled'); assert.ok(missingKey.reasons.includes('missing_required_secret'));
  const missingOuterIntent = evaluateProviderLiveReadiness('tiingo_market_data','staging',{tiingo:{liveEnabled:true,mode:'live_enabled',apiKey:'fake'}});
  assert.equal(missingOuterIntent.allowLiveFetch,false); assert.equal(missingOuterIntent.activationStatus,'disabled');
  const tiingoProd = evaluateProviderLiveReadiness('tiingo_market_data','production',{liveEnabled:true,tiingo:{liveEnabled:true,mode:'live_enabled',apiKey:'fake'}});
  assert.equal(tiingoProd.activationStatus,'production_blocked');
  const fixtureOnly = evaluateProviderLiveReadiness('fred','staging',{}); assert.ok(fixtureOnly.activationStatus==='fixture_only' || fixtureOnly.activationStatus==='disabled');
  const leakCheck = JSON.stringify(tiingoReady); assert.equal(leakCheck.includes('fake'),false);
  const snap = getProviderLiveReadinessSnapshot('staging',{liveEnabled:true,tiingo:{liveEnabled:true,mode:'live_enabled',apiKey:'fake'}}); assert.ok(validateProviderLiveReadinessSnapshot(snap).ok); assert.equal(snap.providers.length>5,true);
  const planAllowed = buildProviderLiveSmokePlan('tiingo_market_data','staging',{liveEnabled:true,tiingo:{liveEnabled:true,mode:'live_enabled',apiKey:'fake'}}); assert.equal(planAllowed.allowed,false); assert.ok(planAllowed.warnings.includes('provider_api_gate_execution_context_not_ready_prov_p1b')); assert.ok(validateProviderLiveSmokePlan(planAllowed).ok);
  const planBlocked = buildProviderLiveSmokePlan('tiingo_market_data','production',{liveEnabled:true,tiingo:{liveEnabled:true,mode:'live_enabled',apiKey:'fake'}}); assert.equal(planBlocked.allowed,false);
  const boundary = new CanonicalMarketIntelligenceBoundaryService(new MemoryMarketEvidenceRegistrySnapshotRepository(),new MemorySeoContentArchitectureSnapshotRepository());
  assert.equal(boundary.getProviderLiveActivationPolicy('tiingo_market_data','staging').providerId,'tiingo_market_data');
  assert.equal(boundary.buildProviderLiveSmokePlan('tiingo_market_data','production',{liveEnabled:true,tiingo:{liveEnabled:true,mode:'live_enabled',apiKey:'fake'}}).allowed,false);
}
