import { withDbTransaction } from '../db/client';

export type CanonicalSubscriptionLifecycleKind =
  | 'subscription_created' | 'subscription_updated' | 'subscription_deleted'
  | 'renewal_succeeded' | 'renewal_failed';
export type CanonicalSubscriptionState = 'trialing'|'active'|'past_due'|'unpaid'|'canceled'|'incomplete'|'incomplete_expired'|'paused';
export type SubscriptionLifecycleEvent = {
  providerEventId:string; kind:CanonicalSubscriptionLifecycleKind; operationId:string|null;
  providerPaymentReference:string|null; providerSessionReference:string|null;
  providerCustomerReference:string|null; providerSubscriptionReference:string|null;
  subjectUserId:string|null; targetPlan:string|null; billingInterval:string|null;
  subscriptionState:CanonicalSubscriptionState|null; currentPeriodStart:string|null;
  currentPeriodEnd:string|null; cancelAtPeriodEnd:boolean; occurredAt:string;
};
const accessState=(kind:CanonicalSubscriptionLifecycleKind,state:CanonicalSubscriptionState|null,existing:string|null)=>
  kind==='subscription_deleted'?'canceled':kind==='renewal_failed'?(state==='unpaid'?'unpaid':'past_due'):kind==='renewal_succeeded'?(existing==='active'||existing==='trialing'?existing:'active'):state;
const active=(state:string|null)=>state==='active'||state==='trialing';

/** Event-ID-idempotent recurring lifecycle layer, independent from initial grant effects. */
export async function applyCanonicalSubscriptionLifecycleEvent(event:SubscriptionLifecycleEvent){
  if(!event.providerEventId||!event.providerSubscriptionReference)return {status:'orphan' as const,duplicate:false,operationId:null};
  return withDbTransaction(async tx=>{
    const rows=event.operationId
      ?(await tx.query('SELECT * FROM payment_operations WHERE internal_payment_operation_id=$1 FOR UPDATE',[event.operationId])).rows
      :(await tx.query(`SELECT * FROM payment_operations WHERE provider_subscription_reference=$1 OR provider_checkout_session_reference=$2 OR provider_payment_reference=$3 ORDER BY created_at ASC LIMIT 1 FOR UPDATE`,[event.providerSubscriptionReference,event.providerSessionReference,event.providerPaymentReference])).rows;
    const op=rows[0] as Record<string,unknown>|undefined;
    if(!op)return {status:'orphan' as const,duplicate:false,operationId:null};
    if(event.subjectUserId&&event.subjectUserId!==op.subject_user_id)return {status:'orphan' as const,duplicate:false,operationId:null};
    const inserted=(await tx.query(`INSERT INTO payment_subscription_lifecycle_events(provider_event_id,internal_payment_operation_id,lifecycle_kind,provider_subscription_reference,subscription_state,occurred_at,applied_at) VALUES($1,$2,$3,$4,$5,$6,NOW()) ON CONFLICT(provider_event_id) DO NOTHING RETURNING provider_event_id`,[event.providerEventId,op.internal_payment_operation_id,event.kind,event.providerSubscriptionReference,event.subscriptionState,event.occurredAt])).rows;
    if(!inserted.length)return {status:'applied' as const,duplicate:true,operationId:String(op.internal_payment_operation_id)};
    const previousAt=op.last_provider_event_created_at ? Date.parse(String(op.last_provider_event_created_at)) : Number.NEGATIVE_INFINITY;
    const incomingAt=Date.parse(event.occurredAt);
    const state=accessState(event.kind,event.subscriptionState,typeof op.subscription_state==='string'?op.subscription_state:null);
    if(incomingAt===previousAt&&state!==op.subscription_state){await tx.query(`UPDATE payment_operations SET reconciliation_state='required',safe_error_category='provider_equal_timestamp_conflict',updated_at=NOW() WHERE internal_payment_operation_id=$1`,[op.internal_payment_operation_id]);return {status:'reconciliation_required' as const,duplicate:false,operationId:String(op.internal_payment_operation_id),subscriptionState:String(op.subscription_state)};}
    if(!Number.isFinite(incomingAt)||incomingAt<previousAt||op.subscription_state==='canceled'&&event.kind!=='subscription_deleted')return {status:'applied' as const,duplicate:false,stale:true,operationId:String(op.internal_payment_operation_id),subscriptionState:String(op.subscription_state)};
    await tx.query(`UPDATE payment_operations SET provider_customer_reference=COALESCE($2,provider_customer_reference),provider_subscription_reference=$3,provider_checkout_session_reference=COALESCE($4,provider_checkout_session_reference),provider_payment_reference=COALESCE($5,provider_payment_reference),subscription_state=$6,current_period_start=COALESCE($7,current_period_start),current_period_end=COALESCE($8,current_period_end),cancel_at_period_end=$9,provider_event_references=provider_event_references||to_jsonb($10::text),last_provider_event_created_at=$11,updated_at=NOW(),version=version+1 WHERE internal_payment_operation_id=$1`,[op.internal_payment_operation_id,event.providerCustomerReference,event.providerSubscriptionReference,event.providerSessionReference,event.providerPaymentReference,state,event.currentPeriodStart,event.currentPeriodEnd,event.cancelAtPeriodEnd,event.providerEventId,event.occurredAt]);
    await tx.query(`UPDATE app_billing_subscriptions SET provider_kind='stripe',external_customer_id=COALESCE($2,external_customer_id),external_subscription_id=$3,plan_kind='focus_plan',subscription_state=$4,status=$4,plan_tier=$5,interval=COALESCE($6,interval),current_period_start=COALESCE($7,current_period_start),current_period_end=COALESCE($8,current_period_end),cancel_at_period_end=$9,current_period_start_utc=COALESCE($7,current_period_start_utc),current_period_end_utc=COALESCE($8,current_period_end_utc),updated_at=NOW(),updated_at_utc=NOW(),last_webhook_event_id=$10,last_provider_event_created_at=$11 WHERE subject_kind='user' AND subject_id=$1`,[op.subject_user_id,event.providerCustomerReference,event.providerSubscriptionReference,state,active(state)?'premium':'free',event.billingInterval,event.currentPeriodStart,event.currentPeriodEnd,event.cancelAtPeriodEnd,event.providerEventId,event.occurredAt]);
    return {status:'applied' as const,duplicate:false,operationId:String(op.internal_payment_operation_id),subscriptionState:state};
  });
}
