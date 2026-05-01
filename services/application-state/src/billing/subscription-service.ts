import type { BillingEventKind, BillingPlanInterval, BillingProviderKind, BillingSubscriptionRecord, ElceoPlanKind } from '@elceo/types';
import { activateSubscription, cancelSubscription, changeSubscriptionPlan, createTrialSubscription, expireSubscription, markPastDue, pauseSubscription, renewSubscription, resumeSubscription } from './lifecycle';
import type { BillingEventRepository, BillingSubscriptionRepository, PersistedBillingSubscriptionRecord } from '../persistence';

const eventId = () => `bev_${Math.random().toString(36).slice(2, 12)}`;

export class BillingSubscriptionService {
  constructor(private readonly subs: BillingSubscriptionRepository, private readonly events: BillingEventRepository) {}
  private async latest(subjectId: string): Promise<PersistedBillingSubscriptionRecord> { const row = await this.subs.getLatestSubscriptionForSubject('user', subjectId); if (!row) throw new Error('billing_subscription_missing'); return row; }
  private async persist(subjectId: string, next: BillingSubscriptionRecord, kind: BillingEventKind): Promise<PersistedBillingSubscriptionRecord> {
    await this.subs.saveSubscription(next);
    await this.events.saveEvent({ eventId: eventId(), subscriptionId: next.subscriptionId, subjectKind: 'user', subjectId, kind, providerKind: next.providerKind, externalEventId: null, occurredAt: new Date().toISOString(), eventJson: JSON.stringify(next), createdAt: new Date().toISOString() });
    return next;
  }
  async startTrial(_subjectKind:'user', subjectId:string, planKind:ElceoPlanKind, trialEndsAt:string, providerKind:BillingProviderKind='internal_manual'){ const next=createTrialSubscription(subjectId,planKind,trialEndsAt,providerKind); return this.persist(subjectId,next,'trial_started'); }
  async activatePaidPlan(_subjectKind:'user', subjectId:string, planKind:ElceoPlanKind, interval:BillingPlanInterval, start:string, end:string, providerKind:BillingProviderKind='internal_manual'){ const current = await this.subs.getLatestSubscriptionForSubject('user',subjectId) ?? createTrialSubscription(subjectId,planKind,end,providerKind); const base={...current, planKind, providerKind}; const next=activateSubscription(base,interval,start,end); return this.persist(subjectId,next,'subscription_activated'); }
  async renewPaidPlan(_subjectKind:'user', subjectId:string, start:string, end:string){ const next=renewSubscription(await this.latest(subjectId),start,end); return this.persist(subjectId,next,'subscription_renewed'); }
  async changePlan(_subjectKind:'user', subjectId:string, nextPlanKind:ElceoPlanKind, interval:BillingPlanInterval, effectiveAt:string, _reason:string){ const next=changeSubscriptionPlan(await this.latest(subjectId),nextPlanKind,interval,effectiveAt); return this.persist(subjectId,next,'subscription_plan_changed'); }
  async markPastDue(_subjectKind:'user', subjectId:string, _occurredAt:string){ const next=markPastDue(await this.latest(subjectId)); return this.persist(subjectId,next,'payment_marked_past_due'); }
  async cancelAtPeriodEnd(_subjectKind:'user', subjectId:string, occurredAt:string){ const next=cancelSubscription(await this.latest(subjectId),occurredAt); return this.persist(subjectId,next,'subscription_canceled'); }
  async expireSubscription(_subjectKind:'user', subjectId:string, occurredAt:string){ const next=expireSubscription(await this.latest(subjectId),occurredAt); return this.persist(subjectId,next,'subscription_expired'); }
  async pauseSubscription(_subjectKind:'user', subjectId:string, _occurredAt:string){ const next=pauseSubscription(await this.latest(subjectId)); return this.persist(subjectId,next,'subscription_paused'); }
  async resumeSubscription(_subjectKind:'user', subjectId:string, _occurredAt:string){ const next=resumeSubscription(await this.latest(subjectId)); return this.persist(subjectId,next,'subscription_resumed'); }
}
