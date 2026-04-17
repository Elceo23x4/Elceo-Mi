import { createHmac, timingSafeEqual } from 'node:crypto';
import type { BillingCheckoutSession, BillingPortalSession, BillingWebhookEvent, SubscriptionLifecycleStatus } from '@elceo/types';
import type { PlanTier } from '@elceo/config';

type StripeSessionResponse = {
  id: string;
  url: string;
};

type StripeCustomer = {
  id: string;
};

type StripeSubscriptionPayload = {
  id: string;
  status: string;
  customer?: string;
  metadata?: Record<string, string>;
  current_period_start?: number;
  current_period_end?: number;
  cancel_at_period_end?: boolean;
  items?: {
    data?: Array<{ price?: { id?: string } }>;
  };
};

type StripeEvent = {
  id: string;
  type: string;
  created: number;
  data?: {
    object?: StripeSubscriptionPayload;
  };
};

function runtimeEnv(): Record<string, string | undefined> {
  return (globalThis as { process?: { env?: Record<string, string | undefined> } }).process?.env ?? {};
}

function toUtc(epochSeconds?: number): string | undefined {
  if (!epochSeconds) return undefined;
  return new Date(epochSeconds * 1000).toISOString();
}

function mapStripeStatus(status: string): SubscriptionLifecycleStatus {
  switch (status) {
    case 'trialing':
      return 'trialing';
    case 'active':
      return 'active';
    case 'past_due':
      return 'past_due';
    case 'canceled':
      return 'canceled';
    case 'unpaid':
      return 'past_due';
    case 'paused':
      return 'paused';
    case 'incomplete_expired':
      return 'expired';
    default:
      return 'inactive';
  }
}

function mapStripeEventType(type: string): BillingWebhookEvent['eventType'] {
  switch (type) {
    case 'customer.subscription.deleted':
      return 'subscription.canceled';
    case 'customer.subscription.created':
      return 'subscription.reactivated';
    case 'customer.subscription.updated':
      return 'subscription.updated';
    case 'invoice.payment_failed':
      return 'invoice.payment_failed';
    default:
      throw new Error(`Unsupported stripe webhook event: ${type}`);
  }
}

function parseStripeSignature(signature: string): { timestamp: string; digest: string } {
  const parts = signature.split(',').map((value) => value.trim());
  const timestamp = parts.find((part) => part.startsWith('t='))?.slice(2);
  const digest = parts.find((part) => part.startsWith('v1='))?.slice(3);

  if (!timestamp || !digest) {
    throw new Error('Invalid stripe signature header format');
  }

  return { timestamp, digest };
}

function validateSignature(payload: string, signature: string | null): void {
  const env = runtimeEnv();
  const secret = env.STRIPE_WEBHOOK_SECRET ?? env.BILLING_WEBHOOK_SECRET;
  if (!secret) {
    throw new Error('Missing webhook secret configuration');
  }
  if (!signature) {
    throw new Error('Missing webhook signature header');
  }

  const { timestamp, digest } = parseStripeSignature(signature);
  const signedPayload = `${timestamp}.${payload}`;
  const expected = createHmac('sha256', secret).update(signedPayload).digest('hex');
  const expectedBuffer = Buffer.from(expected, 'hex');
  const receivedBuffer = Buffer.from(digest, 'hex');

  if (expectedBuffer.length !== receivedBuffer.length || !timingSafeEqual(expectedBuffer, receivedBuffer)) {
    throw new Error('Invalid webhook signature');
  }
}

export interface BillingProviderAdapter {
  createCheckoutSession(input: { userId: string; email: string; targetPlan: PlanTier; successUrl: string; cancelUrl: string }): Promise<BillingCheckoutSession>;
  createPortalSession(input: { userId: string; email: string; returnUrl: string }): Promise<BillingPortalSession>;
  parseWebhook(requestBody: string, signature: string | null): Promise<BillingWebhookEvent>;
}

export class MockBillingProviderAdapter implements BillingProviderAdapter {
  async createCheckoutSession(input: {
    userId: string;
    email: string;
    targetPlan: PlanTier;
    successUrl: string;
    cancelUrl: string;
  }): Promise<BillingCheckoutSession> {
    const sessionId = `mock_chk_${input.userId}_${Date.now()}`;
    return {
      sessionId,
      provider: 'mock',
      checkoutUrl: `${input.successUrl}?session_id=${sessionId}&plan=${input.targetPlan}`
    };
  }

  async createPortalSession(input: { userId: string; email: string; returnUrl: string }): Promise<BillingPortalSession> {
    return {
      provider: 'mock',
      portalUrl: `${input.returnUrl}?portal=mock&user=${input.userId}`
    };
  }

