import { MARKET_EVIDENCE_CLASSES } from '@elceo/types';
import { validateMarketDataProviderDescriptor, validateNormalizedBankHealthMetric, validateNormalizedBondAuctionResult, validateNormalizedCentralBankLiquidity, validateNormalizedCotPositioning, validateNormalizedCreditStressIndicator, validateNormalizedCrossMarketRatePoint, validateNormalizedCryptoMarketStructurePoint, validateNormalizedEarningsMacroPoint, validateNormalizedEnergyCommodityPoint, validateNormalizedEquityBreadthPoint, validateNormalizedFinancialConditionsPoint, validateNormalizedFuturesPositioning, validateNormalizedGeopoliticalRiskEvent, validateNormalizedLiquidityConditionPoint, validateNormalizedMacroSurprisePoint, validateNormalizedMarketEvidencePayload, validateNormalizedMarketNewsItem, validateNormalizedPositioningSentimentPoint, validateNormalizedPreciousMetalsFlowPoint, validateNormalizedPriceBar, validateNormalizedRealYieldPoint, validateNormalizedRiskSentimentPoint, validateNormalizedVolatilitySurfacePoint, validateProviderCapabilityRegistrySnapshot } from '@elceo/schemas';
import { getEvidenceClassCoverage, getProviderCapabilityRegistrySnapshot, getProviderDescriptor, listProvidersByCapability } from '../provider-sources/index.js';

