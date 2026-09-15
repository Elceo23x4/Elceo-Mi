import assert from 'node:assert/strict';
import { validateProviderLiveActivationPolicy, validateProviderLiveReadinessSnapshot, validateProviderLiveReadinessStatus, validateProviderLiveSmokePlan, validateProviderQuotaPolicy } from '@elceo/schemas';
import { buildProviderLiveSmokePlan, evaluateProviderLiveReadiness, getDefaultProviderQuotaPolicies, getProviderLiveActivationPolicy, getProviderLiveReadinessSnapshot } from '../provider-live-readiness/index.js';
import { CanonicalMarketIntelligenceBoundaryService } from '../runtime/canonical-market-intelligence-boundary.js';
import { MemoryMarketEvidenceRegistrySnapshotRepository, MemorySeoContentArchitectureSnapshotRepository } from '../persistence/registry-snapshot-repository.js';

export async function runProviderLiveReadinessTests(){
  const policy = getProviderLiveActivationPolicy('tiingo_market_data','production');
  assert.equal(policy.productionBlockedByDefault,true); assert.ok(validateProviderLiveActivationPolicy(policy).ok);
  const quotas = getDefaultProviderQuotaPolicies(); assert.ok(quotas.every((q)=>validateProviderQuotaPolicy(q).ok));
  const tiingoConfigured = evaluateProviderLiveReadiness('tiingo_market_data','staging',{liveEnabled:true,tiingo:{liveEnabled:true,mode:'live_enabled',apiKey:'fake',baseUrl:'https://api.tiingo.com'}});
  assert.equal(tiingoConfigured.activationStatus,'disabled'); assert.equal(tiingoConfigured.allowLiveFetch,false); assert.ok(tiingoConfigured.reasons.includes('staging_empirical_verification_missing')); assert.ok(validateProviderLiveReadinessStatus(tiingoConfigured).ok);
  assert.equal(getProviderLiveActivationPolicy('tiingo_market_data','staging').allowLiveFetch,false);
  assert.equal(getProviderLiveActivationPolicy('fred','staging').allowLiveFetch,false);
  assert.equal(getProviderLiveActivationPolicy('ecb_public','staging').allowLiveFetch,false);
  assert.equal(getProviderLiveActivationPolicy('us_treasury','staging').allowLiveFetch,false);
  assert.equal(getProviderLiveActivationPolicy('fred','staging').requireApiKey,true);
  assert.equal(getProviderLiveActivationPolicy('ecb_public','staging').requireApiKey,false);
  assert.equal(getProviderLiveActivationPolicy('us_treasury','staging').requireApiKey,false);
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
  const fredExecutableUnverified=evaluateProviderLiveReadiness('fred','staging',{});assert.equal(fredExecutableUnverified.activationStatus,'disabled');assert.ok(fredExecutableUnverified.reasons.includes('staging_empirical_verification_missing'));
  const cftcPolicy=getProviderLiveActivationPolicy('cftc_cot','staging');
  assert.equal(cftcPolicy.liveEnabled,false);assert.equal(cftcPolicy.allowLiveFetch,false);assert.equal(cftcPolicy.requireApiKey,false);assert.match(cftcPolicy.rationale,/Executable adapter exists but staging verification is absent/);
  const cftcExecutableUnverified=evaluateProviderLiveReadiness('cftc_cot','staging',{});
  assert.equal(cftcExecutableUnverified.activationStatus,'disabled');assert.equal(cftcExecutableUnverified.allowLiveFetch,false);assert.equal(cftcExecutableUnverified.hasRequiredSecrets,true);assert.ok(cftcExecutableUnverified.reasons.includes('staging_empirical_verification_missing'));assert.ok(!cftcExecutableUnverified.reasons.includes('no_executable_evidence_route'));assert.ok(validateProviderLiveReadinessStatus(cftcExecutableUnverified).ok);
  const cftcProd=evaluateProviderLiveReadiness('cftc_cot','production',{});assert.equal(cftcProd.activationStatus,'production_blocked');assert.equal(cftcProd.allowLiveFetch,false);assert.ok(cftcProd.reasons.includes('production_blocked_by_default'));
  const leakCheck = JSON.stringify(tiingoConfigured); assert.equal(leakCheck.includes('fake'),false);
  const snap = getProviderLiveReadinessSnapshot('staging',{liveEnabled:true,tiingo:{liveEnabled:true,mode:'live_enabled',apiKey:'fake'}}); assert.ok(validateProviderLiveReadinessSnapshot(snap).ok); assert.equal(snap.providers.length>5,true);
  const planAllowed = buildProviderLiveSmokePlan('tiingo_market_data','staging',{liveEnabled:true,tiingo:{liveEnabled:true,mode:'live_enabled',apiKey:'fake'}}); assert.equal(planAllowed.allowed,false); assert.ok(validateProviderLiveSmokePlan(planAllowed).ok);
  const planBlocked = buildProviderLiveSmokePlan('tiingo_market_data','production',{liveEnabled:true,tiingo:{liveEnabled:true,mode:'live_enabled',apiKey:'fake'}}); assert.equal(planBlocked.allowed,false);
  const boundary = new CanonicalMarketIntelligenceBoundaryService(new MemoryMarketEvidenceRegistrySnapshotRepository(),new MemorySeoContentArchitectureSnapshotRepository());
  assert.equal(boundary.getProviderLiveActivationPolicy('tiingo_market_data','staging').providerId,'tiingo_market_data');
  assert.equal(boundary.buildProviderLiveSmokePlan('tiingo_market_data','production',{liveEnabled:true,tiingo:{liveEnabled:true,mode:'live_enabled',apiKey:'fake'}}).allowed,false);
}
