import type { NotificationChannel } from '@elceo/types';
import type { EmailDeliveryPayload, InAppDeliveryPayload, NotificationDeliveryChannelPayload, PushDeliveryPayload } from './channel-contracts';
import type { NotificationOutboxRepository, NotificationOutboxAttemptRepository } from '../persistence/contracts';
import type { NotificationOutboxReplayBundle } from './outbox-contracts';

function parseJson(value: string): unknown {
  try {
    return JSON.parse(value) as unknown;
  } catch {
    throw new Error('malformed_json');
  }
}

function assertRecord(input: unknown, field: string): Record<string, unknown> {
  if (typeof input !== 'object' || input === null || Array.isArray(input)) {
    throw new Error(`invalid_payload:${field}`);
  }
  return input as Record<string, unknown>;
}

function assertString(input: unknown, field: string): string {
  if (typeof input !== 'string') throw new Error(`invalid_payload:${field}`);
  return input;
}

export function deserializeNotificationChannelPayload(channel: NotificationChannel, payloadJson: string): NotificationDeliveryChannelPayload {
  const parsed = assertRecord(parseJson(payloadJson), 'root');

  if (channel === 'in_app') {
    const payload: InAppDeliveryPayload = {
      title: assertString(parsed.title, 'title'),
      body: assertString(parsed.body, 'body'),
      decisionId: assertString(parsed.decisionId, 'decisionId'),
      ruleKey: assertString(parsed.ruleKey, 'ruleKey'),
      asset: assertString(parsed.asset, 'asset'),
      timeframe: assertString(parsed.timeframe, 'timeframe') as InAppDeliveryPayload['timeframe'],
      createdAt: assertString(parsed.createdAt, 'createdAt')
    };
    return payload;
  }
  if (channel === 'push') {
    const payload: PushDeliveryPayload = {
      title: assertString(parsed.title, 'title'),
      body: assertString(parsed.body, 'body'),
      decisionId: assertString(parsed.decisionId, 'decisionId'),
      ruleKey: assertString(parsed.ruleKey, 'ruleKey'),
      asset: assertString(parsed.asset, 'asset'),
      timeframe: assertString(parsed.timeframe, 'timeframe') as PushDeliveryPayload['timeframe'],
      createdAt: assertString(parsed.createdAt, 'createdAt')
    };
    return payload;
  }
  if (channel === 'email') {
    const payload: EmailDeliveryPayload = {
      subject: assertString(parsed.subject, 'subject'),
      body: assertString(parsed.body, 'body'),
      decisionId: assertString(parsed.decisionId, 'decisionId'),
      ruleKey: assertString(parsed.ruleKey, 'ruleKey'),
      asset: assertString(parsed.asset, 'asset'),
      timeframe: assertString(parsed.timeframe, 'timeframe') as EmailDeliveryPayload['timeframe'],
      createdAt: assertString(parsed.createdAt, 'createdAt')
    };
    return payload;
  }

  throw new Error(`unsupported_channel:${channel}`);
}

export async function getNotificationOutboxReplayById(
  outboxId: string,
  outboxRepository: NotificationOutboxRepository,
  attemptRepository: NotificationOutboxAttemptRepository
): Promise<NotificationOutboxReplayBundle | null> {
  const outbox = await outboxRepository.getOutboxById(outboxId);
  if (!outbox) return null;
  const attempts = await attemptRepository.listAttemptsForOutbox(outboxId);
  const payload = deserializeNotificationChannelPayload(outbox.channel, outbox.payloadJson);
  return { outbox, attempts, payload };
}

export async function getNotificationOutboxReplayByKey(
  outboxKey: string,
  outboxRepository: NotificationOutboxRepository,
  attemptRepository: NotificationOutboxAttemptRepository
): Promise<NotificationOutboxReplayBundle | null> {
  const outbox = await outboxRepository.getOutboxByKey(outboxKey);
  if (!outbox) return null;
  const attempts = await attemptRepository.listAttemptsForOutbox(outbox.outboxId);
  const payload = deserializeNotificationChannelPayload(outbox.channel, outbox.payloadJson);
  return { outbox, attempts, payload };
}

export async function listNotificationOutboxReplayForDecision(
  decisionId: string,
  outboxRepository: NotificationOutboxRepository,
  attemptRepository: NotificationOutboxAttemptRepository
): Promise<NotificationOutboxReplayBundle[]> {
  const outboxes = await outboxRepository.listOutboxForDecision(decisionId);
  const bundles: NotificationOutboxReplayBundle[] = [];
  for (const outbox of outboxes) {
    const attempts = await attemptRepository.listAttemptsForOutbox(outbox.outboxId);
    const payload = deserializeNotificationChannelPayload(outbox.channel, outbox.payloadJson);
    bundles.push({ outbox, attempts, payload });
  }
  return bundles;
}
