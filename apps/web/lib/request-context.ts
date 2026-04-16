import { logEvent } from '@elceo/config';

export function getRequestId(request: Request): string {
  return request.headers.get('x-request-id') ?? crypto.randomUUID();
}

export function logRequest(scope: string, requestId: string, message: string, context: Record<string, unknown> = {}): void {
  logEvent(scope, 'info', message, { requestId, ...context });
}
