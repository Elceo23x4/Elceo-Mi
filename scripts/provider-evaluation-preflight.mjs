const NORMAL_LIVE_SWITCHES = ['ELCEO_LIVE_PROVIDER_ACTIVATION', 'ELCEO_ALLOW_LIVE_FETCHES', 'TIINGO_LIVE_ENABLED'];

/** Pure, fail-closed preflight. It performs no I/O and creates no provider material. */
export function evaluateProviderStagingSmokePreflight(env) {
  if (env.APP_ENV !== 'staging') return { ok: false, reason: 'APP_ENV_must_be_staging' };
  if (env.NODE_ENV !== 'production') return { ok: false, reason: 'NODE_ENV_must_be_production' };
  if (env.ELCEO_PROVIDER_MODE !== 'fixture') return { ok: false, reason: 'normal_provider_mode_must_be_fixture' };
  for (const key of NORMAL_LIVE_SWITCHES) if (env[key] !== 'false') return { ok: false, reason: `${key}_must_be_false` };
  if (env.ELCEO_PROVIDER_STAGING_SMOKE !== '1') return { ok: false, reason: 'operator_opt_in_required' };
  if (env.ELCEO_PROVIDER_EVALUATION_MODE !== 'evaluation_no_store') return { ok: false, reason: 'evaluation_no_store_required' };
  if (env.ELCEO_PROVIDER_ACTIVATION_MODE === 'production_live_allowed') return { ok: false, reason: 'production_activation_not_approved' };
  if (!env.REDIS_URL) return { ok: false, reason: 'REDIS_URL_required' };
  if (!env.TIINGO_API_KEY) return { ok: false, reason: 'TIINGO_API_KEY_required' };
  const provider = env.ELCEO_PROVIDER_SOURCE_ID ?? 'tiingo_market_data';
  const capability = env.ELCEO_PROVIDER_CAPABILITY_ID ?? 'market_price_history';
  const asset = env.ELCEO_PROVIDER_ASSET ?? 'eur_usd';
  const frequency = env.ELCEO_PROVIDER_FREQUENCY ?? 'daily';
  if (provider !== 'tiingo_market_data') return { ok: false, reason: 'provider_not_allowlisted' };
  if (capability !== 'market_price_history') return { ok: false, reason: 'capability_not_allowlisted' };
  if (asset !== 'eur_usd') return { ok: false, reason: 'asset_not_allowlisted' };
  if (frequency !== 'daily') return { ok: false, reason: 'frequency_not_allowlisted' };
  return { ok: true, provider, capability, asset, frequency };
}
