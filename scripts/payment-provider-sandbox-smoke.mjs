import { existsSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
const env = process.env;
function refuse(message){ console.error(message); process.exit(1); }
function redactRef(v){ return v ? `${String(v).slice(0,6)}…${String(v).slice(-4)}` : null; }
if (env.ELCEO_PAYMENT_SANDBOX_SMOKE !== '1') refuse('payment provider sandbox smoke refused: set ELCEO_PAYMENT_SANDBOX_SMOKE=1');
if ((env.PAYMENT_PROVIDER_MODE ?? env.ELCEO_PAYMENT_PROVIDER_MODE) === 'production_provider') refuse('production_payment_provider_blocked');
if ((env.PAYMENT_PROVIDER_MODE ?? env.ELCEO_PAYMENT_PROVIDER_MODE) !== 'sandbox_provider') refuse('sandbox execution not completed: PAYMENT_PROVIDER_MODE=sandbox_provider required');
if (env.APP_STATE_REPOSITORY !== 'sql' || !env.DATABASE_URL) refuse('sandbox execution not completed: APP_STATE_REPOSITORY=sql and DATABASE_URL required for durable local correctness smoke');
if (env.PAYMENT_PROVIDER_KIND !== 'stripe' || !env.STRIPE_SECRET_KEY || !env.STRIPE_WEBHOOK_SECRET || !(env.STRIPE_PUBLIC_KEY || env.STRIPE_PUBLISHABLE_KEY) || !env.STRIPE_PRICE_ID_PREMIUM) refuse('sandbox execution not completed: provider sandbox credentials unavailable');
if (!env.STRIPE_SECRET_KEY.startsWith('sk_test_') || !(env.STRIPE_PUBLIC_KEY || env.STRIPE_PUBLISHABLE_KEY || '').startsWith('pk_test_')) refuse('production_payment_provider_blocked');
const adapterPath = new URL('../services/application-state/dist-test-cjs/services/application-state/src/payment-providers/sandbox-adapter.cjs', import.meta.url);
const runtimePath = new URL('../services/application-state/dist-test-cjs/services/application-state/src/billing/internal-payment.cjs', import.meta.url);
if (!existsSync(adapterPath) || !existsSync(runtimePath)) execFileSync('npm', ['run','-w','services/application-state','test'], { stdio:'ignore', env:{ ...process.env, ELCEO_PAYMENT_REPLAY_SKIP_CHECKSUM_PROBE:'1' } });
const { StripeSandboxPaymentProviderAdapter, buildStripeTestSignature, parseStripeWebhookEvent, stableProviderChecksum } = await import(adapterPath);
const { InternalPaymentRuntime, createInternalPaymentRepository } = await import(runtimePath);
const repo = createInternalPaymentRepository();
const rt = new InternalPaymentRuntime('sandbox_provider', repo);
const adapter = new StripeSandboxPaymentProviderAdapter();
const subjectUserId = env.ELCEO_PAYMENT_SANDBOX_SUBJECT_ID ?? 'rc_i2_sandbox_subject';
const businessIdempotencyKey = env.ELCEO_PAYMENT_SANDBOX_INTENTION_KEY ?? `rc_i2_sandbox_intention_${env.STRIPE_PRICE_ID_PREMIUM}`;
const created = await repo.createOrReuseOperation({ subjectUserId, targetPlan:'focus_plan', amount:2000, currency:'USD', businessIdempotencyKey, provider:'stripe' });
let operation = created.operation;
const attemptsBefore = rt.providerChargeAttempts;
let providerSession = null;
if (!created.reused && !operation.providerCheckoutSessionReference && !operation.providerPaymentReference) {
  providerSession = await adapter.createCheckoutOrPaymentSession({ subjectUserId, targetPlan:'focus_plan', amount:operation.amount, currency:operation.currency, providerIdempotencyKey:operation.providerIdempotencyKey, operationId:operation.internalPaymentOperationId });
  operation = await repo.recordProviderAccepted(operation.internalPaymentOperationId, providerSession.providerPaymentReference ?? providerSession.providerSessionReference ?? operation.providerIdempotencyKey, providerSession.providerSessionReference ?? providerSession.providerPaymentReference ?? operation.providerIdempotencyKey);
  operation = await repo.transition(operation.internalPaymentOperationId, operation.version, 'processing', { lastProviderComparisonSnapshot: { providerKind:'stripe', providerSessionReference:providerSession.providerSessionReference, providerPaymentReference:providerSession.providerPaymentReference, safeRedactedPayloadChecksum:providerSession.safeRedactedPayloadChecksum }, reconciliationState:'required' }, 'sandbox smoke provider accepted');
}
const retry = await repo.createOrReuseOperation({ subjectUserId, targetPlan:'focus_plan', amount:2000, currency:'USD', businessIdempotencyKey, provider:'stripe' });
if (retry.operation.internalPaymentOperationId !== operation.internalPaymentOperationId || retry.operation.providerIdempotencyKey !== operation.providerIdempotencyKey) refuse('sandbox smoke invariant failed: idempotency key not reused');
let retrieved = null;
if (operation.providerCheckoutSessionReference) retrieved = await adapter.retrievePaymentOrSession(operation.providerCheckoutSessionReference);
const rawWebhookPayload = { id:`evt_rc_i2_sandbox_${operation.internalPaymentOperationId}`, type:'checkout.session.completed', created:Math.floor(Date.now()/1000), data:{ object:{ id:operation.providerCheckoutSessionReference, payment_intent:operation.providerPaymentReference, amount_total:operation.amount, currency:operation.currency.toLowerCase(), payment_status:'paid', metadata:{ operationId:operation.internalPaymentOperationId, providerIdempotencyKey:operation.providerIdempotencyKey, subjectUserId:operation.subjectUserId } } } };
const rawBody = JSON.stringify(rawWebhookPayload);
const signature = buildStripeTestSignature(rawBody, env.STRIPE_WEBHOOK_SECRET, String(rawWebhookPayload.created));
const normalized = parseStripeWebhookEvent(rawBody, signature, env.STRIPE_WEBHOOK_SECRET);
const firstWebhook = await rt.webhook({ eventId: normalized.providerEventId ?? normalized.safeRedactedPayloadChecksum, kind:'success', operationId: normalized.metadataOperationId ?? operation.internalPaymentOperationId, providerPaymentReference: normalized.providerPaymentReference, providerCheckoutSessionReference: normalized.providerSessionReference, payload:{ normalized } });
const countsAfterFirst = await rt.counts();
await rt.webhook({ eventId: normalized.providerEventId ?? normalized.safeRedactedPayloadChecksum, kind:'success', operationId: operation.internalPaymentOperationId, providerPaymentReference: normalized.providerPaymentReference, providerCheckoutSessionReference: normalized.providerSessionReference, payload:{ normalized } });
const countsAfterDuplicate = await rt.counts();
const reconciled = await rt.reconcile({ operationId: operation.internalPaymentOperationId });
const countsAfterReconcile = await rt.counts();
if (countsAfterFirst.ledger !== countsAfterDuplicate.ledger || countsAfterFirst.entitlements !== countsAfterDuplicate.entitlements) refuse('sandbox smoke invariant failed: duplicate webhook duplicated effects');
if (countsAfterReconcile.ledger !== countsAfterFirst.ledger || countsAfterReconcile.entitlements !== countsAfterFirst.entitlements) refuse('sandbox smoke invariant failed: reconciliation duplicated effects');
if (rt.providerChargeAttempts !== attemptsBefore) refuse('sandbox smoke invariant failed: retry created runtime provider charge attempt');
console.log(JSON.stringify({status:'sandbox_smoke_e2e_passed', providerKind:'stripe', sandboxOnly:true, productionLive:false, operationId:operation.internalPaymentOperationId, providerIdempotencyKeyChecksum:stableProviderChecksum(operation.providerIdempotencyKey), providerSessionReference:redactRef(operation.providerCheckoutSessionReference), providerPaymentReference:redactRef(operation.providerPaymentReference), retrievedStatus:retrieved?.status ?? null, webhookAccepted:firstWebhook.duplicate === false, duplicateWebhookDeduped:countsAfterFirst.ledger === countsAfterDuplicate.ledger && countsAfterFirst.entitlements === countsAfterDuplicate.entitlements, reconciliationStatus:reconciled.status, ledgerEffects:countsAfterReconcile.ledger, entitlementEffects:countsAfterReconcile.entitlements}));
