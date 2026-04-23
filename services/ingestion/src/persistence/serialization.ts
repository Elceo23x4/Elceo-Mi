import { validateCanonicalEvent } from '@elceo/schemas';
import type { CanonicalEvent } from '@elceo/types';
import type { ProviderCapabilityDiagnostic } from '../facade/provider-capabilities';
import type { IngestionDiagnosticsSummary } from './contracts';
import type { IngestionRunComparison } from '../runtime/run-report';

function safeParseJson(value: string): unknown {
  try {
    return JSON.parse(value) as unknown;
  } catch {
    throw new Error('Malformed JSON payload');
  }
}

export function serializeCanonicalEvent(event: CanonicalEvent): string {
  return JSON.stringify(event);
}

export function deserializeCanonicalEvent(json: string): CanonicalEvent {
  const parsed = safeParseJson(json);
  const validated = validateCanonicalEvent(parsed);
  if (validated.ok === false) {
    throw new Error(`Invalid persisted CanonicalEvent: ${validated.errors.join('; ')}`);
  }
  return validated.value;
}

export function serializeRunComparison(comparison: IngestionRunComparison | null): string | null {
  return comparison === null ? null : JSON.stringify(comparison);
}

export function deserializeRunComparison(json: string | null): IngestionRunComparison | null {
  if (json === null) return null;
  const parsed = safeParseJson(json);
  if (typeof parsed !== 'object' || parsed === null) {
    throw new Error('Invalid persisted run comparison payload');
  }
  const comparison = parsed as Partial<IngestionRunComparison>;
  if (
    typeof comparison.overlapDedupeKeyCount !== 'number' ||
    typeof comparison.canonicalOnlyCount !== 'number' ||
    typeof comparison.legacyOnlyCount !== 'number' ||
    typeof comparison.unionCount !== 'number' ||
    typeof comparison.overlapRatio !== 'number'
  ) {
    throw new Error('Invalid persisted run comparison fields');
  }
  return comparison as IngestionRunComparison;
}

export function serializeDiagnosticsSummary(summary: IngestionDiagnosticsSummary): string {
  return JSON.stringify(summary);
}

export function deserializeDiagnosticsSummary(json: string): IngestionDiagnosticsSummary {
  const parsed = safeParseJson(json);
  if (typeof parsed !== 'object' || parsed === null) {
    throw new Error('Invalid diagnostics summary payload');
  }
  const summary = parsed as Partial<IngestionDiagnosticsSummary>;
  if (
    typeof summary.adapterFailureCount !== 'number' ||
    typeof summary.invalidEventCount !== 'number' ||
    typeof summary.mergeCount !== 'number' ||
    typeof summary.droppedEventCount !== 'number'
  ) {
    throw new Error('Invalid diagnostics summary fields');
  }
  return summary as IngestionDiagnosticsSummary;
}

export function serializeProviderCapabilities(capabilities: ProviderCapabilityDiagnostic[]): string {
  return JSON.stringify(capabilities);
}

export function deserializeProviderCapabilities(json: string): ProviderCapabilityDiagnostic[] {
  const parsed = safeParseJson(json);
  if (!Array.isArray(parsed)) {
    throw new Error('Invalid provider capabilities payload');
  }

  const output: ProviderCapabilityDiagnostic[] = [];
  for (const item of parsed) {
    if (typeof item !== 'object' || item === null) {
      throw new Error('Invalid provider capability entry');
    }
    const candidate = item as Partial<ProviderCapabilityDiagnostic>;
    if (
      typeof candidate.providerName !== 'string' ||
      typeof candidate.category !== 'string' ||
      typeof candidate.enabled !== 'boolean' ||
      typeof candidate.healthyToConstruct !== 'boolean' ||
      !(candidate.reason === null || typeof candidate.reason === 'string')
    ) {
      throw new Error('Invalid provider capability fields');
    }
    output.push(candidate as ProviderCapabilityDiagnostic);
  }

  return output;
}
