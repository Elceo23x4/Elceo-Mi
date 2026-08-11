import type { ReasoningPersistenceRepository } from '../persistence/contracts';
import type { FragilityScoreEvaluation, FragilityScoreServiceInput } from './contracts';
import { evaluateFragility } from './evaluator';

const same=(actual:string,expected:string,error:string)=>{if(actual!==expected)throw new Error(error);};
const before=(value:string,cutoff:string,error:string)=>{if(Date.parse(value)>Date.parse(cutoff))throw new Error(error);};
export class FragilityScoreService{
 constructor(private readonly persistence:ReasoningPersistenceRepository){}
 async evaluate(input:FragilityScoreServiceInput):Promise<FragilityScoreEvaluation>{
  const [event,protocol,cleanliness,narrative,positioning,analog]=await Promise.all([
   this.persistence.eventRealityRepository.getEventEvaluationById(input.eventEvaluationId),
   this.persistence.contradictionActionProtocolRepository.getProtocolRecordById(input.protocolDecisionId),
   this.persistence.marketCleanlinessRepository.getEvaluationById(input.cleanlinessEvaluationId),
   this.persistence.narrativeDecayRepository.getEvaluationById(input.narrativeDecayEvaluationId),
   this.persistence.positioningStressRepository.getEvaluationById(input.positioningStressEvaluationId),
   input.analogRetrievalId?this.persistence.historicalAnalogRepository.getRetrievalById(input.analogRetrievalId):Promise.resolve(null)
  ]);
  if(!event)throw new Error('fragility_event_evaluation_missing');if(!protocol)throw new Error('fragility_protocol_decision_missing');if(!cleanliness)throw new Error('fragility_cleanliness_evaluation_missing');if(!narrative)throw new Error('fragility_narrative_evaluation_missing');if(!positioning)throw new Error('fragility_positioning_evaluation_missing');if(input.analogRetrievalId&&!analog)throw new Error('fragility_analog_retrieval_missing');
  for(const [id,label] of [[protocol.sourceEventEvaluationId,'protocol'],[cleanliness.sourceEventEvaluationId,'cleanliness'],[narrative.sourceEventEvaluationId,'narrative'],[positioning.sourceEventEvaluationId,'positioning']] as const)same(id,event.eventEvaluationId,`fragility_${label}_event_lineage_mismatch`);
  for(const [id,label] of [[protocol.sourceExpectationId,'protocol'],[cleanliness.sourceExpectationId,'cleanliness'],[narrative.sourceExpectationId,'narrative'],[positioning.sourceExpectationId,'positioning']] as const)same(id,event.expectationId,`fragility_${label}_expectation_lineage_mismatch`);
  for(const [asset,label] of [[protocol.sourceAsset,'protocol'],[cleanliness.asset,'cleanliness'],[narrative.asset,'narrative'],[positioning.asset,'positioning']] as const)same(asset,event.asset,`fragility_${label}_asset_lineage_mismatch`);
  for(const [kind,label] of [[cleanliness.eventKind,'cleanliness'],[narrative.eventKind,'narrative'],[positioning.eventKind,'positioning']] as const)same(kind,event.expectation.eventKind,`fragility_${label}_event_kind_lineage_mismatch`);
  for(const [stage,label] of [[protocol.sourceAssessmentStage,'protocol'],[cleanliness.assessmentStage,'cleanliness'],[positioning.assessmentStage,'positioning']] as const)same(stage,event.assessmentStage,`fragility_${label}_stage_lineage_mismatch`);
  for(const [cutoff,label] of [[protocol.evidenceCutoffAt,'protocol'],[cleanliness.evidenceCutoffAt,'cleanliness'],[narrative.evidenceCutoffAt,'narrative'],[positioning.evidenceCutoffAt,'positioning']] as const)same(cutoff,input.evidenceCutoffAt,`fragility_${label}_cutoff_lineage_mismatch`);
  for(const [created,label] of [[event.createdAt,'event'],[protocol.createdAt,'protocol'],[cleanliness.createdAt,'cleanliness'],[narrative.createdAt,'narrative'],[positioning.createdAt,'positioning']] as const)before(created,input.evidenceCutoffAt,`fragility_${label}_after_cutoff`);
  if(analog){same(analog.queryEventEvaluationId,event.eventEvaluationId,'fragility_analog_event_lineage_mismatch');same(analog.queryCutoffAt,input.evidenceCutoffAt,'fragility_analog_cutoff_lineage_mismatch');before(analog.createdAt,input.evidenceCutoffAt,'fragility_analog_after_cutoff');}
  const requested=input.analogRetrievalId??null;for(const [ref,label] of [[protocol.sourceAnalogRetrievalId,'protocol'],[cleanliness.sourceAnalogRetrievalId,'cleanliness'],[narrative.sourceAnalogRetrievalId,'narrative'],[positioning.sourceAnalogRetrievalId,'positioning']] as const)if(ref!==null&&ref!==requested)throw new Error(`fragility_${label}_analog_lineage_mismatch`);
  return this.persistence.fragilityScoreRepository.saveEvaluation(evaluateFragility({event,protocol,cleanliness,narrative,positioning,analog,cutoff:input.evidenceCutoffAt}));
 }
}
