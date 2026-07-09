if (process.env.ELCEO_PROVIDER_STAGING_SMOKE !== '1') {
  console.error('provider staging smoke refused: set ELCEO_PROVIDER_STAGING_SMOKE=1');
  process.exit(2);
}
if (process.env.ELCEO_PROVIDER_ACTIVATION_MODE === 'production_live_allowed') {
  console.error('provider staging smoke refused: production activation is not approved');
  process.exit(2);
}
const provider = process.env.ELCEO_PROVIDER_SOURCE_ID ?? 'tiingo_market_data';
const secretName = provider === 'fred' ? 'FRED_API_KEY' : provider === 'tiingo_market_data' ? 'TIINGO_API_KEY' : null;
if (secretName && !process.env[secretName]) {
  console.error(`provider staging smoke not executed: credentials unavailable for ${provider}`);
  process.exit(3);
}
console.log(`provider staging smoke gate-ready provider=${provider} path=Provider API Gate secret=${secretName ? '[REDACTED]' : 'not_required'}`);
