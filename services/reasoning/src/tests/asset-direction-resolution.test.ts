import { validateMarketAssetDirectionResolutionCoverageReport, validateMarketAssetDirectionResolutionResult, validateMarketAssetDirectionResolutionRuleSetSnapshot } from '@elceo/schemas';
import type { MarketAssetCausalityAsset, ReasoningEvidenceInputItem } from '@elceo/types';
import { buildWeightedEvidenceItem } from '../evidence-weighting/index.js';
import { assertAssetDirectionResolutionRuleSetValid, getAssetDirectionResolutionCoverageReport, getAssetDirectionResolutionRuleSetSnapshot, resolveAssetContextualEvidenceDirection } from '../asset-direction-resolution/index.js';
import { CanonicalMarketIntelligenceBoundaryService } from '../runtime/canonical-market-intelligence-boundary.js';
import { MemoryMarketEvidenceRegistrySnapshotRepository, MemorySeoContentArchitectureSnapshotRepository } from '../persistence/registry-snapshot-repository.js';

function assert(condition: boolean, message: string): void { if (!condition) throw new Error(`Assertion failed: ${message}`); }
function res(asset: MarketAssetCausalityAsset, metadata: Record<string, unknown>, evidenceClass = 'central_bank_policy') { return resolveAssetContextualEvidenceDirection({ asset, evidenceClass, metadataJson: JSON.stringify(metadata), policyIssuerRegion: typeof metadata.policyIssuerRegion === 'string' ? metadata.policyIssuerRegion : null }); }
function item(metadata: Record<string, unknown>, evidenceClass: ReasoningEvidenceInputItem['evidenceClass'] = 'central_bank_policy'): ReasoningEvidenceInputItem { return { payloadId: `p-${JSON.stringify(metadata).length}-${evidenceClass}`, evidenceTypeId: evidenceClass, evidenceClass, providerId: 'fixture', asset: null, region: 'global', observedAt: '2026-06-03T00:00:00.000Z', normalizedAt: '2026-06-03T00:00:00.000Z', qualityScore: { payloadId: 'p', evidenceTypeId: evidenceClass, evidenceClass, providerId: 'fixture', asset: null, region: 'global', observedAt: '2026-06-03T00:00:00.000Z', evaluatedAt: '2026-06-03T00:00:00.000Z', provenanceKind: 'fixture', sourceQualityScore: 90, freshnessScore: 90, completenessScore: 90, conflictScore: 90, finalQualityScore: 90, freshnessStatus: 'fresh', conflictStatus: 'none', usabilityStatus: 'usable', reasons: [] }, usabilityStatus: 'usable', freshnessStatus: 'fresh', conflictStatus: 'none', dataQuality: 'high', valuesJson: '{}', metadataJson: JSON.stringify(metadata), reasons: ['fixture'] }; }

