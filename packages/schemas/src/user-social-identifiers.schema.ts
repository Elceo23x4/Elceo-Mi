import type { UpdateUserSocialIdentifiersRequest } from '@elceo/types';
import { isObjectRecord, type SchemaValidationResult } from './validation-utils';

const secretsPattern = /(api[_-]?key|secret|token|password|session)/i;
const unsafePattern = /<|>|javascript:|<script|\{\{|\}\}/i;

function validateOptional(input: unknown, field: string, errors: string[]): string | undefined {
  if (input === undefined || input === null) return undefined;
  if (typeof input !== 'string') { errors.push(`${field} must be string`); return undefined; }
  const value = input.trim();
  if (!value) { errors.push(`${field} empty`); return undefined; }
  if (value.length < 2 || value.length > 200) { errors.push(`${field} length`); return undefined; }
  if (secretsPattern.test(value) || unsafePattern.test(value)) { errors.push(`${field} unsafe`); return undefined; }
  return value;
}

export function validateUpdateUserSocialIdentifiersRequest(input: unknown): SchemaValidationResult<UpdateUserSocialIdentifiersRequest> {
  if (!isObjectRecord(input)) return { ok: false, errors: ['request must be object'] };
  const errors: string[] = [];
  const linkedinAddress = validateOptional(input.linkedinAddress, 'linkedinAddress', errors);
  const telegramId = validateOptional(input.telegramId, 'telegramId', errors);
  const xUsername = validateOptional(input.xUsername, 'xUsername', errors);
  if (!linkedinAddress && !telegramId && !xUsername) errors.push('at least one social identifier required');
  if (errors.length) return { ok: false, errors };
  return { ok: true, value: { ...(linkedinAddress ? { linkedinAddress } : {}), ...(telegramId ? { telegramId } : {}), ...(xUsername ? { xUsername } : {}) } };
}
