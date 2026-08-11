import type { CrowdingState, MarketStressComponentName, MarketStressState } from './contracts';
export const POSITIONING_STRESS_POLICY_VERSION='positioning-stress-v1' as const;
export const MARKET_STRESS_WEIGHTS:Readonly<Record<MarketStressComponentName,number>>={expectation_reality_failure:15,path_trap_whipsaw:20,volatility_expansion:15,related_market_stress:10,cleanliness_conflict:15,narrative_dislocation:15,analog_stress_context:10};
export const MINIMUM_MARKET_COVERAGE=.75; export const MINIMUM_POSITIONING_HISTORY=52; export const MAXIMUM_POSITIONING_HISTORY=156;
export function marketStressState(score:number):Exclude<MarketStressState,'insufficient_data'>{return score<25?'low':score<50?'elevated':score<75?'high':'severe';}
export function crowdingState(percentile:number):CrowdingState{return percentile<10?'short_crowded':percentile<20?'short_skewed':percentile<80?'balanced':percentile<90?'long_skewed':'long_crowded';}