export function runAssetDirectionResolutionTests(): void {
  assert(assertAssetDirectionResolutionRuleSetValid(), 'rule set valid assertion passes');
  const hawkish = { direction: 'hawkish', policyIssuerRegion: 'united_states', driverKind: 'central_bank_policy' };
  const dovish = { direction: 'dovish', policyIssuerRegion: 'united_states', driverKind: 'central_bank_policy' };
  const riskOff = { direction: 'risk_off', riskRegime: 'risk_off', driverKind: 'risk_sentiment' };
  const riskOn = { direction: 'risk_on', riskRegime: 'risk_on', driverKind: 'risk_sentiment' };

  assert(res('dxy', hawkish).resolvedDirection === 'bullish', 'hawkish Fed resolves bullish for DXY');
  assert(res('eur_usd', hawkish).resolvedDirection === 'bearish', 'hawkish Fed resolves bearish for EUR/USD');
  assert(res('gbp_usd', hawkish).resolvedDirection === 'bearish', 'hawkish Fed resolves bearish for GBP/USD');
  const uj = res('usd_jpy', hawkish); assert(uj.resolvedDirection === 'bullish' && uj.warnings.includes('haven_conflict'), 'hawkish Fed resolves USD/JPY with caveat');
  const goldHawk = res('xau_usd', hawkish); assert((goldHawk.resolvedDirection === 'bearish' || goldHawk.resolvedDirection === 'mixed') && goldHawk.requiresPriceConfirmation, 'hawkish Fed gold requires confirmation');
  for (const a of ['nasdaq_100','sp500'] as const) { const r = res(a, hawkish); assert((r.resolvedDirection === 'bearish' || r.resolvedDirection === 'mixed') && r.requiresPriceConfirmation, `hawkish Fed ${a} caveated`); }
  assert(res('dxy', dovish).resolvedDirection === 'bearish', 'dovish Fed DXY bearish');
  assert(res('eur_usd', dovish).resolvedDirection === 'bullish', 'dovish Fed EUR/USD bullish without EUR weakness');

  assert(res('vix', riskOff, 'risk_sentiment').resolvedDirection === 'bullish', 'risk-off VIX bullish');
  for (const a of ['nasdaq_100','sp500'] as const) assert(res(a, riskOff, 'risk_sentiment').resolvedDirection === 'bearish', `risk-off ${a} bearish`);
  assert(res('aud_usd', riskOff, 'risk_sentiment').resolvedDirection === 'bearish', 'risk-off AUD/USD bearish');
  assert(res('nzd_usd', riskOff, 'risk_sentiment').resolvedDirection === 'bearish', 'risk-off NZD/USD bearish');
  const ujRisk = res('usd_jpy', riskOff, 'risk_sentiment'); assert((ujRisk.resolvedDirection === 'mixed' || ujRisk.resolvedDirection === 'bearish') && ujRisk.warnings.includes('haven_conflict'), 'risk-off USD/JPY caveated');
  const goldRisk = res('xau_usd', riskOff, 'risk_sentiment'); assert((goldRisk.resolvedDirection === 'bullish' || goldRisk.resolvedDirection === 'mixed') && goldRisk.warnings.includes('haven_conflict'), 'risk-off gold caveated');
  assert(res('nasdaq_100', riskOn, 'risk_sentiment').resolvedDirection === 'bullish', 'risk-on not universally bullish but supports equities');
  assert(res('vix', riskOn, 'risk_sentiment').resolvedDirection === 'bearish', 'risk-on does not always mean bullish');

  assert(res('usd_cad', { direction: 'positive', driverKind: 'oil_energy' }, 'energy_commodities').resolvedDirection === 'bearish', 'oil positive pressures USD/CAD lower through CAD quote');
  assert(res('aud_usd', { direction: 'positive', driverKind: 'china_demand' }, 'growth_activity').resolvedDirection === 'bullish', 'China demand AUD/USD bullish');
  assert(res('nzd_usd', { direction: 'positive', driverKind: 'china_demand' }, 'growth_activity').resolvedDirection === 'bullish', 'China demand NZD/USD bullish');
  assert(res('btc_usd', { direction: 'positive', driverKind: 'crypto_etf_flows' }, 'crypto_market_structure').resolvedDirection === 'bullish', 'crypto ETF/on-chain BTC bullish');
  assert(res('xau_usd', { direction: 'positive', driverKind: 'safe_haven_demand' }, 'geopolitical_risk').resolvedDirection === 'bullish', 'safe haven gold bullish');
  assert(res('usd_chf', { direction: 'positive', driverKind: 'safe_haven_demand' }, 'geopolitical_risk').warnings.includes('haven_conflict'), 'USD/CHF haven caveat');

  const positiveNews = res('sp500', { direction: 'positive' }, 'market_news'); assert(positiveNews.resolvedDirection === 'unknown' && positiveNews.confidence < 30, 'positive news alone not high-confidence bullish');
  const negativeNews = res('sp500', { direction: 'negative' }, 'market_news'); assert(negativeNews.resolvedDirection === 'unknown' && negativeNews.confidence < 30, 'negative news alone not high-confidence bearish');
  assert(res('dxy', hawkish).resolvedDirection !== res('eur_usd', hawkish).resolvedDirection, 'hawkish does not always mean bullish');
  assert(res('dxy', dovish).resolvedDirection !== res('eur_usd', dovish).resolvedDirection, 'dovish does not always mean bearish');
  assert(res('aud_usd', riskOff, 'risk_sentiment').resolvedDirection !== res('vix', riskOff, 'risk_sentiment').resolvedDirection, 'risk-off does not universally map bearish');

  const weightedDxy = buildWeightedEvidenceItem(item(hawkish), 'xau_usd', 'intraday');
  assert(weightedDxy.direction === 'bearish' && weightedDxy.contributionScore < 0, 'weighted evidence uses resolver output');
  const wd = buildWeightedEvidenceItem(item(hawkish), 'eur_usd', 'intraday');
  const wg = buildWeightedEvidenceItem(item(hawkish), 'xau_usd', 'intraday');
  const wn = buildWeightedEvidenceItem(item(hawkish), 'nasdaq_100', 'intraday');
  assert(wd.direction === 'bearish' && wg.direction === 'bearish' && wn.direction === 'bearish', 'same hawkish metadata resolves by asset contexts');
  assert(wd.reasons.some((x) => x.includes('direction_warning:pending_fx_relative_strength')), 'resolver warnings carried into reasons');
  const unknown = buildWeightedEvidenceItem(item({ direction: 'positive' }, 'market_news'), 'sp500', 'intraday');
  assert(unknown.direction === 'unknown' && unknown.contributionScore === 0, 'unknown resolver does not create false contribution');

  const valid = res('dxy', hawkish); assert(validateMarketAssetDirectionResolutionResult(valid).ok, 'valid result schema passes');
  const bad = { ...valid, resolvedDirection: 'up', rationale: 'buy now' }; assert(!validateMarketAssetDirectionResolutionResult(bad).ok, 'invalid direction and advice language rejected');
  const snap = getAssetDirectionResolutionRuleSetSnapshot('2026-06-03T00:00:00.000Z'); assert(validateMarketAssetDirectionResolutionRuleSetSnapshot(snap).ok, 'rule set snapshot validates');
  const coverage = getAssetDirectionResolutionCoverageReport('2026-06-03T00:00:00.000Z'); assert(validateMarketAssetDirectionResolutionCoverageReport(coverage).ok && coverage.pendingPhases.includes('R3') && coverage.pendingPhases.includes('R4') && coverage.pendingPhases.includes('R7'), 'coverage report validates and marks pending phases');

  const boundary = new CanonicalMarketIntelligenceBoundaryService(new MemoryMarketEvidenceRegistrySnapshotRepository(), new MemorySeoContentArchitectureSnapshotRepository());
  assert(boundary.assertAssetDirectionResolutionRuleSetValid(), 'boundary exposes valid assertion');
  assert(boundary.resolveAssetContextualEvidenceDirection({ asset: 'eur_usd', evidenceClass: 'central_bank_policy', metadataJson: JSON.stringify(hawkish) }).resolvedDirection === 'bearish', 'boundary resolver deterministic');
}
