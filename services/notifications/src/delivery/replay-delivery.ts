import type { NotificationOutboxAttemptRepository, NotificationOutboxRepository, NotificationInboxRepository } from '../persistence/contracts';
import type { NotificationOutboxReplayBundle } from './outbox-contracts';
import type { NotificationDeliveryEnvelope } from './channel-contracts';
import type { NotificationInboxRecord } from '@elceo/types';

function parseJson(value: string): unknown { try { return JSON.parse(value) as unknown; } catch { throw new Error('malformed_json'); } }
function assertRecord(input: unknown, field: string): Record<string, unknown> { if (typeof input !== 'object' || input === null || Array.isArray(input)) throw new Error(`invalid_payload:${field}`); return input as Record<string, unknown>; }
function assertString(input: unknown, field: string): string { if (typeof input !== 'string') throw new Error(`invalid_payload:${field}`); return input; }

export function deserializeTargetAwareNotificationPayload(payloadJson: string): NotificationDeliveryEnvelope {
  const parsed = assertRecord(parseJson(payloadJson), 'root');
  const payload = assertRecord(parsed.payload, 'payload');
  return {
    channel: assertString(parsed.channel, 'channel') as NotificationDeliveryEnvelope['channel'],
    targetId: assertString(parsed.targetId, 'targetId'),
    targetKind: assertString(parsed.targetKind, 'targetKind') as NotificationDeliveryEnvelope['targetKind'],
    addressJson: assertString(parsed.addressJson, 'addressJson'),
    payload: payload as NotificationDeliveryEnvelope['payload']
  };
}

export async function getNotificationOutboxReplayById(outboxId: string, outboxRepository: NotificationOutboxRepository, attemptRepository: NotificationOutboxAttemptRepository, inboxRepository?: NotificationInboxRepository): Promise<NotificationOutboxReplayBundle | null> {
  const outbox = await outboxRepository.getOutboxById(outboxId); if (!outbox) return null;
  const attempts = await attemptRepository.listAttemptsForOutbox(outboxId);
  const payload = deserializeTargetAwareNotificationPayload(outbox.payloadJson);
  if (payload.channel !== outbox.channel || payload.targetId !== outbox.targetId) throw new Error('invalid_payload:channel_target_mismatch');
  if (inboxRepository && outbox.channel === 'in_app') await inboxRepository.getInboxById(`inbox|${outbox.decisionId}|${outbox.targetId}`);
  return { outbox, attempts, payload };
}

export async function getNotificationOutboxReplayByKey(outboxKey: string, outboxRepository: NotificationOutboxRepository, attemptRepository: NotificationOutboxAttemptRepository): Promise<NotificationOutboxReplayBundle | null> {
  const outbox = await outboxRepository.getOutboxByKey(outboxKey); if (!outbox) return null;
  const attempts = await attemptRepository.listAttemptsForOutbox(outbox.outboxId);
  const payload = deserializeTargetAwareNotificationPayload(outbox.payloadJson);
  return { outbox, attempts, payload };
}

export async function listNotificationOutboxReplayForDecision(decisionId: string, outboxRepository: NotificationOutboxRepository, attemptRepository: NotificationOutboxAttemptRepository): Promise<NotificationOutboxReplayBundle[]> {
  const outboxes = await outboxRepository.listOutboxForDecision(decisionId);
  const bundles: NotificationOutboxReplayBundle[] = [];
  for (const outbox of outboxes) bundles.push({ outbox, attempts: await attemptRepository.listAttemptsForOutbox(outbox.outboxId), payload: deserializeTargetAwareNotificationPayload(outbox.payloadJson) });
  return bundles;
}

export async function listInboxReplayForTarget(targetId: string, inboxRepository: NotificationInboxRepository): Promise<NotificationInboxRecord[]> { return inboxRepository.listInboxForTarget(targetId); }
export async function listInboxReplayForDecision(decisionId: string, inboxRepository: NotificationInboxRepository): Promise<NotificationInboxRecord[]> { return inboxRepository.listInboxForDecision(decisionId); }
