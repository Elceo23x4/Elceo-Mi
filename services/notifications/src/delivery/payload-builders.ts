import type { NotificationChannel, NotificationDecision } from '@elceo/types';
import type { PersistedNotificationDecisionRecord } from '../persistence/contracts';
import type { DeliverySupportedChannel, EmailDeliveryPayload, InAppDeliveryPayload, NotificationDeliveryEnvelope, NotificationDeliveryChannelPayload, PushDeliveryPayload } from './channel-contracts';
import type { ResolvedNotificationTarget } from './target-resolver';

function assertDeliverable(record: PersistedNotificationDecisionRecord, decision: NotificationDecision): void {
  if (!record.shouldNotify || !decision.shouldNotify) throw new Error('non_notifying_decision_not_deliverable');
}

function assertChannelAllowed(decision: NotificationDecision, channel: NotificationChannel): void {
  if (!decision.channels.includes(channel)) throw new Error(`channel_not_allowed:${channel}`);
}

export function buildInAppDeliveryPayload(record: PersistedNotificationDecisionRecord, decision: NotificationDecision): InAppDeliveryPayload {
  assertDeliverable(record, decision); assertChannelAllowed(decision, 'in_app');
  return { title: record.headline, body: record.body, decisionId: record.decisionId, ruleKey: record.ruleKey, asset: record.asset, timeframe: record.timeframe, createdAt: record.createdAt };
}
export function buildPushDeliveryPayload(record: PersistedNotificationDecisionRecord, decision: NotificationDecision): PushDeliveryPayload {
  assertDeliverable(record, decision); assertChannelAllowed(decision, 'push');
  return { title: record.headline, body: record.body, decisionId: record.decisionId, ruleKey: record.ruleKey, asset: record.asset, timeframe: record.timeframe, createdAt: record.createdAt };
}
export function buildEmailDeliveryPayload(record: PersistedNotificationDecisionRecord, decision: NotificationDecision): EmailDeliveryPayload {
  assertDeliverable(record, decision); assertChannelAllowed(decision, 'email');
  return { subject: record.headline, body: record.body, decisionId: record.decisionId, ruleKey: record.ruleKey, asset: record.asset, timeframe: record.timeframe, createdAt: record.createdAt };
}

export function buildChannelPayloadForDecision(record: PersistedNotificationDecisionRecord, decision: NotificationDecision, channel: DeliverySupportedChannel): NotificationDeliveryChannelPayload {
  if (channel === 'in_app') return buildInAppDeliveryPayload(record, decision);
  if (channel === 'push') return buildPushDeliveryPayload(record, decision);
  return buildEmailDeliveryPayload(record, decision);
}

export function buildTargetAwareChannelPayloadForDecision(
  record: PersistedNotificationDecisionRecord,
  decision: NotificationDecision,
  resolvedTarget: ResolvedNotificationTarget
): NotificationDeliveryEnvelope {
  const channel = resolvedTarget.channel as DeliverySupportedChannel;
  const payload = buildChannelPayloadForDecision(record, decision, channel);
  return { channel, targetId: resolvedTarget.targetId, targetKind: resolvedTarget.targetKind, addressJson: resolvedTarget.addressJson, payload };
}
