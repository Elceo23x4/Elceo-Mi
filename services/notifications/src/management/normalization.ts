import type { NotificationTargetChannelStatus, NotificationTargetKind } from '@elceo/types';
import type { UpsertNotificationSubscriptionInput } from './contracts';

export function normalizeEmailAddress(email: string): string {
  return email.trim().toLowerCase();
}

export function normalizePushEndpoint(endpoint: string): string {
  return endpoint.trim();
}

export function normalizeLabel(label: string | null | undefined): string | null {
  if (label === null || label === undefined) return null;
  const normalized = label.trim();
  return normalized.length === 0 ? null : normalized;
}

export function validateTargetStatusTransition(targetKind: NotificationTargetKind, nextStatus: NotificationTargetChannelStatus, verifiedAt: string | null): void {
  if (nextStatus !== 'active') return;
  if (targetKind === 'in_app_user') return;
  if (verifiedAt === null) {
    throw new Error('Cannot activate unverified non-in-app notification target');
  }
}

export function validateSubscriptionInput(input: UpsertNotificationSubscriptionInput): void {
  if (!input.subjectId.trim()) throw new Error('subjectId must be non-empty');
  if (input.minMaterialityScore !== undefined && input.minMaterialityScore !== null) {
    if (!Number.isFinite(input.minMaterialityScore)) throw new Error('minMaterialityScore must be finite');
    if (input.minMaterialityScore < 0 || input.minMaterialityScore > 100) throw new Error('minMaterialityScore must be within [0, 100]');
  }
}
