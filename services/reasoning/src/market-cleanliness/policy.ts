import type { CleanlinessComponentName } from './contracts';
export const MARKET_CLEANLINESS_POLICY_VERSION = 'market-cleanliness-v1' as const;
export const MARKET_CLEANLINESS_WEIGHTS: Readonly<Record<CleanlinessComponentName,number>> = Object.freeze({ release_clarity:15, primary_reaction_coherence:20, path_continuity:15, related_market_coherence:15, volatility_interpretability:10, session_liquidity_quality:10, analog_consistency:10, provenance_quality:5 });
export const MANDATORY_DIRECT_COMPONENTS:readonly CleanlinessComponentName[]=['release_clarity','primary_reaction_coherence','volatility_interpretability','provenance_quality'];
export const roundScore=(value:number):number=>Math.round((value+Number.EPSILON)*100)/100;
export const stageOrder=(stage:string):number=>stage==='immediate'?1:stage==='confirmation'?2:3;
