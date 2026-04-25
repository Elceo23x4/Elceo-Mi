import type {
  DomainRefreshResult,
  RefreshAttentionSummary,
  SnapshotDependencyState,
  SnapshotFreshnessRecord,
  SnapshotRefreshRunReport,
  SnapshotRefreshRunStatus
} from '@elceo/types';
import {
  SNAPSHOT_DEPENDENCY_STATES,
  SNAPSHOT_DOMAIN_KINDS,
  SNAPSHOT_FRESHNESS_STATES,
  SNAPSHOT_REFRESH_RUN_STATUSES,
  SNAPSHOT_REFRESH_TRIGGER_KINDS
} from '@elceo/types';
import {
  isEnumValue,
  isFiniteNumber,
  isIsoDateString,
  isNonEmptyString,
  isObjectRecord,
  isStringArray,
  type SchemaValidationResult
} from './validation-utils';

function isNonNegativeNumber(value: unknown): value is number {
  return isFiniteNumber(value) && Number(value) >= 0;
}

function validateDependencyStatus(input: unknown, pathPrefix: string, errors: string[]): input is Record<string, SnapshotDependencyState> {
  if (!isObjectRecord(input)) {
    errors.push(`${pathPrefix}dependencyStatus must be object`);
    return false;
  }
  for (const [key, value] of Object.entries(input)) {
    if (!isEnumValue(value, SNAPSHOT_DEPENDENCY_STATES)) {
      errors.push(`${pathPrefix}dependencyStatus.${key} is invalid`);
    }
  }
  return true;
}

function validateRunStatus(value: unknown, path: string, errors: string[]): value is SnapshotRefreshRunStatus | 'skipped' {
  if (value === 'skipped') return true;
  if (!isEnumValue(value, SNAPSHOT_REFRESH_RUN_STATUSES)) {
    errors.push(`${path} is invalid`);
    return false;
  }
  return true;
}

export function validateDomainRefreshResult(input: unknown, pathPrefix = ''): SchemaValidationResult<DomainRefreshResult> {
  const errors: string[] = [];
  if (!isObjectRecord(input)) return { ok: false, errors: [`${pathPrefix}DomainRefreshResult must be object`] };

  if (!isEnumValue(input.domain, SNAPSHOT_DOMAIN_KINDS)) errors.push(`${pathPrefix}domain is invalid`);
  validateRunStatus(input.status, `${pathPrefix}status`, errors);
  if (!(input.previousFreshnessState === null || isEnumValue(input.previousFreshnessState, SNAPSHOT_FRESHNESS_STATES))) {
    errors.push(`${pathPrefix}previousFreshnessState is invalid`);
  }
  if (!isEnumValue(input.nextFreshnessState, SNAPSHOT_FRESHNESS_STATES)) errors.push(`${pathPrefix}nextFreshnessState is invalid`);
  if (!(input.snapshotId === null || isNonEmptyString(input.snapshotId))) errors.push(`${pathPrefix}snapshotId must be non-empty string or null`);
  if (!isIsoDateString(input.startedAt)) errors.push(`${pathPrefix}startedAt must be ISO date string`);
  if (!isIsoDateString(input.endedAt)) errors.push(`${pathPrefix}endedAt must be ISO date string`);
  if (!isNonNegativeNumber(input.durationMs)) errors.push(`${pathPrefix}durationMs must be number >= 0`);
  validateDependencyStatus(input.dependencyStatus, pathPrefix, errors);
  if (!isStringArray(input.warnings)) errors.push(`${pathPrefix}warnings must be string[]`);
  if (!(input.failureReason === null || isNonEmptyString(input.failureReason))) errors.push(`${pathPrefix}failureReason must be non-empty string or null`);

  return errors.length ? { ok: false, errors } : { ok: true, value: input as DomainRefreshResult };
}

function validateDomainArray(value: unknown, field: string, pathPrefix: string, errors: string[]): void {
  if (!Array.isArray(value)) {
    errors.push(`${pathPrefix}${field} must be SnapshotDomainKind[]`);
    return;
  }
  value.forEach((item, index) => {
    if (!isEnumValue(item, SNAPSHOT_DOMAIN_KINDS)) errors.push(`${pathPrefix}${field}[${index}] is invalid`);
  });
}

export function validateSnapshotRefreshRunReport(input: unknown, pathPrefix = ''): SchemaValidationResult<SnapshotRefreshRunReport> {
  const errors: string[] = [];
  if (!isObjectRecord(input)) return { ok: false, errors: [`${pathPrefix}SnapshotRefreshRunReport must be object`] };

  if (!isNonEmptyString(input.refreshRunId)) errors.push(`${pathPrefix}refreshRunId must be non-empty string`);
  if (!(input.subjectKind === 'user' || input.subjectKind === 'workspace' || input.subjectKind === 'ops')) errors.push(`${pathPrefix}subjectKind is invalid`);
  if (!isNonEmptyString(input.subjectId)) errors.push(`${pathPrefix}subjectId must be non-empty string`);
  if (!isEnumValue(input.triggerKind, SNAPSHOT_REFRESH_TRIGGER_KINDS)) errors.push(`${pathPrefix}triggerKind is invalid`);
  if (!isIsoDateString(input.generatedAt)) errors.push(`${pathPrefix}generatedAt must be ISO date string`);
  if (!isEnumValue(input.overallStatus, SNAPSHOT_REFRESH_RUN_STATUSES)) errors.push(`${pathPrefix}overallStatus is invalid`);
  if (!isIsoDateString(input.createdAt)) errors.push(`${pathPrefix}createdAt must be ISO date string`);

  if (!Array.isArray(input.domainResults)) {
    errors.push(`${pathPrefix}domainResults must be DomainRefreshResult[]`);
  } else {
    input.domainResults.forEach((item, index) => {
      const validated = validateDomainRefreshResult(item, `${pathPrefix}domainResults[${index}].`);
      if (validated.ok === false) errors.push(...validated.errors);
    });
  }

  validateDomainArray(input.refreshedDomains, 'refreshedDomains', pathPrefix, errors);
  validateDomainArray(input.failedDomains, 'failedDomains', pathPrefix, errors);
  validateDomainArray(input.staleDomains, 'staleDomains', pathPrefix, errors);
  if (!isStringArray(input.warnings)) errors.push(`${pathPrefix}warnings must be string[]`);

  return errors.length ? { ok: false, errors } : { ok: true, value: input as SnapshotRefreshRunReport };
}

