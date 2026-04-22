export type SchemaValidationResult<T> = { ok: true; value: T } | { ok: false; errors: string[] };

export function isNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0;
}

export function isFiniteNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value);
}

export function isScore0to100(value: unknown): value is number {
  return isFiniteNumber(value) && value >= 0 && value <= 100;
}

export function isIsoDateString(value: unknown): value is string {
  return typeof value === 'string' && !Number.isNaN(Date.parse(value));
}

export function isNullableIsoDateString(value: unknown): value is string | null {
  return value === null || isIsoDateString(value);
}

export function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((item) => typeof item === 'string');
}

export function isNumberArray(value: unknown): value is number[] {
  return Array.isArray(value) && value.every((item) => typeof item === 'number' && Number.isFinite(item));
}

export function isBoolean(value: unknown): value is boolean {
  return typeof value === 'boolean';
}

export function isObjectRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

export function isEnumValue<T extends string>(value: unknown, allowed: readonly T[]): value is T {
  return typeof value === 'string' && (allowed as readonly string[]).includes(value);
}

export function validateRequiredFields(
  input: Record<string, unknown>,
  fields: readonly string[],
  errors: string[],
  pathPrefix = ''
): void {
  for (const field of fields) {
    const value = input[field];
    if (!isNonEmptyString(value)) {
      errors.push(`${pathPrefix}${field} must be a non-empty string`);
    }
  }
}
