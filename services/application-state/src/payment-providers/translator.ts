import type { BillingExternalEventIngestResult } from '@elceo/types';
import type { ExternalBillingSubscriptionRepository, PersistedExternalEventRecord } from '../persistence';
import { CanonicalBillingBoundaryService } from '../runtime/canonical-billing-boundary';
import type { NormalizedExternalEvent } from './stripe-like-normalizer';

type Result = Pick<BillingExternalEventIngestResult, 'translated' | 'processingResultCode' | 'linkedBillingSubscriptionId' | 'linkedSubjectId'>;

export class PaymentProviderTranslator {
  constructor(private readonly billing: CanonicalBillingBoundaryService, private readonly externalSubs: ExternalBillingSubscriptionRepository) {}

  private async fromSubscriptionEvent(normalized: NormalizedExternalEvent, linkedSubjectId: string): Promise<Result> {
    const synced = normalized.externalSubscriptionId ? await this.externalSubs.getSubscription(normalized.providerKind, normalized.externalSubscriptionId) : null;
    const s = synced ?? normalized.subscription;
    if (!s) return { translated: false, processingResultCode: 'subscription_missing', linkedBillingSubscriptionId: null, linkedSubjectId };

    if (normalized.kind === 'subscription_created') {
      if (s.mappedPlanKind && s.providerStatus === 'trialing' && s.trialEndsAt) {
        const row = await this.billing.startTrial('user', linkedSubjectId, s.mappedPlanKind, s.trialEndsAt, 'stripe_placeholder');
        return { translated: true, processingResultCode: 'trial_started', linkedBillingSubscriptionId: row.subscriptionId, linkedSubjectId };
      }
      if (s.mappedPlanKind && ['active', 'past_due'].includes(s.providerStatus) && s.currentPeriodStart && s.currentPeriodEnd) {
        const row = await this.billing.activatePaidPlan('user', linkedSubjectId, s.mappedPlanKind, 'monthly', s.currentPeriodStart, s.currentPeriodEnd, 'stripe_placeholder');
        return { translated: true, processingResultCode: 'paid_activated', linkedBillingSubscriptionId: row.subscriptionId, linkedSubjectId };
      }
      return { translated: false, processingResultCode: 'subscription_created_insufficient_data', linkedBillingSubscriptionId: null, linkedSubjectId };
    }

    if (normalized.kind === 'subscription_updated') {
      const current = await this.billing.getLatestBillingSubscription('user', linkedSubjectId);
      if (s.cancelAtPeriodEnd) {
        const row = await this.billing.cancelAtPeriodEnd('user', linkedSubjectId, normalized.occurredAt);
        return { translated: true, processingResultCode: 'cancel_at_period_end_set', linkedBillingSubscriptionId: row.subscriptionId, linkedSubjectId };
      }
      if (s.providerStatus === 'trialing' && s.trialEndsAt && s.mappedPlanKind) {
        const row = await this.billing.startTrial('user', linkedSubjectId, s.mappedPlanKind, s.trialEndsAt, 'stripe_placeholder');
        return { translated: true, processingResultCode: 'trial_updated', linkedBillingSubscriptionId: row.subscriptionId, linkedSubjectId };
      }
      if (current && s.mappedPlanKind && s.mappedPlanKind !== current.planKind) {
        const row = await this.billing.changePlan('user', linkedSubjectId, s.mappedPlanKind, current.interval, normalized.occurredAt, 'provider_sync');
        return { translated: true, processingResultCode: 'plan_changed', linkedBillingSubscriptionId: row.subscriptionId, linkedSubjectId };
      }
      if (current && current.currentPeriodEnd && s.currentPeriodStart && s.currentPeriodEnd && current.currentPeriodEnd < s.currentPeriodEnd) {
        const row = await this.billing.renewPaidPlan('user', linkedSubjectId, s.currentPeriodStart, s.currentPeriodEnd);
        return { translated: true, processingResultCode: 'renewed_from_subscription_update', linkedBillingSubscriptionId: row.subscriptionId, linkedSubjectId };
      }
      return { translated: false, processingResultCode: 'subscription_updated_noop_insufficient_data', linkedBillingSubscriptionId: null, linkedSubjectId };
    }

    if (normalized.kind === 'subscription_deleted') {
      if (s.cancelAtPeriodEnd) {
        const row = await this.billing.cancelAtPeriodEnd('user', linkedSubjectId, normalized.occurredAt);
        return { translated: true, processingResultCode: 'deleted_marked_cancel_at_period_end', linkedBillingSubscriptionId: row.subscriptionId, linkedSubjectId };
      }
      if (['canceled', 'incomplete_expired', 'unpaid'].includes(s.providerStatus)) {
        const row = await this.billing.expireSubscription('user', linkedSubjectId, normalized.occurredAt);
        return { translated: true, processingResultCode: 'deleted_expired', linkedBillingSubscriptionId: row.subscriptionId, linkedSubjectId };
      }
      return { translated: false, processingResultCode: 'subscription_deleted_noop_insufficient_data', linkedBillingSubscriptionId: null, linkedSubjectId };
    }

    return { translated: false, processingResultCode: 'no_mutation_subscription_kind', linkedBillingSubscriptionId: null, linkedSubjectId };
  }

