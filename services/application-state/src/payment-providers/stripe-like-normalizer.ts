import type { BillingExternalEventKind, BillingExternalProviderKind, StripeLikeWebhookEnvelope } from '@elceo/types';

type SubjectLink = { subjectKind: 'user'; subjectId: string } | null;
type NormalizedCustomerInput = { externalCustomerId: string; email: string | null; metadataJson: string; subject: SubjectLink } | null;
type NormalizedSubscriptionInput = {
  externalSubscriptionId: string;
  externalCustomerId: string;
  externalPriceId: string | null;
  externalProductId: string | null;
  providerStatus: string;
  cancelAtPeriodEnd: boolean;
  currentPeriodStart: string | null;
  currentPeriodEnd: string | null;
  trialStartsAt: string | null;
  trialEndsAt: string | null;
  metadataJson: string;
  subject: SubjectLink;
  mappedPlanKind: null;
} | null;

export type NormalizedExternalEvent = {
  providerKind: BillingExternalProviderKind;
  externalEventId: string;
  kind: BillingExternalEventKind;
  occurredAt: string;
  payloadJson: string;
  externalCustomerId: string | null;
  externalSubscriptionId: string | null;
  subject: SubjectLink;
  customer: NormalizedCustomerInput;
  subscription: NormalizedSubscriptionInput;
};

const TYPE_MAP: Record<string, BillingExternalEventKind> = {
  'customer.created': 'customer_created',
  'customer.updated': 'customer_updated',
  'customer.subscription.created': 'subscription_created',
  'customer.subscription.updated': 'subscription_updated',
  'customer.subscription.deleted': 'subscription_deleted',
  'invoice.paid': 'invoice_paid',
  'invoice.payment_failed': 'invoice_payment_failed',
  'checkout.session.completed': 'checkout_completed'
};

const asObj = (v: unknown): Record<string, unknown> => (v && typeof v === 'object' && !Array.isArray(v) ? v as Record<string, unknown> : {});
const asString = (v: unknown): string | null => (typeof v === 'string' && v.length > 0 ? v : null);
const asIso = (v: unknown): string | null => {
  if (typeof v === 'string' && !Number.isNaN(Date.parse(v))) return new Date(v).toISOString();
  if (typeof v === 'number' && Number.isFinite(v)) return new Date(v * 1000).toISOString();
  return null;
};


const firstItemPrice = (eventObject: Record<string, unknown>): Record<string, unknown> => {
  const items = asObj(eventObject.items);
  const data = items['data'];
  if (!Array.isArray(data) || data.length === 0) return {};
  const first = asObj(data[0]);
  return asObj(first.price);
};

const safeSubject = (metadata: Record<string, unknown>): SubjectLink => {
  const subjectKind = asString(metadata.subjectKind);
  const subjectId = asString(metadata.subjectId);
  if (subjectKind === 'user' && subjectId) return { subjectKind: 'user', subjectId };
  return null;
};

export const normalizeStripeLikeEnvelope = (envelope: StripeLikeWebhookEnvelope): NormalizedExternalEvent => {
  const payload = asObj(JSON.parse(envelope.dataJson));
  const eventObject = asObj(asObj(payload.data).object);
  const metadata = asObj(eventObject.metadata);
  const subject = safeSubject(metadata);
  const kind = TYPE_MAP[envelope.eventType] ?? 'unknown';
  const externalCustomerId = asString(eventObject.customer) ?? asString(eventObject.id);
  const externalSubscriptionId = asString(eventObject.subscription) ?? (envelope.eventType.startsWith('customer.subscription.') ? asString(eventObject.id) : null);
  const occurredAt = asIso(payload.created) ?? asIso(envelope.createdAt) ?? new Date(envelope.createdAt).toISOString();

  const customer: NormalizedCustomerInput = envelope.eventType.startsWith('customer.') && !envelope.eventType.startsWith('customer.subscription.') && asString(eventObject.id)
    ? { externalCustomerId: asString(eventObject.id) as string, email: asString(eventObject.email), metadataJson: JSON.stringify(metadata), subject }
    : null;

  const subMetadata = asObj(eventObject.metadata);
  const price = firstItemPrice(eventObject);
  const subscription: NormalizedSubscriptionInput = envelope.eventType.startsWith('customer.subscription.') && asString(eventObject.id) && asString(eventObject.customer)
    ? {
        externalSubscriptionId: asString(eventObject.id) as string,
        externalCustomerId: asString(eventObject.customer) as string,
        externalPriceId: asString(price.id) ?? asString(eventObject.price_id),
        externalProductId: asString(price.product) ?? null,
        providerStatus: asString(eventObject.status) ?? 'unknown',
        cancelAtPeriodEnd: eventObject.cancel_at_period_end === true,
        currentPeriodStart: asIso(eventObject.current_period_start),
        currentPeriodEnd: asIso(eventObject.current_period_end),
        trialStartsAt: asIso(eventObject.trial_start),
        trialEndsAt: asIso(eventObject.trial_end),
        metadataJson: JSON.stringify(subMetadata),
        subject: safeSubject(subMetadata),
        mappedPlanKind: null
      }
    : null;

  return {
    providerKind: envelope.providerKind,
    externalEventId: envelope.externalEventId,
    kind,
    occurredAt,
    payloadJson: JSON.stringify(payload),
    externalCustomerId,
    externalSubscriptionId,
    subject,
    customer,
    subscription
  };
};
