import { evaluateExpectationReality, MemoryExpectationRealityRepository, MemoryExpectationRepository, type ExpectationRecord, type ObservationCandle } from '../expectation-reality/index.js';
function assert(c:boolean,m:string){ if(!c) throw new Error(`Assertion failed: ${m}`); }
const base: ExpectationRecord = { expectationId:'e1', asset:'XAU/USD', timeframe:'H1', issuedAt:'2026-01-01T00:00:00.000Z', dataCutoffAt:'2026-01-01T00:00:00.000Z', reasoningRunId:'r1', cognitionSnapshotId:'s1', reasoningVersion:'rv', scoringVersion:'sv', basePrice:100, recentRangePct:2, expectedBias:'bullish', confidenceScore:80, confidenceAnatomy:{sourceIntegrity:1,eventAlignment:1,priceAcceptance:1,contradictionPenalty:0,stalenessPenalty:0,weightedScore:80,componentsVersion:'v'}, contradictionScore:0, contradictionRegime:'none', invalidationState:{primary:null,secondary:[],summary:'none',riskLabel:'guarded'}, topEvidenceIds:['a'], linkedEventIds:['x'], thesis:'frozen expectation', whatWouldChangeState:['new evidence'], horizonPolicyVersion:'expectation-reality-v1', createdAt:'2026-01-01T00:00:00.000Z' };
function c(n:number,o:number,h:number,l:number,cl:number,complete=true):ObservationCandle{ return {openedAt:`2026-01-01T0${n}:00:00.000Z`,closedAt:`2026-01-01T0${n+1}:00:00.000Z`,open:o,high:h,low:l,close:cl,complete}; }
function ev(exp:ExpectationRecord,candles:ObservationCandle[],horizon:'immediate'|'confirmation'|'follow_through'='confirmation'){return evaluateExpectationReality({expectation:exp,observations:{observationVersion:'v1',candles},horizon,evaluatedAt:'2026-01-02T00:00:00.000Z'});}
export async function runExpectationRealityTests(){
 assert(ev(base,[c(1,100,103,99,102),c(2,102,104,101,103),c(3,103,105,102,104)]).outcome==='confirmed','clean bullish confirmation');
 assert(ev({...base,expectedBias:'bearish'},[c(1,100,101,97,98),c(2,98,99,96,97),c(3,97,98,95,96)]).outcome==='confirmed','clean bearish confirmation');
 assert(ev(base,[c(1,100,101,97,98),c(2,98,99,96,97),c(3,97,98,95,96)]).outcome==='contradicted','bullish contradiction');
 assert(ev({...base,expectedBias:'bearish'},[c(1,100,103,99,102),c(2,102,104,101,103),c(3,103,105,102,104)]).outcome==='contradicted','bearish contradiction');
 assert(ev({...base,expectedBias:'neutral'},[c(1,100,100.5,99.5,100.1),c(2,100.1,100.4,99.8,100),c(3,100,100.3,99.7,100.2)]).outcome==='confirmed','neutral preserved');
 assert(ev({...base,expectedBias:'neutral'},[c(1,100,103,99,102),c(2,102,104,101,103),c(3,103,105,102,104)]).outcome==='contradicted','neutral expansion broken');
 assert(ev(base,[c(1,100,101,98.5,99),c(2,99,103,98.8,102),c(3,102,104,101,103)]).pathClassification==='clean_confirmation','adverse below confirmation then confirmation');
 assert(ev(base,[c(1,100,103,99,102),c(2,102,104,101,103),c(3,103,104,-1,96)]).outcome==='two_sided_whipsaw','confirmation then reversal whipsaw');
 const inv={...base,invalidationState:{...base.invalidationState,primary:{invalidationId:'i',asset:'XAU/USD',timeframe:'H1' as const,price:98,side:'bullish_invalidation' as const,severityScore:90,reason:'explicit',linkedEvidenceIds:[],linkedZoneIds:[],triggeredBy:[],confirmed:false,confirmedAt:null}}};
 assert(ev(inv,[c(1,100,101,97,98),c(2,98,103,97,102),c(3,102,104,101,103)]).outcome==='invalidated','invalidation before confirmation');
 assert(ev(inv,[c(1,100,103,99,102),c(2,102,104,97,99),c(3,99,103,98,102)]).outcome==='confirmed' || ev(inv,[c(1,100,103,99,102),c(2,102,104,97,99),c(3,99,103,98,102)]).outcome==='two_sided_whipsaw','confirmation before later invalidation not invalidated');
 assert(ev(base,[c(1,100,103,97,100),c(2,100,104,96,101),c(3,101,105,95,100)]).outcome==='two_sided_whipsaw','two-sided whipsaw');
 assert(ev(base,[c(1,100,101,99,100.5),c(2,100.5,101,99,100.8),c(3,100.8,101.5,99.5,101),c(4,101,101.5,100,101.2),c(5,101.2,101.8,100,101.5),c(6,101.5,103,101,102.5)],'follow_through').outcome==='confirmed','six-bar confirmation');
 const high=ev(base,[c(1,100,101,97,98),c(2,98,99,96,97),c(3,97,98,95,96)]).delta.compositeDeltaScore; const low=ev({...base,confidenceScore:20},[c(1,100,101,97,98),c(2,98,99,96,97),c(3,97,98,95,96)]).delta.compositeDeltaScore; assert(high>low,'high-confidence contradiction larger delta');
 assert(ev({...base,confidenceScore:20},[c(1,100,103,99,102),c(2,102,104,101,103),c(3,103,105,102,104)]).delta.reasonCodes.includes('underconfident_confirmation'),'underconfidence recorded');
 assert(ev({...base,expectedBias:'mixed'},[c(1,100,103,99,102),c(2,102,104,101,103),c(3,103,105,102,104)]).outcome==='not_directionally_scorable','mixed not scored');
 assert(ev({...base,recentRangePct:0},[c(1,100,103,99,102),c(2,102,104,101,103),c(3,103,105,102,104)]).outcome==='insufficient_data','missing volatility insufficient');
 assert(ev(base,[c(1,100,103,99,102)]).outcome==='insufficient_data','incomplete horizon insufficient');
 assert(ev(base,[c(1,100,101,99,100),c(1,100,101,99,100),c(2,100,101,99,100)]).delta.reasonCodes.includes('duplicate_candle_rejected'),'duplicate rejected');
 assert(ev(base,[c(2,100,101,99,100),c(1,100,101,99,100),c(3,100,101,99,100)]).delta.reasonCodes.includes('out_of_order_candle_rejected'),'out of order rejected');
 assert(ev(base,[c(1,100,99,98,101),c(2,100,101,99,100),c(3,100,101,99,100)]).delta.reasonCodes.includes('invalid_ohlc_rejected'),'invalid ohlc rejected');
 assert(ev(base,[{...c(1,100,101,99,100),closedAt:'2026-01-03T00:00:00.000Z'},c(2,100,101,99,100),c(3,100,101,99,100)]).delta.reasonCodes.includes('future_data_rejected'),'future rejected');
 assert(ev(base,[c(1,100,100,100,100),c(2,100,100,100,100),c(3,100,100,100,100)]).outcome==='unresolved','session gap not manufactured zero extra bars');
 assert(JSON.stringify(ev(base,[c(1,100,103,99,102),c(2,102,104,101,103),c(3,103,105,102,104)]))===JSON.stringify(ev(base,[c(1,100,103,99,102),c(2,102,104,101,103),c(3,103,105,102,104)])),'deterministic same input');
 const er=new MemoryExpectationRepository(); await er.saveExpectation(base); await er.saveExpectation(base); assert((await er.listPendingExpectations()).length===1,'expectation idempotent'); const rr=new MemoryExpectationRealityRepository(); const e=ev(base,[c(1,100,103,99,102),c(2,102,104,101,103),c(3,103,105,102,104)]); await rr.saveEvaluation(e); await rr.saveEvaluation(e); assert((await rr.listExpectationRealityHistory({limit:10})).length===1,'evaluation idempotent');
 assert(!JSON.stringify(e).toLowerCase().match(/buy|sell|hold/),'no direct advice language');
}
