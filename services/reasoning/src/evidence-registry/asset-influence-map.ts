import type { MarketEvidenceAssetInfluence, TradingAssetCoverage } from '@elceo/types';
export const ASSET_INFLUENCES: MarketEvidenceAssetInfluence[] = [
{asset:'xau_usd',evidenceTypeId:'real_yields_curve',influenceDirection:'bearish',influenceStrength:'high',influenceHorizon:'swing',rationale:'Higher real yields pressure gold.',primaryCountries:['United States'],primaryInstitutions:['Federal Reserve']},
{asset:'eur_usd',evidenceTypeId:'macro_calendar',influenceDirection:'two_sided',influenceStrength:'medium',influenceHorizon:'intraday',rationale:'Macro releases drive FX volatility.',primaryCountries:['United States','Euro Area'],primaryInstitutions:['Federal Reserve','ECB']},
{asset:'usd_jpy',evidenceTypeId:'central_bank_liquidity_ops',influenceDirection:'contextual',influenceStrength:'medium',influenceHorizon:'position',rationale:'Policy divergence influences USDJPY.',primaryCountries:['United States','Japan'],primaryInstitutions:['Federal Reserve','BoJ']},
{asset:'btc_usd',evidenceTypeId:'risk_sentiment',influenceDirection:'two_sided',influenceStrength:'medium',influenceHorizon:'swing',rationale:'Risk-on/off sentiment impacts BTC.',primaryCountries:['Global'],primaryInstitutions:['Multi-market']},
{asset:'nasdaq_100',evidenceTypeId:'credit_stress_index',influenceDirection:'bearish',influenceStrength:'high',influenceHorizon:'regime',rationale:'Tighter credit conditions weigh on growth equities.',primaryCountries:['United States'],primaryInstitutions:['Federal Reserve']}
];
export function getAssetInfluenceMatrix(asset: TradingAssetCoverage): MarketEvidenceAssetInfluence[] { return ASSET_INFLUENCES.filter((x)=>x.asset===asset); }
