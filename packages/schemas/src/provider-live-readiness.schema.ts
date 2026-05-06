import type { ProviderLiveActivationPolicy, ProviderLiveReadinessSnapshot, ProviderLiveReadinessStatus, ProviderLiveSmokePlan, ProviderQuotaPolicy } from '@elceo/types';
import { ProviderLiveActivationEnvironmentValues, ProviderLiveActivationStatusValues, ProviderLiveRiskLevelValues, ProviderQuotaUnitValues } from '@elceo/types';
import { isBoolean, isEnumValue, isIsoDateString, isNonEmptyString, isObjectRecord, isStringArray, type SchemaValidationResult } from './validation-utils';

export const validateProviderQuotaPolicy = (input: unknown): SchemaValidationResult<ProviderQuotaPolicy> => {
  const errors: string[] = [];
  if (!isObjectRecord(input)) return { ok: false, errors: ['input must be object'] };
  if (!isNonEmptyString(input.providerId)) errors.push('providerId must be non-empty string');
  if (!isEnumValue(input.unit, ProviderQuotaUnitValues)) errors.push('unit is invalid');
  if (input.limit !== null && input.limit !== undefined && (!(typeof input.limit === 'number') || input.limit < 0)) errors.push('limit must be non-negative number when present');
  if (input.burstLimit !== null && input.burstLimit !== undefined && (!(typeof input.burstLimit === 'number') || input.burstLimit < 0)) errors.push('burstLimit must be non-negative number when present');
  if (!isNonEmptyString(input.rationale)) errors.push('rationale must be non-empty string');
  return errors.length ? { ok: false, errors } : { ok: true, value: input as ProviderQuotaPolicy };
};
export const validateProviderLiveActivationPolicy = (input: unknown): SchemaValidationResult<ProviderLiveActivationPolicy> => {
  const errors: string[] = []; if (!isObjectRecord(input)) return { ok: false, errors: ['input must be object'] };
  if (!isNonEmptyString(input.providerId)) errors.push('providerId must be non-empty string');
  if (!isEnumValue(input.environment, ProviderLiveActivationEnvironmentValues)) errors.push('environment is invalid');
  if (!isBoolean(input.liveEnabled)) errors.push('liveEnabled must be boolean');
  if (!isBoolean(input.allowLiveFetch)) errors.push('allowLiveFetch must be boolean');
  if (!isBoolean(input.requireExplicitEnv) || !isBoolean(input.requireApiKey) || !isBoolean(input.requireStagingFirst) || !isBoolean(input.productionBlockedByDefault)) errors.push('policy boolean fields are invalid');
  if (!isNonEmptyString(input.rationale)) errors.push('rationale must be non-empty string');
  return errors.length ? { ok: false, errors } : { ok: true, value: input as ProviderLiveActivationPolicy };
};
export const validateProviderLiveReadinessStatus = (input: unknown): SchemaValidationResult<ProviderLiveReadinessStatus> => {
  const errors: string[] = []; if (!isObjectRecord(input)) return { ok: false, errors: ['input must be object'] };
  if (!isNonEmptyString(input.providerId)) errors.push('providerId must be non-empty string');
  if (!isEnumValue(input.environment, ProviderLiveActivationEnvironmentValues)) errors.push('environment is invalid');
  if (!isEnumValue(input.activationStatus, ProviderLiveActivationStatusValues)) errors.push('activationStatus is invalid');
  if (!Array.isArray(input.quotaPolicies) || input.quotaPolicies.some((x: unknown) => !validateProviderQuotaPolicy(x).ok)) errors.push('quotaPolicies are invalid');
  if (!isEnumValue(input.riskLevel, ProviderLiveRiskLevelValues)) errors.push('riskLevel is invalid');
  if (!isStringArray(input.reasons)) errors.push('reasons are invalid');
  if (!isIsoDateString(input.checkedAt)) errors.push('checkedAt must be ISO timestamp');
  if (input.activationStatus !== 'staging_ready' && input.activationStatus !== 'production_ready' && (!Array.isArray(input.reasons) || input.reasons.length === 0)) errors.push('reasons must be non-empty when not passing');
  return errors.length ? { ok: false, errors } : { ok: true, value: input as ProviderLiveReadinessStatus };
};
export const validateProviderLiveReadinessSnapshot = (input: unknown): SchemaValidationResult<ProviderLiveReadinessSnapshot> => {
  const errors: string[] = []; if (!isObjectRecord(input)) return { ok: false, errors: ['input must be object'] };
  if (!isIsoDateString(input.generatedAt)) errors.push('generatedAt must be ISO timestamp');
  if (!isEnumValue(input.environment, ProviderLiveActivationEnvironmentValues)) errors.push('environment is invalid');
  if (!Array.isArray(input.providers) || input.providers.some((x: unknown) => !validateProviderLiveReadinessStatus(x).ok)) errors.push('providers are invalid');
  if (!isStringArray(input.failures)) errors.push('failures are invalid');
  return errors.length ? { ok: false, errors } : { ok: true, value: input as ProviderLiveReadinessSnapshot };
};
export const validateProviderLiveSmokePlan = (input: unknown): SchemaValidationResult<ProviderLiveSmokePlan> => {
  const errors: string[] = []; if (!isObjectRecord(input)) return { ok: false, errors: ['input must be object'] };
  if (!isIsoDateString(input.generatedAt)) errors.push('generatedAt must be ISO timestamp');
  if (!isEnumValue(input.environment, ProviderLiveActivationEnvironmentValues)) errors.push('environment is invalid');
  if (!isNonEmptyString(input.providerId)) errors.push('providerId must be non-empty string');
  if (!isBoolean(input.allowed)) errors.push('allowed must be boolean');
  if (!isStringArray(input.checks)) errors.push('checks are invalid');
  if (!isStringArray(input.warnings)) errors.push('warnings are invalid');
  return errors.length ? { ok: false, errors } : { ok: true, value: input as ProviderLiveSmokePlan };
};
