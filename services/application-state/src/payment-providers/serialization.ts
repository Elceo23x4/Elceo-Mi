const parseObj = (json: string): Record<string, unknown> => { const v: unknown = JSON.parse(json); if (!v || typeof v !== 'object' || Array.isArray(v)) throw new Error('invalid_payload_json'); return v as Record<string, unknown>; };
export const deserializeExternalCustomerMetadata = parseObj;
export const deserializeExternalSubscriptionMetadata = parseObj;
export const deserializeExternalEventPayload = parseObj;
