import { MemoryOutboxRepository } from '../publish/outbox-repository';
import type { PersistedOutboxItem } from '../publish/outbox-contracts';

function assert(condition: boolean, message: string): void {
  if (!condition) throw new Error(`Assertion failed: ${message}`);
}

function itemFixture(id: string, dedupeKey: string): PersistedOutboxItem {
  return {
    outboxId: id,
    runId: 'run-1',
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

export async function runOutboxRepositoryTests(): Promise<void> {
  const repo = new MemoryOutboxRepository();
  await repo.stageOutboxItem(itemFixture('out-1', 'run_completed|run-1'));
  await repo.stageOutboxItem(itemFixture('out-2', 'run_completed|run-1'));

  const byDedupe = await repo.getOutboxByDedupeKey('run_completed|run-1');
  assert(byDedupe?.outboxId === 'out-1', 'duplicate dedupe staging should keep single durable intent');

  const due = await repo.listDueOutboxItems(10, '2026-04-22T10:05:00.000Z');
  assert(due.length === 1, 'listDue should return pending due records');

  await repo.markOutboxPublishing('out-1', '2026-04-22T10:06:00.000Z');
  await repo.markOutboxFailed('out-1', '2026-04-22T10:06:00.000Z', 'transport_error', 'boom', '2026-04-22T10:11:00.000Z');

  const failed = await repo.getOutboxById('out-1');
  assert(failed?.status === 'failed' && failed.attemptCount === 1, 'failed transition should increment attempt count');

  await repo.saveAttempt({
    attemptId: 'attempt-1',
    outboxId: 'out-1',
    attemptedAt: '2026-04-22T10:06:00.000Z',
    transport: 'memory',
    success: false,
    errorCode: 'transport_error',
    errorMessage: 'boom'
  });

  const attempts = await repo.listAttemptsForOutbox('out-1');
  assert(attempts.length === 1 && attempts[0]?.success === false, 'attempt rows should persist');

  await repo.markOutboxDead('out-1', '2026-04-22T10:20:00.000Z', 'dead_threshold_reached', 'boom');
  const dead = await repo.getOutboxById('out-1');
  assert(dead?.status === 'dead', 'dead transition should be persisted');

  await repo.markOutboxPublished('out-1', '2026-04-22T10:21:00.000Z');
  const published = await repo.getOutboxById('out-1');
  assert(published?.status === 'published' && Boolean(published.publishedAt), 'published transition should set publishedAt');
}
