import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { CanonicalMarketIntelligenceBoundaryService, getLaunchAssetFixtureCoverageReport, getLaunchAssetFixtureLibrary, listLaunchAssetFixtureScenarios, assertFixtureSourceIdsInRegistry } from '..';
import { validateLaunchAssetFixtureLibrary } from '@elceo/schemas';

describe('launch asset fixtures',()=>{
  it('schema and coverage checks pass',()=>{
    const lib=getLaunchAssetFixtureLibrary();
    const valid=validateLaunchAssetFixtureLibrary(lib);
    assert.equal(valid.ok,true);
    assert.equal(lib.assets.length,10);
    lib.assets.forEach((p)=>assert.ok(p.scenarios.length>=5));
    const cov=getLaunchAssetFixtureCoverageReport();
    assert.equal(cov.dxyComplete,true); assert.equal(cov.vixComplete,true);
    assert.equal(assertFixtureSourceIdsInRegistry(),true);
  });
  it('scenario quality invariants hold',()=>{
    const scenarios=listLaunchAssetFixtureScenarios();
    assert.ok(scenarios.every((s)=>s.evidence.length>0 && s.expectedOutput));
    assert.ok(scenarios.every((s)=>!JSON.stringify(s).match(/\b(buy|sell|hold)\b/i)));
    assert.ok(scenarios.some((s)=>s.kind==='stale_evidence'&&s.expectedOutput.expectedFreshnessWarnings));
    assert.ok(scenarios.some((s)=>s.kind==='conflicting_evidence'&&s.expectedOutput.expectedContradiction));
    const ids=scenarios.map((s)=>s.scenarioId);
    assert.deepEqual([...ids].sort(),ids);
  });
  it('boundary methods expose fixture helpers',()=>{
    const b=new CanonicalMarketIntelligenceBoundaryService({} as any, {} as any);
    const first=b.listLaunchAssetFixtureScenarios()[0];
    assert.ok(first);
    assert.ok(b.getLaunchAssetFixtureScenario(first.scenarioId));
    assert.ok(b.buildFixtureEvidenceForScenario(first.scenarioId).length>0);
    assert.ok(b.buildFixtureExpectedOutput(first.scenarioId));
    assert.ok(b.getLaunchAssetFixtureAssetPack('dxy'));
  });
});
