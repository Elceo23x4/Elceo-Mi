import { LAUNCH_ASSET_SYMBOLS, type CanonicalAssetSymbol } from './events';
import type { TradingAssetCoverage } from './market-evidence';

type LaunchAssetSymbol = (typeof LAUNCH_ASSET_SYMBOLS)[number];

/** One conversion authority between launch display symbols and cognition coverage identifiers. */
export const CANONICAL_DASHBOARD_COGNITION_ASSET: Readonly<Record<LaunchAssetSymbol, TradingAssetCoverage>> = {
  'XAU/USD': 'xau_usd',
  'Nasdaq 100': 'nasdaq_100',
  'S&P 500': 'sp500',
  DE30: 'de30',
  'BTC/USD': 'btc_usd',
  'EUR/USD': 'eur_usd',
  'GBP/USD': 'gbp_usd',
  'USD/JPY': 'usd_jpy',
  'USD/CHF': 'usd_chf',
  'AUD/USD': 'aud_usd',
  'NZD/USD': 'nzd_usd',
  'USD/CAD': 'usd_cad'
};

export const cognitionAssetForCanonicalDashboardAsset = (asset: CanonicalAssetSymbol): TradingAssetCoverage => {
  const cognitionAsset = CANONICAL_DASHBOARD_COGNITION_ASSET[asset as LaunchAssetSymbol];
  if (!cognitionAsset) throw new Error(`unsupported canonical dashboard asset: ${asset}`);
  return cognitionAsset;
};

export const canonicalDashboardAssetForCognitionAsset = (asset: TradingAssetCoverage): LaunchAssetSymbol => {
  const match = Object.entries(CANONICAL_DASHBOARD_COGNITION_ASSET).find(([, cognitionAsset]) => cognitionAsset === asset);
  if (!match) throw new Error(`unsupported dashboard cognition asset: ${asset}`);
  return match[0] as LaunchAssetSymbol;
};
