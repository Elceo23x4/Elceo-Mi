import type {
  NormalizedMacroVintage,
  NormalizedMarketEvidencePayload,
  ProviderSourceRequest,
  ProviderSourceResponse,
} from '@elceo/types';
import type { MacroVintageProjectionSink } from '../provider-sources/ingestion-persistence-service';
import type { MacroVintageRow } from './macro-vintage-repository';
import { PostgresMacroVintageRepository } from './macro-vintage-repository';

const TRUSTED_PROJECTIONS = new Set([
  'fred:real_yield_series:fred_macro',
  'fred:financial_conditions_index:fred_macro',
  'ecb_public:policy_rate_series:ecb_official',
  'us_treasury:nominal_yield_series:us_treasury_official',
  'us_treasury:real_yield_series:us_treasury_official',
  'bls_payrolls:labor_market_indicator:bls_official',
  'census_housing:macro_indicator_series:census_official',
  'ism_manufacturing_pmi:macro_indicator_series:ism_official',
  'ism_services_pmi:macro_indicator_series:ism_official',
  'oecd_consumer_confidence:macro_indicator_series:oecd_official',
  'oecd_business_confidence:macro_indicator_series:oecd_official',
  'oecd_monetary:macro_indicator_series:oecd_official',
  'oecd_bop:macro_indicator_series:oecd_official',
  'oecd_ppp:macro_indicator_series:oecd_official',
  'bis_credit:macro_indicator_series:bis_official',
  'bis_housing:macro_indicator_series:bis_official',
  'bis_reer:macro_indicator_series:bis_official',
]);

const STRUCTURAL_SOURCES = new Set(['bls_official','census_official','ism_official','oecd_official','bis_official']);

type ProjectionInput = {
  request: ProviderSourceRequest;
  response: ProviderSourceResponse;
  payload: NormalizedMarketEvidencePayload;
};

export class OfficialMacroVintageProjectionSink implements MacroVintageProjectionSink {
  constructor(private readonly repository: PostgresMacroVintageRepository) {}

  async persistProjection(input: ProjectionInput): Promise<'inserted' | 'duplicate' | 'not_applicable'> {
    const row = projectOfficialMacroVintage(input);
    if (!row) return 'not_applicable';
    return this.repository.append(row);
  }
}

export function projectOfficialMacroVintage(input: ProjectionInput): MacroVintageRow | null {
  const { request, response, payload } = input;
  if (!payload.sourceId) return null;

  const trustKey = `${request.providerId}:${request.capability}:${payload.sourceId}`;
  if (!TRUSTED_PROJECTIONS.has(trustKey)) return null;
  if (response.requestId !== request.requestId || payload.providerId === '') {
    throw new Error('macro_vintage_request_provenance_mismatch');
  }
  if (!response.sourceUrl) throw new Error('macro_vintage_source_reference_missing');

  const values = parseRecord(payload.valuesJson, 'macro_vintage_values_invalid');
  const metadata = parseRecord(payload.metadataJson, 'macro_vintage_metadata_invalid');
  if (metadata.requestId !== request.requestId) throw new Error('macro_vintage_metadata_request_mismatch');
  if (metadata.sourceUrl !== response.sourceUrl) throw new Error('macro_vintage_metadata_source_mismatch');

  const knownAt = requireIso(response.fetchedAt, 'macro_vintage_fetched_at_invalid');
  const effectiveAt = requireIso(payload.observedAt, 'macro_vintage_observed_at_invalid');
  const projection = projectionIdentity(request, payload, values, metadata);
  const correlationKey = `${payload.sourceId}:${projection.indicatorId}:${projection.referencePeriod}`;

  const vintage: NormalizedMacroVintage = {
    correlationKey,
    countryOrArea: payload.region,
    indicatorId: projection.indicatorId,
    referencePeriod: projection.referencePeriod,
    scheduledReleaseAt: null,
    sourceReleaseAt: null,
    firstSeenAt: knownAt,
    retrievedAt: knownAt,
    effectiveAt,
    vintageId: projection.vintageId,
    previousPublishedValue: projection.previousPublishedValue,
    value: projection.value,
    revisionState: 'observed',
    sourceUrl: response.sourceUrl,
    sourceId: payload.sourceId as NormalizedMacroVintage['sourceId'],
    retrievalRequestId: request.requestId,
  };

  return { ...vintage, observationIdentity: correlationKey };
}

