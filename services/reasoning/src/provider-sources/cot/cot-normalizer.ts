import type { NormalizedMarketEvidencePayload } from '@elceo/types';
import { buildMetadataJson, buildNormalizedPayloadId, buildValuesJson, clampConfidenceScore } from '../normalization-helpers';
import type { CotFixtureRequest, CotReportRow } from './cot-contracts';

export const COT_PROVIDER_ID='cftc_cot';
export function mapAssetToCotMarket(asset:string|null):string { const m:Record<string,string>={xau_usd:'Gold',eur_usd:'Euro FX',gbp_usd:'British Pound',usd_jpy:'Japanese Yen',btc_usd:'Bitcoin',nasdaq_100:'Nasdaq 100',sp500:'S&P 500'}; return asset? (m[asset]??asset):'Unknown'; }
export function deriveNetNonCommercial(row:CotReportRow):number|null { return row.nonCommercialLong!==null && row.nonCommercialShort!==null ? row.nonCommercialLong-row.nonCommercialShort : null; }
export function derivePositioningSentiment(row:CotReportRow):'bullish'|'bearish'|'neutral'|'mixed' { const n=deriveNetNonCommercial(row); if(n!==null){ if(n>0) return 'bullish'; if(n<0) return 'bearish'; return 'neutral'; } if(row.leveragedFundsLong!==null&&row.leveragedFundsShort!==null){ if(row.leveragedFundsLong>row.leveragedFundsShort) return 'bullish'; if(row.leveragedFundsLong<row.leveragedFundsShort) return 'bearish'; } return 'mixed'; }

export function buildCotPositioningPayload(request:CotFixtureRequest,row:CotReportRow,providerId=COT_PROVIDER_ID):NormalizedMarketEvidencePayload {
  if(!Number.isFinite(row.openInterest)||row.openInterest<0) throw new Error('cot_invalid_open_interest');
  const nums=[row.commercialLong,row.commercialShort,row.nonCommercialLong,row.nonCommercialShort,row.nonCommercialSpreading,row.dealerLong,row.dealerShort,row.assetManagerLong,row.assetManagerShort,row.leveragedFundsLong,row.leveragedFundsShort,row.otherReportablesLong,row.otherReportablesShort];
  if(nums.some((x)=>x!==null&&!Number.isFinite(x))) throw new Error('cot_invalid_numeric_field');
  const netNonCommercial=deriveNetNonCommercial(row);
  const partial = row.nonCommercialLong===null || row.nonCommercialShort===null;
  const evidenceClass = request.reportKind==='legacy_futures_only' ? 'cot_positioning' : 'futures_positioning';
  return { payloadId: buildNormalizedPayloadId(providerId,'cot_positioning',new Date(row.reportDate).toISOString(),row.asset), evidenceTypeId:'cot_positioning', evidenceClass, providerId, sourceId: row.cftcMarketCode ?? row.marketName, region: request.region ?? 'united_states', asset: row.asset, observedAt:new Date(row.reportDate).toISOString(), publishedAt:null, normalizedAt: request.requestedAt, confidenceScore: clampConfidenceScore(partial?68:92), dataQuality: partial ? (row.leveragedFundsLong!==null||row.assetManagerLong!==null?'partial':'medium') : 'high', valuesJson: buildValuesJson({oi:row.openInterest,cl:row.commercialLong,cs:row.commercialShort,ncl:row.nonCommercialLong,ncs:row.nonCommercialShort,nsp:row.nonCommercialSpreading,dl:row.dealerLong,ds:row.dealerShort,aml:row.assetManagerLong,ams:row.assetManagerShort,lfl:row.leveragedFundsLong,lfs:row.leveragedFundsShort,orl:row.otherReportablesLong,ors:row.otherReportablesShort,nnc:netNonCommercial}), metadataJson: buildMetadataJson({reportKind:request.reportKind,cftcMarketCode:row.cftcMarketCode,exchangeName:row.exchangeName,derivedSentiment:derivePositioningSentiment(row),sourceMapping:mapAssetToCotMarket(row.asset),partialNonCommercial:partial})};
}

export function normalizeCotRows(request:CotFixtureRequest,rows:CotReportRow[],providerId=COT_PROVIDER_ID):NormalizedMarketEvidencePayload[]{ return rows.map((r)=>buildCotPositioningPayload(request,r,providerId)); }
