import type { NormalizedMacroVintage } from '@elceo/types';
import { canonicalSourceId } from './index';

export type MacroVintageRow=NormalizedMacroVintage&{observationIdentity:string};
export type MacroVintagePool={query(sql:string,params?:unknown[]):Promise<{rows:Record<string,unknown>[]}>};

export class PostgresMacroVintageRepository {
 constructor(private readonly pool:MacroVintagePool){}
 async append(row:MacroVintageRow):Promise<'inserted'|'duplicate'>{
  const sourceId=canonicalSourceId(row.sourceId);
  const result=await this.pool.query(`INSERT INTO app_macro_evidence_vintages (observation_identity,correlation_key,country_or_area,indicator_id,reference_period,scheduled_release_at,released_at,known_at,retrieved_at,effective_at,vintage_id,previous_published_value,published_value,revision_state,canonical_source_id,source_reference,provider_request_id) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17) ON CONFLICT DO NOTHING RETURNING observation_identity`,[row.observationIdentity,row.correlationKey,row.countryOrArea,row.indicatorId,row.referencePeriod,row.scheduledReleaseAt,row.sourceReleaseAt,row.firstSeenAt,row.retrievedAt,row.effectiveAt,row.vintageId,row.previousPublishedValue,row.value,row.revisionState,sourceId,row.sourceUrl,row.retrievalRequestId]);
  return result.rows.length?'inserted':'duplicate';
 }
 async asKnownAt(correlationKey:string,knownAt:string):Promise<MacroVintageRow|null>{
  const {rows}=await this.pool.query(`SELECT observation_identity,correlation_key,country_or_area,indicator_id,reference_period,scheduled_release_at::text,released_at::text,known_at::text,retrieved_at::text,effective_at::text,vintage_id,previous_published_value,published_value,revision_state,canonical_source_id,source_reference,provider_request_id FROM app_macro_evidence_vintages WHERE correlation_key=$1 AND known_at<=$2 ORDER BY known_at DESC LIMIT 1`,[correlationKey,knownAt]);
  const r=rows[0];if(!r)return null;return{observationIdentity:String(r.observation_identity),correlationKey:String(r.correlation_key),countryOrArea:String(r.country_or_area),indicatorId:String(r.indicator_id),referencePeriod:String(r.reference_period),scheduledReleaseAt:r.scheduled_release_at?String(r.scheduled_release_at):null,sourceReleaseAt:r.released_at?String(r.released_at):null,firstSeenAt:String(r.known_at),retrievedAt:String(r.retrieved_at),effectiveAt:String(r.effective_at),vintageId:r.vintage_id?String(r.vintage_id):null,previousPublishedValue:r.previous_published_value===null?null:Number(r.previous_published_value),value:Number(r.published_value),revisionState:r.revision_state as MacroVintageRow['revisionState'],sourceUrl:String(r.source_reference),sourceId:canonicalSourceId(String(r.canonical_source_id)),retrievalRequestId:String(r.provider_request_id)};
 }
}
