import type { NarrativePriceObservation } from './contracts';
export function eligibleObservation(p:NarrativePriceObservation,cutoff:string):boolean{const reliability=p.effectiveReliability??p.reliability;if(reliability==='verified')return true;if(reliability!=='replay')return false;return Boolean(p.verificationRef&&p.trustBasis&&p.verifiedAt&&Date.parse(p.verifiedAt)<=Date.parse(cutoff));}
export function validateNoTrustPromotion(p:NarrativePriceObservation):void{if(p.effectiveReliability&&p.effectiveReliability!==p.reliability)throw new Error('narrative_observation_trust_promotion');}
