import assert from 'node:assert/strict';
import { MARKET_REASONING_DIAGNOSTIC_ASSETS, MARKET_REASONING_MODULE_IDS, TRADING_ASSET_COVERAGE } from '@elceo/types';
import { validateMarketReasoningReadinessReport } from '@elceo/schemas';
import { getMarketReasoningReadinessReport, assertMarketReasoningReadinessValid } from '../readiness/index';

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
}