  async parseWebhook(requestBody: string): Promise<BillingWebhookEvent> {
    return JSON.parse(requestBody) as BillingWebhookEvent;
  }
}

class StripeBillingProviderAdapter implements BillingProviderAdapter {
  private readonly secretKey: string;
  private readonly premiumPriceId: string;

  constructor(private readonly env: Record<string, string | undefined>) {
    this.secretKey = env.STRIPE_SECRET_KEY ?? '';
    this.premiumPriceId = env.STRIPE_PRICE_ID_PREMIUM ?? '';
    if (!this.secretKey) throw new Error('STRIPE_SECRET_KEY is required for stripe billing provider');
    if (!this.premiumPriceId) throw new Error('STRIPE_PRICE_ID_PREMIUM is required for stripe billing provider');
  }

  private async stripeForm<T>(path: string, body: URLSearchParams): Promise<T> {
    const response = await fetch(`https://api.stripe.com/v1/${path}`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${this.secretKey}`,
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body
    });

    if (!response.ok) {
      throw new Error(`Stripe API request failed for ${path} (${response.status})`);
    }

    return (await response.json()) as T;
  }

  private async findCustomerIdByEmail(email: string): Promise<string | null> {
    const response = await fetch(`https://api.stripe.com/v1/customers?email=${encodeURIComponent(email)}&limit=1`, {
      headers: {
        Authorization: `Bearer ${this.secretKey}`
      }
    });

    if (!response.ok) return null;
    const payload = (await response.json()) as { data?: StripeCustomer[] };
    return payload.data?.[0]?.id ?? null;
  }

  async createCheckoutSession(input: {
    userId: string;
    email: string;
    targetPlan: PlanTier;
    successUrl: string;
    cancelUrl: string;
  }): Promise<BillingCheckoutSession> {
    const body = new URLSearchParams();
    body.set('mode', 'subscription');
    body.set('success_url', input.successUrl);
    body.set('cancel_url', input.cancelUrl);
    body.set('client_reference_id', input.userId);
    body.set('customer_email', input.email);
    body.set('metadata[userId]', input.userId);
    body.set('metadata[targetPlanTier]', input.targetPlan);
    body.set('line_items[0][price]', this.premiumPriceId);
    body.set('line_items[0][quantity]', '1');

    const session = await this.stripeForm<StripeSessionResponse>('checkout/sessions', body);
    return {
      sessionId: session.id,
      provider: 'stripe',
      checkoutUrl: session.url
    };
  }

  async createPortalSession(input: { userId: string; email: string; returnUrl: string }): Promise<BillingPortalSession> {
    const customerId = await this.findCustomerIdByEmail(input.email);
    if (!customerId) {
      throw new Error('Unable to locate stripe customer for billing portal access');
    }

    const body = new URLSearchParams();
    body.set('customer', customerId);
    body.set('return_url', input.returnUrl);

    const session = await this.stripeForm<StripeSessionResponse>('billing_portal/sessions', body);
    return {
      provider: 'stripe',
      portalUrl: session.url
    };
  }

  async parseWebhook(requestBody: string, signature: string | null): Promise<BillingWebhookEvent> {
    validateSignature(requestBody, signature);
    const event = JSON.parse(requestBody) as StripeEvent;
    const object = event.data?.object;

    if (!event.id || !event.type || !object?.id) {
      throw new Error('Invalid stripe webhook payload');
    }

    const userId = object.metadata?.userId;
    if (!userId) {
      throw new Error('Missing userId metadata on stripe subscription webhook');
    }

    const priceId = object.items?.data?.[0]?.price?.id;
    const targetPlanTier: PlanTier = priceId === this.premiumPriceId ? 'premium' : 'free';

    const payload: BillingWebhookEvent['payload'] = {
      userId,
      externalSubscriptionId: object.id,
      status: mapStripeStatus(object.status),
      targetPlanTier,
      cancelAtPeriodEnd: Boolean(object.cancel_at_period_end)
    };

    if (object.customer) payload.externalCustomerId = object.customer;
    const periodStart = toUtc(object.current_period_start);
    if (periodStart) payload.currentPeriodStartUtc = periodStart;
    const periodEnd = toUtc(object.current_period_end);
    if (periodEnd) payload.currentPeriodEndUtc = periodEnd;

    return {
      eventId: event.id,
      provider: 'stripe',
      eventType: mapStripeEventType(event.type),
      occurredAtUtc: toUtc(event.created) ?? new Date().toISOString(),
      payload
    };
  }
}

export function getBillingProviderAdapter(): BillingProviderAdapter {
  const env = runtimeEnv();
  return env.BILLING_PROVIDER === 'stripe' ? new StripeBillingProviderAdapter(env) : new MockBillingProviderAdapter();
}
