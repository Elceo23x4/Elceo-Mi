import { strict as assert } from 'node:assert';
import { checkCognitionGuardrails, getAssetEvidenceWeights, runAllCognitionCalibrationScenarios, scoreEvidenceFreshness, scoreEvidenceQuality, scoreSourceCredibility, weightEvidenceForAsset } from '../cognition-calibration/index';
export function runCognitionCalibrationTests(){
  assert(scoreSourceCredibility('federal_reserve').score>0.9);
  assert(scoreEvidenceFreshness('2026-01-01T00:00:00.000Z','2026-01-01T12:00:00.000Z').score>0.9);
  assert(scoreEvidenceQuality({evidenceId:'e1',sourceId:'federal_reserve',observedAt:'2026-01-01T00:00:00.000Z',evaluatedAt:'2026-01-01T12:00:00.000Z',completeness:0.9,scenarioRelevance:0.9}).score>0.7);
  const tier=['xau_usd','eur_usd','gbp_usd','usd_jpy','btc_usd','nasdaq_100','sp500','de30','dxy','vix','aud_usd','usd_chf','nzd_usd','usd_cad'] as const;
  for(const a of tier) assert(getAssetEvidenceWeights(a as any).length>0);
  const w=weightEvidenceForAsset('xau_usd',[{evidenceId:'b',asset:'xau_usd',sourceId:'federal_reserve',theme:'real_yields',baseWeight:0.8,qualityScore:0.9,weightedScore:0,pressureDirection:'bearish',observedAt:'2026-01-01T00:00:00.000Z'},{evidenceId:'a',asset:'xau_usd',sourceId:'federal_reserve',theme:'safe_haven',baseWeight:0.7,qualityScore:0.8,weightedScore:0,pressureDirection:'bullish',observedAt:'2026-01-01T00:00:00.000Z'}]);
  assert(w[0]!.evidenceId==='b');
  assert(checkCognitionGuardrails('guaranteed profit').passed===false);
  assert(checkCognitionGuardrails('deterministic cognition narrative').passed===true);
  assert(runAllCognitionCalibrationScenarios().length>0);
}
