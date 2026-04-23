import type { OutboxRepository } from './outbox-contracts';
import type { IngestionPublishTopic } from './topic-contracts';
import type { IngestionPublishTransport } from './transport';

export type OutboxPublishReportItem = {
  outboxId: string;
  topic: IngestionPublishTopic;
  success: boolean;
  dead: boolean;
  attemptCount: number;
};

export type OutboxPublishReport = {
  startedAt: string;
  endedAt: string;
  durationMs: number;
  attemptedCount: number;
  publishedCount: number;
  failedCount: number;
  deadCount: number;
  items: OutboxPublishReportItem[];
};

function buildAttemptId(outboxId: string, attemptedAt: string): string {
  return `attempt|${outboxId}|${attemptedAt}`;
}

function computeNextAvailableAt(nowIso: string, attemptCount: number): string {
  const next = new Date(nowIso);
  next.setUTCMinutes(next.getUTCMinutes() + attemptCount * 5);
  return next.toISOString();
}

export class OutboxPublisherService {
  constructor(private readonly outboxRepository: OutboxRepository, private readonly transport: IngestionPublishTransport) {}

  async publishDueOutbox(params: { nowIso: string; limit?: number; maxAttemptsBeforeDead?: number }): Promise<OutboxPublishReport> {
    const startedAt = params.nowIso;
    const limit = params.limit ?? 100;
    const maxAttemptsBeforeDead = params.maxAttemptsBeforeDead ?? 5;

    const dueItems = await this.outboxRepository.listDueOutboxItems(limit, startedAt);
    const reportItems: OutboxPublishReportItem[] = [];
    let publishedCount = 0;
    let failedCount = 0;
    let deadCount = 0;

    for (const outbox of dueItems) {
      const attemptedAt = params.nowIso;
      await this.outboxRepository.markOutboxPublishing(outbox.outboxId, attemptedAt);

      try {
        await this.transport.publish(outbox.topic, outbox.payloadJson);

        await this.outboxRepository.saveAttempt({
          attemptId: buildAttemptId(outbox.outboxId, attemptedAt),
          outboxId: outbox.outboxId,
          attemptedAt,
          transport: this.transport.name,
          success: true,
          errorCode: null,
          errorMessage: null
        });

        await this.outboxRepository.markOutboxPublished(outbox.outboxId, attemptedAt);

        publishedCount += 1;
        reportItems.push({
          outboxId: outbox.outboxId,
          topic: outbox.topic,
          success: true,
          dead: false,
          attemptCount: outbox.attemptCount + 1
        });
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'publish failed';
        const nextAttemptCount = outbox.attemptCount + 1;

        await this.outboxRepository.saveAttempt({
          attemptId: buildAttemptId(outbox.outboxId, attemptedAt),
          outboxId: outbox.outboxId,
          attemptedAt,
          transport: this.transport.name,
          success: false,
          errorCode: 'transport_error',
          errorMessage
        });

        if (nextAttemptCount >= maxAttemptsBeforeDead) {
          await this.outboxRepository.markOutboxDead(outbox.outboxId, attemptedAt, 'dead_threshold_reached', errorMessage);
          deadCount += 1;
          reportItems.push({
            outboxId: outbox.outboxId,
            topic: outbox.topic,
            success: false,
            dead: true,
            attemptCount: nextAttemptCount
          });
        } else {
          const nextAvailableAt = computeNextAvailableAt(attemptedAt, nextAttemptCount);
          await this.outboxRepository.markOutboxFailed(outbox.outboxId, attemptedAt, 'transport_error', errorMessage, nextAvailableAt);
          failedCount += 1;
          reportItems.push({
            outboxId: outbox.outboxId,
            topic: outbox.topic,
            success: false,
            dead: false,
            attemptCount: nextAttemptCount
          });
        }
      }
    }

    const endedAt = new Date().toISOString();

    return {
      startedAt,
      endedAt,
      durationMs: Math.max(0, Date.parse(endedAt) - Date.parse(startedAt)),
      attemptedCount: dueItems.length,
      publishedCount,
      failedCount,
      deadCount,
      items: reportItems
    };
  }
}