function projectionIdentity(
  request: ProviderSourceRequest,
  payload: NormalizedMarketEvidencePayload,
  values: Record<string, unknown>,
  metadata: Record<string, unknown>,
): { indicatorId: string; referencePeriod: string; value: number; vintageId: string | null; previousPublishedValue:number|null } {
  if (payload.sourceId === 'fred_macro') {
    const params = parseRecord(request.paramsJson, 'macro_vintage_request_params_invalid');
    const seriesId = requireString(params.seriesId, 'macro_vintage_fred_series_missing');
    const referencePeriod = requireDate(values.date, 'macro_vintage_fred_date_missing');
    const vintageId = typeof values.realtimeStart === 'string' && values.realtimeStart.length > 0 ? values.realtimeStart : null;
    return { indicatorId: seriesId, referencePeriod, value: requireNumber(values.value), vintageId, previousPublishedValue:null };
  }

  if (payload.sourceId === 'ecb_official') {
    return {
      indicatorId: requireString(values.seriesKey, 'macro_vintage_ecb_series_missing'),
      referencePeriod: requirePeriod(values.timePeriod, 'macro_vintage_ecb_period_missing'),
      value: requireNumber(values.value),
      vintageId: null,
      previousPublishedValue:null,
    };
  }

  if (payload.sourceId === 'us_treasury_official') {
    const dataset = requireString(values.dataset, 'macro_vintage_treasury_dataset_missing');
    const field = requireString(values.field, 'macro_vintage_treasury_field_missing');
    return {
      indicatorId: `${dataset}:${field}`,
      referencePeriod: requireDate(values.date, 'macro_vintage_treasury_date_missing'),
      value: requireNumber(values.value),
      vintageId: null,
      previousPublishedValue:null,
    };
  }

  if (STRUCTURAL_SOURCES.has(String(payload.sourceId))) {
    const family=requireString(metadata.indicatorFamily,'macro_vintage_structural_family_missing');
    const detail=[metadata.measure,metadata.accountingEntry,metadata.flowOrStock,metadata.type,metadata.basket,values.indicator]
      .filter((value):value is string=>typeof value==='string'&&value.trim().length>0)
      .map(value=>value.trim())
      .filter((value,index,array)=>array.indexOf(value)===index)
      .join(':');
    const period=requirePeriod(values.date,'macro_vintage_structural_period_missing');
    const previous=values.previous===null||values.previous===undefined?null:requireNumber(values.previous);
    return{
      indicatorId:detail?`${family}:${detail}`:family,
      referencePeriod:period,
      value:requireNumber(values.value),
      vintageId:null,
      previousPublishedValue:previous,
    };
  }

  throw new Error('macro_vintage_unreachable_projection');
}

function parseRecord(raw: string, errorCode: string): Record<string, unknown> {
  let value: unknown;
  try {
    value = JSON.parse(raw);
  } catch {
    throw new Error(errorCode);
  }
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error(errorCode);
  return value as Record<string, unknown>;
}

function requireString(value: unknown, errorCode: string): string {
  if (typeof value !== 'string' || value.length === 0) throw new Error(errorCode);
  return value;
}

function requireNumber(value: unknown): number {
  if (typeof value !== 'number' || !Number.isFinite(value)) throw new Error('macro_vintage_value_invalid');
  return value;
}

function requireDate(value: unknown, errorCode: string): string {
  const text = requireString(value, errorCode);
  const match = /^(\d{4}-\d{2}-\d{2})/.exec(text);
  if (!match) throw new Error(errorCode);
  return match[1]!;
}

function requirePeriod(value: unknown, errorCode: string): string {
  const text = requireString(value, errorCode);
  if (!/^\d{4}(?:-Q[1-4]|-\d{2}(?:-\d{2})?)?$/.test(text)) throw new Error(errorCode);
  return text;
}

function requireIso(value: string, errorCode: string): string {
  const parsed = Date.parse(value);
  if (!Number.isFinite(parsed)) throw new Error(errorCode);
  return new Date(parsed).toISOString();
}
