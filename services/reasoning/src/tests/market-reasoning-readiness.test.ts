import assert from 'node:assert/strict';
import { MARKET_REASONING_DIAGNOSTIC_ASSETS, MARKET_REASONING_MODULE_IDS, TRADING_ASSET_COVERAGE } from '@elceo/types';
import { validateExpectedMarketReasoningModuleReadiness, validateMarketReasoningModuleReadiness, validateMarketReasoningReadinessReport } from '@elceo/schemas';
import { getMarketReasoningReadinessReport, assertMarketReasoningReadinessValid } from '../readiness/index';

function expectInvalid(value: unknown, label: string): void { assert.equal(validateMarketReasoningModuleReadiness(value).ok, false, label); }

export function runMarketReasoningReadinessTests(): void {
  const at = '2026-06-03T00:00:00.000Z';
  const report = getMarketReasoningReadinessReport(at);
  assert.equal(validateMarketReasoningReadinessReport(report).ok, true, 'readiness report validates');
  assert.deepEqual(report.modules.map((m)=>m.moduleId), [...MARKET_REASONING_MODULE_IDS], 'all nine module ids exist exactly once');
  assert(report.modules.every((m)=>m.deterministicFoundationStatus === 'implemented'), 'all deterministic foundations are implemented');
  assert(report.modules.every((m)=>m.liveProviderIntegrationStatus !== 'live_verified'), 'no module claims live verification');
  assert.equal(getMarketReasoningReadinessReport(at).generatedAt, report.generatedAt, 'fixed timestamp is deterministic');
  assert.equal(TRADING_ASSET_COVERAGE.length, 12, 'launch-tradable count remains 12');
  assert.deepEqual([...MARKET_REASONING_DIAGNOSTIC_ASSETS], ['dxy','vix'], 'diagnostic assets remain DXY/VIX');
  assert.doesNotThrow(() => assertMarketReasoningReadinessValid(), 'readiness assertion passes');

  const base = report.modules[0]!;
  expectInvalid({...base,moduleId:'unknown'}, 'unknown module ID rejected');
  expectInvalid(Object.fromEntries(Object.entries(base).filter(([k])=>k!=='liveProviderIntegrationStatus')), 'missing readiness dimension rejected');
  expectInvalid({...base,contractShapeStatus:'bad'}, 'invalid contract status rejected');
  expectInvalid({...base,deterministicFoundationStatus:'bad'}, 'invalid deterministic status rejected');
  expectInvalid({...base,liveProviderIntegrationStatus:'bad'}, 'invalid live-provider status rejected');
  expectInvalid({...base,empiricalValidationStatus:'bad'}, 'invalid empirical status rejected');
  expectInvalid({...base,productionCalibrationStatus:'bad'}, 'invalid production status rejected');
  assert.equal(validateMarketReasoningReadinessReport({...report,modules:[report.modules[0],...report.modules.slice(0,8)]}).ok,false,'duplicate module rejected');
  assert.equal(validateMarketReasoningReadinessReport({...report,modules:report.modules.slice(1),moduleCount:9}).ok,false,'missing module rejected');
  expectInvalid({...base,contractShapeStatus:'invalid'}, 'invalid contractShapeStatus emitted report rejected');
  expectInvalid({...base,notes:[]}, 'empty notes rejected');
  expectInvalid({...base,notes:['you should buy now']}, 'advice-like notes rejected');
  for (const field of ['pendingPhases','confidenceCalibrationR6','priceReactionR7','providerReliabilityExpansion','goldenScenarioExpansion','empiricalBacktesting','liveProviderActivation','productionDataCalibration','unknownReadinessField']) {
    expectInvalid({...base,[field]:true}, `${field} rejected`);
  }
  assert.equal(validateExpectedMarketReasoningModuleReadiness(base,'asset_direction').ok,false,'wrong embedded module ID rejected');
  assert.equal(validateMarketReasoningReadinessReport({...report,unexpected:true}).ok,false,'unknown aggregate report field rejected');
}
