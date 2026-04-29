import type { OpsJobKind } from '@elceo/types';
import { OPS_LEASE_DURATION_MINUTES } from './constants';

export function getLeaseDurationMinutes(jobKind: OpsJobKind): number { return OPS_LEASE_DURATION_MINUTES[jobKind]; }
export function buildLeaseExpiry(acquiredAtIso: string, jobKind: OpsJobKind): string {
  const ms = Date.parse(acquiredAtIso) + getLeaseDurationMinutes(jobKind) * 60_000;
  return new Date(ms).toISOString();
}
export function isLeaseExpired(expiresAtIso: string, asOfIso: string): boolean { return Date.parse(expiresAtIso) <= Date.parse(asOfIso); }