  async translate(normalized: NormalizedExternalEvent): Promise<Result> {
    const subject = normalized.subscription?.subject ?? normalized.customer?.subject ?? normalized.subject;
    if (!subject) return { translated: false, processingResultCode: 'missing_subject_link', linkedBillingSubscriptionId: null, linkedSubjectId: null };
    const linkedSubjectId = subject.subjectId;

    if (normalized.kind === 'invoice_payment_failed') {
      const row = await this.billing.markPastDue('user', linkedSubjectId, normalized.occurredAt);
      return { translated: true, processingResultCode: 'past_due_marked', linkedBillingSubscriptionId: row.subscriptionId, linkedSubjectId };
    }
    if (normalized.kind === 'invoice_paid') {
      const s = normalized.subscription ?? (normalized.externalSubscriptionId ? await this.externalSubs.getSubscription(normalized.providerKind, normalized.externalSubscriptionId) : null);
      if (s?.currentPeriodStart && s.currentPeriodEnd) {
        const row = await this.billing.renewPaidPlan('user', linkedSubjectId, s.currentPeriodStart, s.currentPeriodEnd);
        return { translated: true, processingResultCode: 'renewed_from_invoice_paid', linkedBillingSubscriptionId: row.subscriptionId, linkedSubjectId };
      }
      return { translated: false, processingResultCode: 'invoice_paid_insufficient_data', linkedBillingSubscriptionId: null, linkedSubjectId };
    }
    if (normalized.kind === 'checkout_completed') {
      const s = normalized.externalSubscriptionId ? await this.externalSubs.getSubscription(normalized.providerKind, normalized.externalSubscriptionId) : null;
      if (s?.mappedPlanKind && s.currentPeriodStart && s.currentPeriodEnd) {
        const row = await this.billing.activatePaidPlan('user', linkedSubjectId, s.mappedPlanKind, 'monthly', s.currentPeriodStart, s.currentPeriodEnd, 'stripe_placeholder');
        return { translated: true, processingResultCode: 'checkout_activated', linkedBillingSubscriptionId: row.subscriptionId, linkedSubjectId };
      }
      return { translated: false, processingResultCode: 'checkout_sync_only_insufficient_data', linkedBillingSubscriptionId: null, linkedSubjectId };
    }
    if (['subscription_created', 'subscription_updated', 'subscription_deleted'].includes(normalized.kind)) {
      return this.fromSubscriptionEvent(normalized, linkedSubjectId);
    }
    return { translated: false, processingResultCode: normalized.kind === 'unknown' ? 'unhandled_event_kind' : `no_mutation_${normalized.kind}`, linkedBillingSubscriptionId: null, linkedSubjectId };
  }

  translatePersistedEvent(record: PersistedExternalEventRecord): Promise<Result> {
    const normalized: NormalizedExternalEvent = {
      providerKind: record.providerKind,
      externalEventId: record.externalEventId,
      kind: record.kind,
      occurredAt: record.occurredAt,
      payloadJson: record.payloadJson,
      externalCustomerId: record.externalCustomerId,
      externalSubscriptionId: record.externalSubscriptionId,
      subject: record.subjectKind === 'user' && record.subjectId ? { subjectKind: 'user', subjectId: record.subjectId } : null,
      customer: null,
      subscription: null
    };
    return this.translate(normalized);
  }
}
