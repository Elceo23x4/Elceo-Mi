import { validateSecurityAuditEvent, validateSecurityDecision, validateSecurityRuntimeSummary } from '@elceo/schemas';
import type { SecurityAuditEvent, SecurityDecision, SecurityRuntimeSummary } from '@elceo/types';

export const toCompactJson = (value: Record<string, unknown>): string => JSON.stringify(value);
const parseJson = (json: string): unknown => JSON.parse(json);
const validationError = (v: unknown): string => String((v as { errors?: string[] }).errors?.join('; ') ?? 'unknown validation error');

export const deserializeSecurityAuditEvent = (json: string): SecurityAuditEvent => {
  const parsed = parseJson(json);
  const validation = validateSecurityAuditEvent(parsed);
  if (!validation.ok) throw new Error(`Invalid SecurityAuditEvent payload: ${validationError(validation)}`);
  return validation.value;
};
export const deserializeSecurityDecision = (json: string): SecurityDecision => {
  const parsed = parseJson(json);
  const validation = validateSecurityDecision(parsed);
  if (!validation.ok) throw new Error(`Invalid SecurityDecision payload: ${validationError(validation)}`);
  return validation.value;
};
export const deserializeSecurityRuntimeSummary = (json: string): SecurityRuntimeSummary => {
  const parsed = parseJson(json);
  const validation = validateSecurityRuntimeSummary(parsed);
  if (!validation.ok) throw new Error(`Invalid SecurityRuntimeSummary payload: ${validationError(validation)}`);
  return validation.value;
};
