import type { CanonicalAssetSymbol } from '@elceo/types';

export type AssetClass = 'commodity' | 'crypto' | 'index' | 'fx' | 'other';

export type AssetContext = {
  assetClass: AssetClass;
  baseCurrency: string | null;
  quoteCurrency: string | null;
  primaryRegions: string[];
  macroSensitive: boolean;
  riskSensitive: boolean;
  newsSensitive: boolean;
  geopoliticsSensitive: boolean;
  geopoliticsWeight: 'normal' | 'reduced';
};

const FALLBACK_ASSET_CONTEXT: AssetContext = {
  assetClass: 'other',
  baseCurrency: null,
  quoteCurrency: null,
  primaryRegions: ['GLOBAL'],
  macroSensitive: true,
  riskSensitive: true,
  newsSensitive: true,
  geopoliticsSensitive: true,
  geopoliticsWeight: 'normal'
};

const ASSET_CONTEXT_LOOKUP: Record<string, AssetContext> = {
  'XAU/USD': {
    assetClass: 'commodity',
    baseCurrency: 'XAU',
    quoteCurrency: 'USD',
    primaryRegions: ['GLOBAL', 'US'],
    macroSensitive: true,
    riskSensitive: true,
    newsSensitive: true,
    geopoliticsSensitive: true,
    geopoliticsWeight: 'normal'
  },
  'BTC/USD': {
    assetClass: 'crypto',
    baseCurrency: 'BTC',
    quoteCurrency: 'USD',
    primaryRegions: ['GLOBAL', 'US'],
    macroSensitive: true,
    riskSensitive: true,
    newsSensitive: true,
    geopoliticsSensitive: true,
    geopoliticsWeight: 'reduced'
  },
  'Nasdaq 100': {
    assetClass: 'index',
    baseCurrency: null,
    quoteCurrency: 'USD',
    primaryRegions: ['US', 'GLOBAL'],
    macroSensitive: true,
    riskSensitive: true,
    newsSensitive: true,
    geopoliticsSensitive: true,
    geopoliticsWeight: 'normal'
  },
  'S&P 500': {
    assetClass: 'index',
    baseCurrency: null,
    quoteCurrency: 'USD',
    primaryRegions: ['US', 'GLOBAL'],
    macroSensitive: true,
    riskSensitive: true,
    newsSensitive: true,
    geopoliticsSensitive: true,
    geopoliticsWeight: 'normal'
  },
  DE30: {
    assetClass: 'index',
    baseCurrency: null,
    quoteCurrency: null,
    primaryRegions: ['EU', 'DE', 'GLOBAL'],
    macroSensitive: true,
    riskSensitive: true,
    newsSensitive: true,
    geopoliticsSensitive: true,
    geopoliticsWeight: 'normal'
  },
  'EUR/USD': {
    assetClass: 'fx',
    baseCurrency: 'EUR',
    quoteCurrency: 'USD',
    primaryRegions: ['EU', 'EZ', 'US', 'GLOBAL'],
    macroSensitive: true,
    riskSensitive: true,
    newsSensitive: true,
    geopoliticsSensitive: true,
    geopoliticsWeight: 'normal'
  },
  'GBP/USD': {
    assetClass: 'fx',
    baseCurrency: 'GBP',
    quoteCurrency: 'USD',
    primaryRegions: ['UK', 'US', 'GLOBAL'],
    macroSensitive: true,
    riskSensitive: true,
    newsSensitive: true,
    geopoliticsSensitive: true,
    geopoliticsWeight: 'normal'
  },
  'USD/JPY': {
    assetClass: 'fx',
    baseCurrency: 'USD',
    quoteCurrency: 'JPY',
    primaryRegions: ['US', 'JP', 'GLOBAL'],
    macroSensitive: true,
    riskSensitive: true,
    newsSensitive: true,
    geopoliticsSensitive: true,
    geopoliticsWeight: 'normal'
  },
  'USD/CHF': {
    assetClass: 'fx',
    baseCurrency: 'USD',
    quoteCurrency: 'CHF',
    primaryRegions: ['US', 'CH', 'GLOBAL'],
    macroSensitive: true,
    riskSensitive: true,
    newsSensitive: true,
    geopoliticsSensitive: true,
    geopoliticsWeight: 'normal'
  },
  'AUD/USD': {
    assetClass: 'fx',
    baseCurrency: 'AUD',
    quoteCurrency: 'USD',
    primaryRegions: ['AU', 'CN', 'US', 'GLOBAL'],
    macroSensitive: true,
    riskSensitive: true,
    newsSensitive: true,
    geopoliticsSensitive: true,
    geopoliticsWeight: 'normal'
  },
  'NZD/USD': {
    assetClass: 'fx',
    baseCurrency: 'NZD',
    quoteCurrency: 'USD',
    primaryRegions: ['NZ', 'CN', 'US', 'GLOBAL'],
    macroSensitive: true,
    riskSensitive: true,
    newsSensitive: true,
    geopoliticsSensitive: true,
    geopoliticsWeight: 'normal'
  },
  'USD/CAD': {
    assetClass: 'fx',
    baseCurrency: 'USD',
    quoteCurrency: 'CAD',
    primaryRegions: ['US', 'CA', 'OIL', 'GLOBAL'],
    macroSensitive: true,
    riskSensitive: true,
    newsSensitive: true,
    geopoliticsSensitive: true,
    geopoliticsWeight: 'normal'
  }
};

export function getAssetContext(asset: CanonicalAssetSymbol): AssetContext {
  return ASSET_CONTEXT_LOOKUP[asset] ?? FALLBACK_ASSET_CONTEXT;
}
