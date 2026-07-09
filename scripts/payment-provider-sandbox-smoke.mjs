const env = process.env;
function refuse(message){ console.error(message); process.exit(1); }
if (env.ELCEO_PAYMENT_SANDBOX_SMOKE !== '1') refuse('payment provider sandbox smoke refused: set ELCEO_PAYMENT_SANDBOX_SMOKE=1');
if ((env.PAYMENT_PROVIDER_MODE ?? env.ELCEO_PAYMENT_PROVIDER_MODE) === 'production_provider') refuse('production_payment_provider_blocked');
if (env.APP_STATE_REPOSITORY !== 'sql' || !env.DATABASE_URL) refuse('sandbox execution not completed: APP_STATE_REPOSITORY=sql and DATABASE_URL required for durable local correctness smoke');
if (env.PAYMENT_PROVIDER_KIND !== 'stripe' || !env.STRIPE_SECRET_KEY || !env.STRIPE_WEBHOOK_SECRET || !(env.STRIPE_PUBLIC_KEY || env.STRIPE_PUBLISHABLE_KEY) || !env.STRIPE_PRICE_ID_PREMIUM) refuse('sandbox execution not completed: provider sandbox credentials unavailable');
if (!env.STRIPE_SECRET_KEY.startsWith('sk_test_') || (env.STRIPE_PUBLIC_KEY||env.STRIPE_PUBLISHABLE_KEY||'').startsWith('pk_live_')) refuse('production_payment_provider_blocked');
const { StripeSandboxPaymentProviderAdapter } = await import('../services/application-state/src/payment-providers/sandbox-adapter.ts').catch(() => ({ StripeSandboxPaymentProviderAdapter: null }));
if (!StripeSandboxPaymentProviderAdapter) refuse('sandbox execution not completed: build runtime unavailable for TypeScript adapter import');
console.log(JSON.stringify({status:'sandbox_smoke_ready_credentials_present_not_logged', providerKind:'stripe', sandboxOnly:true, productionLive:false, note:'run under compiled application runtime to create session, verify webhook, reconcile, and prove exactly-once effects'}));