export function validateSnapshotFreshnessRecord(input: unknown, pathPrefix = ''): SchemaValidationResult<SnapshotFreshnessRecord> {
  const errors: string[] = [];
  if (!isObjectRecord(input)) return { ok: false, errors: [`${pathPrefix}SnapshotFreshnessRecord must be object`] };

  if (!isNonEmptyString(input.freshnessId)) errors.push(`${pathPrefix}freshnessId must be non-empty string`);
  if (!isEnumValue(input.domain, SNAPSHOT_DOMAIN_KINDS)) errors.push(`${pathPrefix}domain is invalid`);
  if (!(input.subjectKind === 'user' || input.subjectKind === 'workspace' || input.subjectKind === 'ops')) errors.push(`${pathPrefix}subjectKind is invalid`);
  if (!isNonEmptyString(input.subjectId)) errors.push(`${pathPrefix}subjectId must be non-empty string`);
  if (!(input.assetScope === '*' || isNonEmptyString(input.assetScope))) errors.push(`${pathPrefix}assetScope must be non-empty string or *`);
  if (!(input.timeframeScope === '*' || isNonEmptyString(input.timeframeScope))) errors.push(`${pathPrefix}timeframeScope must be non-empty string or *`);
  if (!(input.latestSnapshotId === null || isNonEmptyString(input.latestSnapshotId))) errors.push(`${pathPrefix}latestSnapshotId must be non-empty string or null`);
  if (!isEnumValue(input.freshnessState, SNAPSHOT_FRESHNESS_STATES)) errors.push(`${pathPrefix}freshnessState is invalid`);
  if (!isEnumValue(input.dependencyState, SNAPSHOT_DEPENDENCY_STATES)) errors.push(`${pathPrefix}dependencyState is invalid`);
  if (!(input.snapshotGeneratedAt === null || isIsoDateString(input.snapshotGeneratedAt))) errors.push(`${pathPrefix}snapshotGeneratedAt must be ISO date string or null`);
  if (!isIsoDateString(input.evaluatedAt)) errors.push(`${pathPrefix}evaluatedAt must be ISO date string`);
  if (!(input.ageMinutes === null || isNonNegativeNumber(input.ageMinutes))) errors.push(`${pathPrefix}ageMinutes must be number >= 0 or null`);
  if (!isNonNegativeNumber(input.maxFreshMinutes)) errors.push(`${pathPrefix}maxFreshMinutes must be number >= 0`);
  if (!(input.failureReason === null || isNonEmptyString(input.failureReason))) errors.push(`${pathPrefix}failureReason must be non-empty string or null`);
  if (!isIsoDateString(input.updatedAt)) errors.push(`${pathPrefix}updatedAt must be ISO date string`);

  return errors.length ? { ok: false, errors } : { ok: true, value: input as SnapshotFreshnessRecord };
}

export function validateRefreshAttentionSummary(input: unknown, pathPrefix = ''): SchemaValidationResult<RefreshAttentionSummary> {
  const errors: string[] = [];
  if (!isObjectRecord(input)) return { ok: false, errors: [`${pathPrefix}RefreshAttentionSummary must be object`] };

  if (!(input.subjectKind === 'user' || input.subjectKind === 'workspace' || input.subjectKind === 'ops')) errors.push(`${pathPrefix}subjectKind is invalid`);
  if (!isNonEmptyString(input.subjectId)) errors.push(`${pathPrefix}subjectId must be non-empty string`);
  if (!isIsoDateString(input.generatedAt)) errors.push(`${pathPrefix}generatedAt must be ISO date string`);
  for (const key of ['freshCount', 'staleCount', 'missingCount', 'failedCount'] as const) {
    if (!Number.isInteger(input[key]) || Number(input[key]) < 0) errors.push(`${pathPrefix}${key} must be integer >= 0`);
  }
  if (!(input.mostCriticalDomain === null || isEnumValue(input.mostCriticalDomain, SNAPSHOT_DOMAIN_KINDS))) {
    errors.push(`${pathPrefix}mostCriticalDomain is invalid`);
  }
  if (!isEnumValue(input.overallFreshnessState, SNAPSHOT_FRESHNESS_STATES)) errors.push(`${pathPrefix}overallFreshnessState is invalid`);

  return errors.length ? { ok: false, errors } : { ok: true, value: input as RefreshAttentionSummary };
}
