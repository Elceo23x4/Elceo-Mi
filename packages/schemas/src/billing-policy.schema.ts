import type { BillingPolicyEvaluation, BillingPolicySnapshot, BillingPolicyTransition } from '@elceo/types';
import { validateAccountEntitlementState } from './entitlements.schema';
import { validateCanonicalBillingCustomer, validateCanonicalBillingSubscription } from './billing-lifecycle.schema';
import { isBoolean, isEnumValue, isIsoDateString, isObjectRecord, type SchemaValidationResult } from './validation-utils';

const decisionCodes=['premium_active_ok','premium_trial_ok','premium_paused_restricted','premium_past_due_restricted','premium_incomplete_restricted','premium_incomplete_expired_free_fallback','premium_canceled_free_fallback','premium_recovered_to_active','free_default_ok','admin_internal_override_preserved'] as const;
const severities=['info','warning','restriction','suspension_candidate'] as const;
const providers=['stripe','manual_test','internal_import'] as const;
const operational=['healthy','restricted','degraded','free_fallback'] as const;
const plans=['free','premium','admin_internal'] as const; const accountStates=['active','suspended','restricted','canceled'] as const;
const nonEmpty=(v:unknown)=>typeof v==='string'&&v.trim().length>0;

export function validateBillingPolicyTransition(input:unknown):SchemaValidationResult<BillingPolicyTransition>{ if(!isObjectRecord(input)) return {ok:false,errors:['transition must be object']};
if(!nonEmpty(input.transitionId)||input.subjectKind!=='user'||!nonEmpty(input.subjectId)) return {ok:false,errors:['identity']};
if(!isEnumValue(input.providerKind,providers)) return {ok:false,errors:['providerKind']};
if(!(input.billingSubscriptionId===null||nonEmpty(input.billingSubscriptionId))) return {ok:false,errors:['billingSubscriptionId']};
if(!(input.previousPlanKind===null||isEnumValue(input.previousPlanKind,plans))||!isEnumValue(input.nextPlanKind,plans)) return {ok:false,errors:['planKind']};
if(!(input.previousAccountState===null||isEnumValue(input.previousAccountState,accountStates))||!isEnumValue(input.nextAccountState,accountStates)) return {ok:false,errors:['accountState']};
if(!isEnumValue(input.decisionCode,decisionCodes)||!isEnumValue(input.severity,severities)) return {ok:false,errors:['decision']};
if(!isBoolean(input.restrictedAccess)||!isBoolean(input.recoveredAccess)) return {ok:false,errors:['flags']};
if(!(input.sourceReconciliationRunId===null||nonEmpty(input.sourceReconciliationRunId))) return {ok:false,errors:['sourceReconciliationRunId']};
if(!nonEmpty(input.rationale)) return {ok:false,errors:['rationale']}; if(!isIsoDateString(input.decidedAt)||!isIsoDateString(input.createdAt)) return {ok:false,errors:['timestamps']};
return {ok:true,value:input as BillingPolicyTransition}; }

export function validateBillingPolicyEvaluation(input:unknown):SchemaValidationResult<BillingPolicyEvaluation>{ if(!isObjectRecord(input)) return {ok:false,errors:['evaluation must be object']};
if(!isEnumValue(input.operationalState,operational)||!isEnumValue(input.nextPlanKind,plans)||!isEnumValue(input.nextAccountState,accountStates)) return {ok:false,errors:['state']};
if(!isBoolean(input.restrictedAccess)||!isBoolean(input.recoveredAccess)) return {ok:false,errors:['flags']};
if(!isEnumValue(input.decisionCode,decisionCodes)||!isEnumValue(input.severity,severities)||!nonEmpty(input.rationale)) return {ok:false,errors:['decision']};
return {ok:true,value:input as BillingPolicyEvaluation}; }

export function validateBillingPolicySnapshot(input:unknown):SchemaValidationResult<BillingPolicySnapshot>{ if(!isObjectRecord(input)) return {ok:false,errors:['snapshot must be object']};
if(!isIsoDateString(input.generatedAt)||input.subjectKind!=='user'||!nonEmpty(input.subjectId)) return {ok:false,errors:['identity']};
if(!(input.customer===null||validateCanonicalBillingCustomer(input.customer).ok)) return {ok:false,errors:['customer']};
if(!(input.subscription===null||validateCanonicalBillingSubscription(input.subscription).ok)) return {ok:false,errors:['subscription']};
if(!validateAccountEntitlementState(input.entitlementState).ok) return {ok:false,errors:['entitlementState']};
if(!(input.latestPolicyTransition===null||validateBillingPolicyTransition(input.latestPolicyTransition).ok)) return {ok:false,errors:['latestPolicyTransition']};
return {ok:true,value:input as BillingPolicySnapshot}; }
