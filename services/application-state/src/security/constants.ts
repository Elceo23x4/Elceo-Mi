import type { SecurityRateLimitWindow } from '@elceo/types';

export const SECURITY_DEFAULT_IDEMPOTENCY_TTL_MS = 24 * 60 * 60 * 1000;

export type SecurityWindowRange = { windowStart: string; windowEnd: string };

export function getSecurityRateLimitWindow(window: SecurityRateLimitWindow, asOfIso: string): SecurityWindowRange {
  const date = new Date(asOfIso);
  const t = date.getTime();
  if (Number.isNaN(t)) {
    throw new Error(`Invalid asOfIso timestamp: ${asOfIso}`);
  }
  const start = new Date(date);
  if (window === 'minute') start.setUTCSeconds(0, 0);
  else if (window === 'hour') start.setUTCMinutes(0, 0, 0);
  else start.setUTCHours(0, 0, 0, 0);
  const end = new Date(start);
  if (window === 'minute') end.setUTCMinutes(end.getUTCMinutes() + 1);
  else if (window === 'hour') end.setUTCHours(end.getUTCHours() + 1);
  else end.setUTCDate(end.getUTCDate() + 1);
  return { windowStart: start.toISOString(), windowEnd: end.toISOString() };
}
