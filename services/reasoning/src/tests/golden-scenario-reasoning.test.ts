import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { validateGoldenScenarioDefinition, validateGoldenScenarioPack, validateGoldenScenarioReasoningResult } from '@elceo/schemas';
import type { GoldenScenarioAssetId } from '@elceo/types';
import { CanonicalMarketIntelligenceBoundaryService } from '../runtime/canonical-market-intelligence-boundary';
import { assertGoldenScenarioResult, getGoldenScenarioCoverageReport, getGoldenScenarioDefinitions, runAllGoldenScenarios, runGoldenScenario } from '../golden-scenario-reasoning/index';

describe('golden scenario reasoning',()=>{
  it('coverage and schema checks pass',()=>{
    const defs=getGoldenScenarioDefinitions();
    assert.ok(defs.length>=18);
    defs.forEach((d)=>assert.equal(validateGoldenScenarioDefinition(d).ok,true));
    assert.equal(validateGoldenScenarioPack({version:'c6-a6',generatedAt:'2026-01-15T00:00:00.000Z',scenarios:defs}).ok,true);
    const cov=getGoldenScenarioCoverageReport();
    const tier1a = ['xau_usd','eur_usd','gbp_usd','usd_jpy','btc_usd','nasdaq_100','sp500','de30','dxy','vix'] as const satisfies readonly GoldenScenarioAssetId[];
    tier1a.forEach((a)=>assert.ok(cov.tier1AAssetsCovered.includes(a)));
    const tier1b = ['aud_usd','usd_chf','nzd_usd','usd_cad'] as const satisfies readonly GoldenScenarioAssetId[];
    tier1b.forEach((a)=>assert.ok(cov.tier1BAssetsCovered.includes(a)));
    assert.ok(cov.crossAssetScenarioIds.length>=2);
  });
  it('runner and assertions are deterministic and guarded',()=>{
    const all=runAllGoldenScenarios();
    all.forEach((r)=>{assert.equal(validateGoldenScenarioReasoningResult(r).ok,true); assert.equal(r.forbiddenTermsFound.length,0); assert.ok(r.sourceFixtureIds.length>0);});
    assert.equal(assertGoldenScenarioResult('xau_usd_safe_haven_shock').result.contradictionDetected,true);
    const stale=runGoldenScenario('stale_evidence_warning');
    assert.equal(stale.freshnessWarning,true);
    assert.deepEqual([...stale.topEvidenceClasses].sort(),stale.topEvidenceClasses);
  });
  it('boundary exposes golden scenario methods',()=>{
    const b=new CanonicalMarketIntelligenceBoundaryService({} as never, {} as never);
    assert.ok(b.getGoldenScenarioDefinitions().length>=18);
    assert.ok(b.runAllGoldenScenarios().length>=18);
  });
});
