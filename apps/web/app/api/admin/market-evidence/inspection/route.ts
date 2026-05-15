import { jsonSuccess, withApiErrorBoundary } from '@/lib/server/api';
import { requireFeatureAccess } from '@/lib/server/access';
import { requireInternalRouteAccess } from '@/lib/server/auth';
import { getMarketIntelligenceRuntime } from '@/lib/server/composition';

export const GET = withApiErrorBoundary(async (request: Request) => {
  requireInternalRouteAccess(request);
  const access = await requireFeatureAccess('admin.read', { request });
  if (!access.ok) return access.response;

  const params = new URL(request.url).searchParams;
  const section = params.get('section');
  const asset = params.get('asset');
  const validSections = ['full', 'provider_registry', 'launch_asset_fixtures', 'official_macro', 'news_extraction_filings', 'crypto_risk_liquidity', 'golden_scenarios', 'cognition_calibration', 'scheduled_ingestion'] as const;
  const validAssets = ['xau_usd', 'eur_usd', 'gbp_usd', 'usd_jpy', 'usd_chf', 'aud_usd', 'nzd_usd', 'usd_cad', 'btc_usd', 'nasdaq_100', 'sp500', 'de30'] as const;
  if (section !== null && !validSections.includes(section as typeof validSections[number])) throw new Error('validation_error:section is invalid');
  if (asset !== null && !validAssets.includes(asset as typeof validAssets[number])) throw new Error('validation_error:asset is invalid');
  const query = { section: (section ?? 'full') as typeof validSections[number], asset: (asset ?? null) as typeof validAssets[number] | null };
  const snapshot = await getMarketIntelligenceRuntime().getMarketEvidenceOperatorInspectionSnapshot(query);
  return jsonSuccess({ snapshot });
});
