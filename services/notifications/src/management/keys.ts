import type { NotificationChannel, NotificationSubjectKind, NotificationTargetKind, Timeframe, CanonicalAssetSymbol, NotificationPolicyRuleKey } from '@elceo/types';
import { normalizeEmailAddress, normalizePushEndpoint } from './normalization';

export type NotificationTargetKeyInput = {
  subjectKind: NotificationSubjectKind;
  subjectId: string;
  channel: NotificationChannel;
  targetKind: NotificationTargetKind;
  addressJson: string;
};

export type NotificationSubscriptionKeyInput = {
  subjectKind: NotificationSubjectKind;
  subjectId: string;
  channel: NotificationChannel;
  assetScope: CanonicalAssetSymbol | '*';
  timeframeScope: Timeframe | '*';
  ruleKeyScope: NotificationPolicyRuleKey | '*';
};

function parseAddress(addressJson: string): Record<string, unknown> {
  try {
    const parsed = JSON.parse(addressJson) as unknown;
    return parsed && typeof parsed === 'object' ? (parsed as Record<string, unknown>) : {};
  } catch {
    return {};
  }
}

function normalizeAddressIdentity(input: NotificationTargetKeyInput): string {
  if (input.targetKind === 'in_app_user') {
    return `inapp:${input.subjectKind}:${input.subjectId.trim()}`;
  }

  const payload = parseAddress(input.addressJson);

  if (input.targetKind === 'email_address') {
    const raw = typeof payload.email === 'string' ? payload.email : typeof payload.address === 'string' ? payload.address : '';
    return `email:${normalizeEmailAddress(raw)}`;
  }

  const raw = typeof payload.endpoint === 'string'
    ? payload.endpoint
    : typeof payload.token === 'string'
      ? payload.token
      : typeof payload.pushEndpoint === 'string'
        ? payload.pushEndpoint
        : '';
  return `push:${normalizePushEndpoint(raw)}`;
}

export function buildNotificationTargetKey(input: NotificationTargetKeyInput): string {
  const identity = normalizeAddressIdentity(input);
  return `target|${input.subjectKind}|${input.subjectId.trim()}|${input.channel}|${input.targetKind}|${identity}`;
}

export function buildNotificationSubscriptionKey(input: NotificationSubscriptionKeyInput): string {
  return `subscription|${input.subjectKind}|${input.subjectId.trim()}|${input.channel}|${input.assetScope}|${input.timeframeScope}|${input.ruleKeyScope}`;
}
