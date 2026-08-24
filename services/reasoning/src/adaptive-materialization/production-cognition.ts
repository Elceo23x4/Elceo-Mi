import { validateMarketCognitionSnapshot } from '@elceo/schemas';
import type { MarketCognitionSnapshot, WeightedEvidenceSnapshot } from '@elceo/types';
import { buildMarketCognitionSnapshot } from '../market-cognition/market-cognition-builder';
import type { CognitionMaterializationInput, TrustedCognitionConfiguration } from './service';
export const PGS4_PRODUCTION_COGNITION_CONFIGURATION:TrustedCognitionConfiguration={cognitionContractVersion:'market-cognition-snapshot-v1',weightingPolicyVersion:'asset-evidence-weight-policy-v1',ruleVersions:['market-cognition-builder-v1','contradiction-matrix-v1','confidence-decomposition-v1'],freshnessMs:60_000,validate:payload=>validateMarketCognitionSnapshot(payload).ok};
export type WeightedEvidenceSnapshotLoader=(input:CognitionMaterializationInput)=>Promise<WeightedEvidenceSnapshot>;
export const createProductionCognitionCompute=(load:WeightedEvidenceSnapshotLoader)=>(async(input:CognitionMaterializationInput):Promise<MarketCognitionSnapshot>=>buildMarketCognitionSnapshot(await load(input),new Date(input.evaluatedAt).toISOString()));
