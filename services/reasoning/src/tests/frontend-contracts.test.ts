import assert from 'node:assert/strict';
import { MARKET_REASONING_DIAGNOSTIC_ASSETS, TRADING_ASSET_COVERAGE } from '@elceo/types';
import { validateFrontendAssetDashboardPayload, validateFrontendContractCoverageReport, validateFrontendMarketOverviewPayload, validateFrontendMockPayloadRegistry, validateFrontendReasoningDiagnostic, validateFrontendSupportedAsset } from '@elceo/schemas';
import { getFrontendAssetDashboardPayload, getFrontendContractCoverageReport, getFrontendEvidenceFeedPayload, getFrontendGoldenScenarioPreviewPayload, getFrontendMarketOverviewPayload, getFrontendMockPayloadRegistry, getFrontendProviderReadinessPayload, getFrontendReasoningDiagnostics, getFrontendScheduledIngestionStatusPayload, getFrontendSupportedAssets } from '../frontend-contracts/index';
import { listMarketGoldenScenarios } from '../golden-scenarios/index';

export function runFrontendContractSchemaTests(): void {
  const overview=getFrontendMarketOverviewPayload();
  assert.equal(validateFrontendMarketOverviewPayload(overview).ok,true);
  assert.equal(overview.assets.length,12);
  assert.deepEqual(new Set(overview.assets.map((x)=>x.assetId)), new Set(TRADING_ASSET_COVERAGE));
  assert.equal(overview.assets.some((x)=>['dxy','vix'].includes(String(x.assetId))),false);
  for(const asset of getFrontendSupportedAssets()) assert.equal(validateFrontendSupportedAsset(asset).ok,true);
  assert.equal(validateFrontendSupportedAsset({...getFrontendSupportedAssets()[0],assetId:'dxy'}).ok,false);
  assert.equal(validateFrontendSupportedAsset({...getFrontendSupportedAssets()[0],assetId:'vix'}).ok,false);
  for(const a of getFrontendSupportedAssets().map(x=>x.assetId)){ const d=getFrontendAssetDashboardPayload(a); assert.equal(validateFrontendAssetDashboardPayload(d).ok,true); assert.equal(/\bbuy\b|\bsell\b|\bhold\b|guaranteed\s+profit/i.test(JSON.stringify(d)),false); }
  assert.equal(validateFrontendAssetDashboardPayload({...getFrontendAssetDashboardPayload('eur_usd'),assetId:'dxy'}).ok,false);
  assert.equal(validateFrontendAssetDashboardPayload({...getFrontendAssetDashboardPayload('eur_usd'),assetId:'vix'}).ok,false);
  const diagnostics=getFrontendReasoningDiagnostics();
  assert.equal(diagnostics.length,2);
  assert.deepEqual(diagnostics.map((x)=>x.assetId).sort(), [...MARKET_REASONING_DIAGNOSTIC_ASSETS].sort());
  diagnostics.forEach((x)=>assert.equal(validateFrontendReasoningDiagnostic(x).ok,true));
  assert.equal(validateFrontendReasoningDiagnostic({...diagnostics[0],assetId:'eur_usd'}).ok,false);
  assert.equal(validateFrontendReasoningDiagnostic({...diagnostics[0],tradable:true}).ok,false);
  assert.equal(validateFrontendReasoningDiagnostic({...diagnostics[0],supportRole:'launch_tradable'}).ok,false);
  const coverage=getFrontendContractCoverageReport();
  assert.equal(validateFrontendContractCoverageReport(coverage).ok,true);
  assert.equal(coverage.supportedTradableAssets.length,12);
  assert.equal(coverage.reasoningDiagnosticAssets.length,2);
  assert.equal(coverage.supportedTradableAssets.length+coverage.reasoningDiagnosticAssets.length,14);
  assert.equal(validateFrontendContractCoverageReport({...coverage,supportedTradableAssets:[...coverage.supportedTradableAssets,'dxy']}).ok,false);
  const e=getFrontendEvidenceFeedPayload(); assert.deepEqual(e.items.map(x=>x.evidenceId),[...e.items.map(x=>x.evidenceId)].sort());
  assert.equal(getFrontendProviderReadinessPayload().activationBlocked,true); assert.equal(getFrontendScheduledIngestionStatusPayload().fixtureModeStatus,'fixture_only');
  assert.equal(getFrontendGoldenScenarioPreviewPayload().scenarioCount,listMarketGoldenScenarios().length);
  assert.equal(getFrontendGoldenScenarioPreviewPayload().scenarioCount,33);
  assert.equal(validateFrontendMockPayloadRegistry(getFrontendMockPayloadRegistry()).ok,true);
}
