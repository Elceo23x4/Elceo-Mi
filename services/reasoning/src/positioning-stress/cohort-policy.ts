import type { PositioningCohort } from './contracts';
export const POSITIONING_COHORT_ROLE_POLICY_VERSION='positioning-cohort-role-v1' as const;
export type CohortRole='speculative_crowd'|'directional_institutional'|'commercial_hedging'|'dealer_intermediary'|'other_reportable'|'named_retail';
export type CohortRolePolicy=Readonly<{role:CohortRole;crowdEligible:boolean;qualificationLabel:string}>;
export function resolveCohortRole(reportKind:string,cohort:PositioningCohort):CohortRolePolicy{
 if(cohort.startsWith('retail:'))return{role:'named_retail',crowdEligible:true,qualificationLabel:cohort};
 if(reportKind==='legacy_futures_only'&&cohort==='non_commercial')return{role:'speculative_crowd',crowdEligible:true,qualificationLabel:'legacy_cohort_coarse'};
 if(reportKind==='disaggregated'&&cohort==='managed_money')return{role:'speculative_crowd',crowdEligible:true,qualificationLabel:'managed_money'};
 if(reportKind==='traders_in_financial_futures'&&cohort==='leveraged_funds')return{role:'speculative_crowd',crowdEligible:true,qualificationLabel:'leveraged_funds'};
 if(reportKind==='traders_in_financial_futures'&&cohort==='asset_manager')return{role:'directional_institutional',crowdEligible:true,qualificationLabel:'asset_manager'};
 if(cohort==='producer_merchant'||cohort==='swap_dealer')return{role:'commercial_hedging',crowdEligible:false,qualificationLabel:cohort};
 if(cohort==='dealer')return{role:'dealer_intermediary',crowdEligible:false,qualificationLabel:'dealer'};
 return{role:'other_reportable',crowdEligible:false,qualificationLabel:cohort};
}
