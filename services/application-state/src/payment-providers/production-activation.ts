export type ProductionPaymentProvider='stripe'|'korapay';
export function assertProductionPaymentActivation(e:Record<string,string|undefined>,provider:ProductionPaymentProvider){
 if(e.APP_ENV!=='production'||e.PAYMENT_PROVIDER_MODE!=='production_provider'||e.ELCEO_PAYMENT_PRODUCTION_LIVE_ENABLED!=='1')throw new Error('production_payment_provider_blocked');
 if(e.APP_STATE_REPOSITORY!=='sql'||!e.DATABASE_URL)throw new Error('payment_persistence_unavailable');
 let base:URL;try{base=new URL(e.NEXT_PUBLIC_APP_BASE_URL??'')}catch{throw new Error('production_payment_secure_base_url_required')};if(base.protocol!=='https:')throw new Error('production_payment_secure_base_url_required');
 if(e.ELCEO_PAYMENT_SANDBOX_SMOKE==='1'||e.ELCEO_PAYMENT_FAKE_OUTCOMES_ENABLED==='1')throw new Error('production_payment_test_mode_conflict');
 if(e.PAYMENT_PROVIDER_KIND!==provider)throw new Error('production_payment_provider_selection_required');
 if(provider==='stripe'&&(!(e.STRIPE_SECRET_KEY??'').startsWith('sk_live_')||!e.STRIPE_WEBHOOK_SECRET||!e.STRIPE_PRODUCT_ID_FOCUS_PLAN))throw new Error('production_stripe_configuration_required');
 if(provider==='korapay'&&(!e.KORAPAY_SECRET_KEY||e.KORAPAY_KEY_ENVIRONMENT!=='live'))throw new Error('production_korapay_configuration_required');
 return {provider,baseUrl:base.toString(),live:true as const};
}
