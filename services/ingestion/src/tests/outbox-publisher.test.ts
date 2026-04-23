import { OutboxPublisherService } from '../publish/outbox-publisher-service';
import { MemoryOutboxRepository } from '../publish/outbox-repository';
import type { IngestionPublishTransport } from '../publish/transport';
import type { PersistedOutboxItem } from '../publish/outbox-contracts';

function assert(condition: boolean, message: string): void {
  if (!condition) throw new Error(`Assertion failed: ${message}`);
}

function item(outboxId: string, dedupeKey: string): PersistedOutboxItem {
  return {
    outboxId,
    runId: `run-${outboxId}`,
    requestKey: 'manual|XAU/USD|H1|2026-04-22T10:00:00.000Z',
    itemKind: 'run_completed',
    topic: 'ingestion.canonical.run.completed',
    asset: 'XAU/USD',
    timeframe: 'H1',
    triggerKind: 'manual',
    slotStartAt: null,
    slotEndAt: null,
    schedulerTickId: null,
    dedupeKey,
    payloadJson: '{"ok":true}',
    status: 'pending',
    attemptCount: 0,
    lastAttemptAt: null,
    publishedAt: null,
    lastErrorCode: null,
    lastErrorMessage: null,
    availableAt: '2026-04-22T10:00:00.000Z',
    createdAt: '2026-04-22T10:00:00.000Z',
    updatedAt: '2026-04-22T10:00:00.000Z'
  };
}

class SuccessfulTransport implements IngestionPublishTransport {
  name = 'memory-success';
  async publish(): Promise<void> {}
}

class FlakyTransport implements IngestionPublishTransport {
  name = 'memory-flaky';
  private calls = 0;

  async publish(): Promise<void> {
    this.calls += 1;
    if (this.calls <= 2) throw new Error('transient');
  }
}

export async function runOutboxPublisherTests(): Promise<void> {
  const repo = new MemoryOutboxRepository();
  await repo.stageOutboxItem(item('out-success', 'run_completed|run-out-success'));

  const successful = new OutboxPublisherService(repo, new SuccessfulTransport());
  const successReport = await successful.publishDueOutbox({ nowIso: '2026-04-22T10:00:00.000Z', maxAttemptsBeforeDead: 3 });
  assert(successReport.publishedCount === 1 && successReport.failedCount === 0, 'successful transport should mark item published');

  const successItem = await repo.getOutboxById('out-success');
  assert(successItem?.status === 'published', 'outbox item should move to published status');

  await repo.stageOutboxItem(item('out-fail', 'run_completed|run-out-fail'));
  const flaky = new OutboxPublisherService(repo, new FlakyTransport());

  const failReport1 = await flaky.publishDueOutbox({ nowIso: '2026-04-22T10:10:00.000Z', maxAttemptsBeforeDead: 3 });
  assert(failReport1.failedCount === 1, 'first failure should remain retryable');

  const failItem1 = await repo.getOutboxById('out-fail');
  assert(failItem1?.status === 'failed', 'failed publish should mark failed status');
  assert(failItem1?.availableAt === '2026-04-22T10:15:00.000Z', 'linear backoff should set next available at now + attempt*5m');

  const failReport2 = await flaky.publishDueOutbox({ nowIso: '2026-04-22T10:16:00.000Z', maxAttemptsBeforeDead: 2 });
  assert(failReport2.deadCount === 1, 'should mark dead when attempts reach threshold');

  const failItem2 = await repo.getOutboxById('out-fail');
  assert(failItem2?.status === 'dead', 'dead threshold should mark outbox item as dead');
}
