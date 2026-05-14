import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { validateOfficialMacroCoverageReport, validateOfficialMacroFixturePayload, validateOfficialMacroNormalizedEvidence } from '@elceo/schemas';
import { CanonicalMarketIntelligenceBoundaryService } from '../runtime/canonical-market-intelligence-boundary';
import { getOfficialMacroCoverageReport, getOfficialMacroFixturePayload, listOfficialMacroFixturePayloads, normalizeOfficialMacroFixturePayload, assertOfficialMacroSourceIdsInProviderSnapshot, assertOfficialMacroSourcesMapToProviderRegistry } from '../official-macro-sources/index';

const boundary = new CanonicalMarketIntelligenceBoundaryService({} as never, {} as never);
describe('official macro sources', () => {
  it('coverage and mappings are deterministic + valid', () => { const c = getOfficialMacroCoverageReport(); assert.equal(validateOfficialMacroCoverageReport(c).ok, true); assert.equal(c.allLiveBlockedByDefault, true); assert.equal(assertOfficialMacroSourcesMapToProviderRegistry(), true); assert.equal(assertOfficialMacroSourceIdsInProviderSnapshot(), true); });
  it('fixtures normalize and forbid trade language/secrets', () => { const first = listOfficialMacroFixturePayloads()[0]; assert.ok(first); const vf = validateOfficialMacroFixturePayload(first); assert.equal(vf.ok, true); const n = normalizeOfficialMacroFixturePayload(first); assert.equal(validateOfficialMacroNormalizedEvidence(n).ok, true); const txt = JSON.stringify({ first, n }).toLowerCase(); ['buy', 'sell', 'hold', 'api_key', 'secret', 'token', 'password'].forEach((x) => assert.equal(txt.includes(x), false)); assert.ok(n.assetRelevance.length > 0); });
  it('boundary exposes methods', () => { const reg = boundary.getOfficialMacroSourceRegistry(); assert.ok(reg.length >= 14);
    ['aud_usd','usd_chf','nzd_usd','usd_cad'].forEach((asset)=>assert.ok(reg.some((s)=>s.assetRelevance.includes(asset as any)))); const src = reg[0]; assert.ok(src); assert.ok(boundary.getOfficialMacroSourceDescriptor(src.sourceId)); const sourceFixtures = listOfficialMacroFixturePayloads(src.sourceId); assert.ok(sourceFixtures.length > 0); const fixture = getOfficialMacroFixturePayload(src.sourceId, sourceFixtures[0]!.fixtureId); assert.ok(fixture); });
});
