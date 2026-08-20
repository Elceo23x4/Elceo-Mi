import { createHash, randomUUID } from 'node:crypto';
import type { ProviderRuntimeRequest, ProviderRuntimeResponse } from '../provider-api-gate';
import type { ProviderCachePolicy, ProviderCachedMaterial } from './contracts';

function unsigned(material: ProviderCachedMaterial): Omit<ProviderCachedMaterial, 'materialIntegrityHash'> {
  const result = { ...material } as Partial<ProviderCachedMaterial>;
  delete result.materialIntegrityHash;
  return result as Omit<ProviderCachedMaterial, 'materialIntegrityHash'>;
}

export function hashProviderCachedMaterial(
  material: Omit<ProviderCachedMaterial, 'materialIntegrityHash'>,
): string {
  return `sha256:${createHash('sha256').update(canonicalizeProviderCacheValue(material)).digest('hex')}`;
}

function canonicalizeProviderCacheValue(value: unknown): string {
  if (value === null || typeof value === 'boolean' || typeof value === 'string') return JSON.stringify(value);
  if (typeof value === 'number' && Number.isFinite(value)) return JSON.stringify(Object.is(value, -0) ? 0 : value);
  if (Array.isArray(value)) return `[${value.map(canonicalizeProviderCacheValue).join(',')}]`;
  if (typeof value === 'object') {
    return `{${Object.entries(value as Record<string, unknown>)
      .filter(([, nested]) => nested !== undefined)
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([key, nested]) => `${JSON.stringify(key)}:${canonicalizeProviderCacheValue(nested)}`)
      .join(',')}}`;
  }
  throw new Error('unsupported_cache_canonical_value');
}

export function materialFromResponse(
  response: ProviderRuntimeResponse,
  fingerprint: string,
  policy: ProviderCachePolicy,
): ProviderCachedMaterial {
  const base: Omit<ProviderCachedMaterial, 'materialIntegrityHash'> = {
    cacheSchemaVersion: 'provider_cached_material_v1',
    sourceId: response.sourceId,
    capabilityId: response.capabilityId,
    adapterId: response.adapterId,
    fingerprint,
    receivedAt: response.receivedAt,
    payload: response.payload,
    payloadSizeBytes: response.payloadSizeBytes,
    recordCount: response.recordCount,
    ...(response.revision === undefined ? {} : { revision: response.revision }),
    ...(response.duplicateProviderIds === undefined
      ? {}
      : { duplicateProviderIds: response.duplicateProviderIds }),
    ...(response.duplicateRecordKeys === undefined
      ? {}
      : { duplicateRecordKeys: response.duplicateRecordKeys }),
    ...(response.nullableFields === undefined ? {} : { nullableFields: response.nullableFields }),
    ...(response.unknownFields === undefined ? {} : { unknownFields: response.unknownFields }),
    cachePolicyVersion: policy.policyVersion,
    cachePolicyHash: policy.canonicalPolicyHash,
  };
  return { ...base, materialIntegrityHash: hashProviderCachedMaterial(base) };
}

export function validateCachedMaterial(
  material: ProviderCachedMaterial,
  scope: { sourceId: string; capabilityId: string; fingerprint: string },
  policy: ProviderCachePolicy,
): boolean {
  try {
    return (
      material.cacheSchemaVersion === 'provider_cached_material_v1' &&
      material.sourceId === scope.sourceId &&
      material.capabilityId === scope.capabilityId &&
      material.fingerprint === scope.fingerprint &&
      material.cachePolicyVersion === policy.policyVersion &&
      material.cachePolicyHash === policy.canonicalPolicyHash &&
      Number.isSafeInteger(material.payloadSizeBytes) &&
      material.payloadSizeBytes >= 0 &&
      hashProviderCachedMaterial(unsigned(material)) === material.materialIntegrityHash
    );
  } catch {
    return false;
  }
}

export function responseFromMaterial(
  material: ProviderCachedMaterial,
  request: ProviderRuntimeRequest,
): ProviderRuntimeResponse {
  return {
    requestId: request.requestId,
    responseId: `cache-${randomUUID()}`,
    sourceId: material.sourceId,
    capabilityId: material.capabilityId,
    adapterId: material.adapterId,
    receivedAt: material.receivedAt,
    payload: material.payload,
    payloadSchemaStatus: 'valid',
    payloadSizeBytes: material.payloadSizeBytes,
    recordCount: material.recordCount,
    ...(material.revision === undefined ? {} : { revision: material.revision }),
    ...(material.duplicateProviderIds === undefined
      ? {}
      : { duplicateProviderIds: material.duplicateProviderIds }),
    ...(material.duplicateRecordKeys === undefined
      ? {}
      : { duplicateRecordKeys: material.duplicateRecordKeys }),
    ...(material.nullableFields === undefined ? {} : { nullableFields: material.nullableFields }),
    ...(material.unknownFields === undefined ? {} : { unknownFields: material.unknownFields }),
    provenance: { requestId: request.requestId, sourceId: material.sourceId },
    error: null,
    rateLimit: null,
  };
}
