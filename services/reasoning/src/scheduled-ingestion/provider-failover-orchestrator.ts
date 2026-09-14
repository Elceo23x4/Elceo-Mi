import type { ScheduledIngestionRunReport, TradingAssetCoverage } from '@elceo/types';
import { ScheduledIngestionService } from './scheduled-ingestion-service';

const TIINGO_FINNHUB_ASSETS=new Set<TradingAssetCoverage>(['eur_usd','gbp_usd','usd_jpy','usd_chf','aud_usd','nzd_usd','usd_cad','btc_usd']);
/** Only availability/transient failures may cross provider boundaries. Contract, auth, schema and provenance errors must surface. */
const MARKET_FALLBACK_ELIGIBLE=new Set([
 'tiingo_timeout','tiingo_fetch_error','provider_5xx','rate_limited','provider_rate_exhausted','provider_circuit_open','circuit_open','provider_probe_unavailable','provider_singleflight_ownership_lost'
]);
const NEWS_FALLBACK_ELIGIBLE=new Set([
 'marketaux_timeout','marketaux_fetch_error','provider_5xx','rate_limited','provider_rate_exhausted','provider_circuit_open','circuit_open','provider_probe_unavailable','provider_singleflight_ownership_lost'
]);

export type SequentialFailoverReport={
 requestedAt:string;
 primarySourceId:string;
 fallbackSourceId:string|null;
 selectedSourceId:string|null;
 fallbackUsed:boolean;
 fallbackReason:string|null;
 primary:ScheduledIngestionRunReport;
 fallback:ScheduledIngestionRunReport|null;
 pass:boolean;
};

export class ProviderFailoverOrchestrator{
 constructor(private readonly scheduled:ScheduledIngestionService){}

 async runMarketPrice(asset:TradingAssetCoverage,requestedAt:string):Promise<SequentialFailoverReport>{
  if(!TIINGO_FINNHUB_ASSETS.has(asset))throw new Error(`market_fallback_not_supported:${asset}`);
  const primaryJob=`sched-tiingo_market_data-market_price_history-${asset}`;
  const fallbackJob=`sched-finnhub_market_data-market_price_history-${asset}`;
  return this.executeSequential(primaryJob,fallbackJob,'tiingo_market_data','finnhub_market_data',requestedAt,MARKET_FALLBACK_ELIGIBLE);
 }

 async runFinancialNews(requestedAt:string):Promise<SequentialFailoverReport>{
  return this.executeSequential('sched-marketaux_news-market_news_feed','sched-gdelt_news-market_news_feed','marketaux_news','gdelt_news',requestedAt,NEWS_FALLBACK_ELIGIBLE);
 }

 private async executeSequential(primaryJob:string,fallbackJob:string,primarySourceId:string,fallbackSourceId:string,requestedAt:string,eligible:Set<string>):Promise<SequentialFailoverReport>{
  const primary=await this.scheduled.runScheduledIngestionJob(primaryJob,'staging_live',requestedAt);
  if(primary.run.status==='succeeded')return{requestedAt,primarySourceId,fallbackSourceId,selectedSourceId:primarySourceId,fallbackUsed:false,fallbackReason:null,primary,fallback:null,pass:true};
  const reason=primary.run.errorCode??primary.run.errorMessage??'unknown_primary_failure';
  if(!eligible.has(reason))return{requestedAt,primarySourceId,fallbackSourceId,selectedSourceId:null,fallbackUsed:false,fallbackReason:`ineligible:${reason}`,primary,fallback:null,pass:false};
  const fallback=await this.scheduled.runScheduledIngestionJob(fallbackJob,'staging_live',requestedAt);
  const pass=fallback.run.status==='succeeded';
  return{requestedAt,primarySourceId,fallbackSourceId,selectedSourceId:pass?fallbackSourceId:null,fallbackUsed:true,fallbackReason:reason,primary,fallback,pass};
 }
}

export const isTiingoFinnhubFallbackAsset=(asset:TradingAssetCoverage)=>TIINGO_FINNHUB_ASSETS.has(asset);
export const isMarketFallbackEligibleError=(reason:string)=>MARKET_FALLBACK_ELIGIBLE.has(reason);
export const isNewsFallbackEligibleError=(reason:string)=>NEWS_FALLBACK_ELIGIBLE.has(reason);
