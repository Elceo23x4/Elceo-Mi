import type { EventRealityEvaluation, PriceReactionTimelinePhase } from '../expectation-reality/contracts';

export type StageSlicedPathView = { phases: readonly PriceReactionTimelinePhase[]; reversal: boolean; acceptanceLost: boolean; twoSided: boolean };
const assertPhaseTime=(phase:PriceReactionTimelinePhase, event:EventRealityEvaluation, cutoff:string)=>{for(const at of [phase.startTimestamp,phase.endTimestamp])if(at&&(Date.parse(at)>Date.parse(event.interpretedAt)||Date.parse(at)>Date.parse(cutoff)))throw new Error('path_evidence_after_cleanliness_cutoff');};
export function stageSlicedPathView(event:EventRealityEvaluation,cutoff:string):StageSlicedPathView {
 const timeline=event.reality.priceReactionTimeline;
 const phases=event.assessmentStage==='immediate'?[timeline.immediate]:event.assessmentStage==='confirmation'?[timeline.immediate,timeline.confirmation]:[timeline.immediate,timeline.confirmation,timeline.followThrough];
 phases.forEach(p=>assertPhaseTime(p,event,cutoff));
 if(event.assessmentStage!=='follow_through')return{phases,reversal:false,acceptanceLost:false,twoSided:false};
 for(const at of [timeline.acceptanceLostTimestamp,timeline.reversalTimestamp,timeline.renewedAcceptanceTimestamp])if(at&&(Date.parse(at)>Date.parse(event.interpretedAt)||Date.parse(at)>Date.parse(cutoff)))throw new Error('path_evidence_after_cleanliness_cutoff');
 return{phases,reversal:timeline.initialConfirmationThenReversal||timeline.reversalTimestamp!==null,acceptanceLost:timeline.acceptanceLostTimestamp!==null,twoSided:event.reasonCodes.includes('two_sided_expansion')||event.reasonCodes.includes('two_sided_whipsaw')};
}