export function runProviderSourcesTests(): void {
  const snap=getProviderCapabilityRegistrySnapshot('2026-01-01T00:00:00.000Z'); if(!validateProviderCapabilityRegistrySnapshot(snap).ok) throw new Error('invalid provider snapshot');
  if(validateMarketDataProviderDescriptor({}).ok) throw new Error('invalid descriptor should fail');
  const coverage=getEvidenceClassCoverage();
  if(coverage.length!==MARKET_EVIDENCE_CLASSES.length) throw new Error('evidence class coverage length mismatch');
  MARKET_EVIDENCE_CLASSES.forEach((c)=>{const row=coverage.find((x)=>x.evidenceClass===c); if(!row||(!row.providerCapabilities.length&&!row.normalizedPayloadKinds.length&&!row.placeholderOnly&&!row.explicitlyExcluded)) throw new Error(`missing coverage ${c}`);});
  if(coverage.some((x)=>x.notes.toLowerCase().includes('interbank')||x.notes.toLowerCase().includes('orderflow'))) throw new Error('interbank/orderflow should remain excluded');
  const tiingo=getProviderDescriptor('tiingo_market_data'); const tv=getProviderDescriptor('tradingview_chart_metadata'); if(!tiingo||tiingo.launchEnabled||!tv||tv.launchEnabled) throw new Error('foundation providers missing');
  ['cot_report','market_price_history','central_bank_liquidity_operation','real_yield_series','financial_conditions_index','liquidity_conditions_indicator','geopolitical_risk_event','futures_positioning_report'].forEach((c)=>{ if(listProvidersByCapability(c as never).length===0) throw new Error(`missing capability ${c}`);});
  const ids=snap.providers.map((x)=>x.providerId); if(new Set(ids).size!==ids.length) throw new Error('duplicate provider ids');
  const payload={payloadId:'p',evidenceTypeId:'e',evidenceClass:'real_yields',providerId:'fred',sourceId:null,region:'united_states',asset:null,observedAt:'2026-01-01T00:00:00.000Z',publishedAt:null,normalizedAt:'2026-01-01T00:00:00.000Z',confidenceScore:70,dataQuality:'high',valuesJson:'{}',metadataJson:'{}'};
  if(!validateNormalizedMarketEvidencePayload(payload).ok||validateNormalizedMarketEvidencePayload({...payload,confidenceScore:101}).ok) throw new Error('payload validation failed');
  const checks=[
    validateNormalizedPriceBar({asset:'xau_usd',timeframe:'1d',timestamp:payload.observedAt,open:1,high:2,low:0.5,close:1.5,volume:null,providerId:'tiingo_market_data'}),
    validateNormalizedCotPositioning({reportDate:payload.observedAt,marketName:'Euro FX',asset:'eur_usd',commercialLong:1,commercialShort:2,nonCommercialLong:3,nonCommercialShort:4,netNonCommercial:-1,openInterest:9,providerId:'cftc_cot'}),
    validateNormalizedFuturesPositioning({reportDate:payload.observedAt,marketName:'S&P',asset:'sp500',leveragedFundsLong:1,leveragedFundsShort:2,assetManagerLong:3,assetManagerShort:4,openInterest:5,providerId:'cftc_cot'}),
    validateNormalizedCentralBankLiquidity({institution:'Fed',region:'united_states',operationDate:payload.observedAt,operationType:'repo',amount:10,currency:'USD',maturityDays:null,providerId:'federal_reserve'}),
    validateNormalizedRealYieldPoint({region:'united_states',maturity:'10y',observedAt:payload.observedAt,value:1.1,providerId:'fred'}),
    validateNormalizedBondAuctionResult({issuer:'UST',region:'united_states',auctionDate:payload.observedAt,maturity:'10y',yieldAwarded:4.2,bidToCover:2.4,amountOffered:1,amountAccepted:1,providerId:'us_treasury'}),
    validateNormalizedCreditStressIndicator({region:'united_states',indicatorName:'NFCI',observedAt:payload.observedAt,value:0.4,unit:'index',providerId:'fred'}),
    validateNormalizedVolatilitySurfacePoint({asset:'sp500',observedAt:payload.observedAt,expiry:payload.observedAt,tenor:'1m',strikeDelta:25,impliedVolatility:18,providerId:'crypto_public_market_structure'}),
    validateNormalizedMacroSurprisePoint({region:'united_states',indicatorName:'CPI',observedAt:payload.observedAt,actual:3,consensus:2.9,previous:2.8,surprise:0.1,providerId:'macro_earnings_public_reports'}),
    validateNormalizedBankHealthMetric({institution:'Bank A',region:'united_states',reportDate:payload.observedAt,metricName:'CET1',value:11.2,unit:'percent',providerId:'bank_public_reports'}),
    validateNormalizedFinancialConditionsPoint({region:'united_states',observedAt:payload.observedAt,indexName:'NFCI',value:0.2,unit:'index',providerId:'calculated_internal_conditions'}),
    validateNormalizedLiquidityConditionPoint({region:'global',observedAt:payload.observedAt,indicatorName:'M2 Velocity',value:1.1,unit:'index',providerId:'calculated_internal_conditions'}),
    validateNormalizedCrossMarketRatePoint({baseAsset:'eur',quoteAsset:'usd',observedAt:payload.observedAt,value:1.09,providerId:'public_market_cross_rates'}),
    validateNormalizedEquityBreadthPoint({region:'united_states',observedAt:payload.observedAt,indexName:'SPX',advancing:300,declining:200,breadthRatio:1.5,providerId:'public_equity_breadth_sources'}),
    validateNormalizedCryptoMarketStructurePoint({asset:'btc_usd',observedAt:payload.observedAt,metricName:'open_interest',value:10,unit:'bn',providerId:'crypto_public_market_structure'}),
    validateNormalizedEnergyCommodityPoint({commodity:'wti',observedAt:payload.observedAt,price:80,currency:'USD',providerId:'energy_public_market_data'}),
    validateNormalizedPreciousMetalsFlowPoint({asset:'xau',observedAt:payload.observedAt,flowAmount:5,unit:'tonnes',providerId:'precious_metals_public_flows'}),
    validateNormalizedRiskSentimentPoint({region:'global',observedAt:payload.observedAt,indicatorName:'risk-on',score:65,providerId:'calculated_internal_conditions'}),
    validateNormalizedGeopoliticalRiskEvent({eventId:'g1',region:'global',publishedAt:payload.observedAt,severity:'high',title:'Event',providerId:'geopolitical_public_news'}),
    validateNormalizedEarningsMacroPoint({region:'united_states',observedAt:payload.observedAt,metricName:'EPS diffusion',value:0.7,unit:'index',providerId:'macro_earnings_public_reports'}),
    validateNormalizedPositioningSentimentPoint({asset:'eur_usd',observedAt:payload.observedAt,longPercent:55,shortPercent:45,netSkew:10,providerId:'calculated_internal_conditions'}),
    validateNormalizedMarketNewsItem({newsId:'n1',providerId:'news',title:'headline',url:null,publishedAt:payload.observedAt,sourceName:'wire',relatedAssets:['xau_usd'],relatedEvidenceClasses:['market_news'],sentiment:null,importanceScore:80})
  ];
  if(checks.some((x)=>x.ok===false)) throw new Error('specialized validator failed');
  if(validateNormalizedGeopoliticalRiskEvent({eventId:'g1',region:'global',publishedAt:payload.observedAt,severity:'bad',title:'Event',providerId:'geopolitical_public_news'}).ok) throw new Error('severity enum should fail');
}
