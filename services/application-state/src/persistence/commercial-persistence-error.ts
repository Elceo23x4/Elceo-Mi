export type CommercialPersistenceErrorCode = 'commercial_persistence_unavailable';

export class CommercialPersistenceError extends Error {
  readonly code: CommercialPersistenceErrorCode = 'commercial_persistence_unavailable';
  constructor(message = 'Commercial persistence unavailable') { super(message); this.name = 'CommercialPersistenceError'; }
}

export function isCommercialPersistenceError(error: unknown): error is CommercialPersistenceError {
  return Boolean(error && typeof error === 'object' && (error as { code?: unknown }).code === 'commercial_persistence_unavailable');
}

export type CommercialPersistenceStatus = 'durable' | 'memory_fallback' | 'unavailable';
