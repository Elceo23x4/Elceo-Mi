import 'server-only';

import { NextResponse } from 'next/server';
import type { ApiErrorCode, ApiErrorEnvelope, ApiSuccessEnvelope } from '@elceo/types';
import type { SchemaValidationResult } from '@elceo/schemas';

const STATUS_BY_CODE: Record<ApiErrorCode, number> = {
  unauthorized: 401,
  forbidden: 403,
  bad_request: 400,
  validation_error: 400,
  not_found: 404,
  conflict: 409,
  unprocessable_entity: 422,
  dependency_failed: 424,
  internal_error: 500
};

export function jsonSuccess<T>(data: T, meta?: ApiSuccessEnvelope<T>['meta']) {
  return NextResponse.json({ ok: true, data, ...(meta ? { meta } : {}) } satisfies ApiSuccessEnvelope<T>);
}

export function jsonError(code: ApiErrorCode, message: string, details?: string[], status?: number) {
  const body: ApiErrorEnvelope = { ok: false, error: { code, message, ...(details?.length ? { details } : {}) } };
  return NextResponse.json(body, { status: status ?? STATUS_BY_CODE[code] });
}

export async function parseJsonBody(request: Request): Promise<unknown> {
  try {
    return await request.json();
  } catch {
    throw new Error('bad_request:invalid_json');
  }
}

export function parseSearchParams(url: string): URLSearchParams {
  return new URL(url).searchParams;
}

export function parsePositiveInt(value: string | null, fallback: number, max = 100): number {
  if (!value) return fallback;
  const parsed = Number.parseInt(value, 10);
  if (!Number.isFinite(parsed) || parsed < 1) throw new Error('bad_request:invalid_limit');
  return Math.min(parsed, max);
}

export function requireMethod(method: string, ...accepted: string[]): void {
  if (!accepted.includes(method.toUpperCase())) throw new Error('bad_request:method_not_allowed');
}

export function unwrapValidation<T>(result: SchemaValidationResult<T>): T {
  if ('errors' in result) throw new Error(`validation_error:${result.errors.join('|')}`);
  return result.value;
}

function mapError(error: unknown): { code: ApiErrorCode; message: string; details?: string[] } {
  const message = error instanceof Error ? error.message : 'internal_error';
  if (message.includes('unauthorized')) return { code: 'unauthorized', message: 'Unauthorized' };
  if (message.includes('forbidden')) return { code: 'forbidden', message: 'Forbidden' };
  if (message.startsWith('bad_request:')) return { code: 'bad_request', message: 'Bad request', details: [message.slice(12)] };
  if (message.startsWith('validation_error:')) return { code: 'validation_error', message: 'Validation failed', details: message.slice(17).split('|') };
  if (message.includes('not_found')) return { code: 'not_found', message: 'Not found' };
  if (message.includes('conflict')) return { code: 'conflict', message: 'Conflict' };
  if (message.includes('invalid_transition')) return { code: 'unprocessable_entity', message: 'Invalid transition' };
  if (message.includes('dependency')) return { code: 'dependency_failed', message: 'Dependency failure' };
  return { code: 'internal_error', message: 'Internal server error' };
}

export function withApiErrorBoundary<TArgs extends unknown[]>(handler: (...args: TArgs) => Promise<Response>) {
  return async (...args: TArgs): Promise<Response> => {
    try {
      return await handler(...args);
    } catch (error) {
      const mapped = mapError(error);
      return jsonError(mapped.code, mapped.message, mapped.details);
    }
  };
}
