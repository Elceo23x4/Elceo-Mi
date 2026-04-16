import type { ProviderHealthRecord, ProviderId } from '@elceo/types';

const healthStore = new Map<ProviderId, ProviderHealthRecord>();

export function markProviderSuccess(provider: ProviderId, domain: ProviderHealthRecord['domain']): ProviderHealthRecord {
  const prev = healthStore.get(provider);
  const next: ProviderHealthRecord = {
    provider,
    domain,
    status: 'healthy',
    successRatePct: prev ? Math.min(100, prev.successRatePct + 5) : 100,
    consecutiveFailures: 0,
    lastSuccessAt: new Date().toISOString(),
    message: 'ok',
    ...(prev?.lastFailureAt ? { lastFailureAt: prev.lastFailureAt } : {})
  };
  healthStore.set(provider, next);
  return next;
}

export function markProviderFailure(provider: ProviderId, domain: ProviderHealthRecord['domain'], message: string): ProviderHealthRecord {
  const prev = healthStore.get(provider);
  const failures = (prev?.consecutiveFailures ?? 0) + 1;

  const next: ProviderHealthRecord = {
    provider,
    domain,
    status: failures >= 3 ? 'down' : 'degraded',
    successRatePct: Math.max(0, (prev?.successRatePct ?? 100) - 10),
    consecutiveFailures: failures,
    lastFailureAt: new Date().toISOString(),
    message,
    ...(prev?.lastSuccessAt ? { lastSuccessAt: prev.lastSuccessAt } : {})
  };
  healthStore.set(provider, next);
  return next;
}

export function getProviderHealthSnapshot(): ProviderHealthRecord[] {
  return Array.from(healthStore.values());
}
