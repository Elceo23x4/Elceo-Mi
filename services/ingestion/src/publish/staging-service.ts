import type { CanonicalEvent } from '@elceo/types';
import type { PersistedIngestionRun } from '../persistence/contracts';
import type { OutboxRepository, PersistedOutboxItem } from './outbox-contracts';
import { buildEventSnapshotOutboxItem, buildRunCompletedOutboxItem, buildRunFailedOutboxItem } from './payload-builders';

export class IngestionPublicationStagingService {
  constructor(private readonly outboxRepository: OutboxRepository) {}

  async stageRunPublications(run: PersistedIngestionRun, events: CanonicalEvent[], nowIso: string): Promise<PersistedOutboxItem[]> {
    const staged: PersistedOutboxItem[] = [];

    if (run.status === 'failed') {
      const reason = run.fallbackReason ?? 'unknown_failure';
      const failedItem = buildRunFailedOutboxItem(run, nowIso, reason);
      await this.outboxRepository.stageOutboxItem(failedItem);
      staged.push(failedItem);
      return staged;
    }

    const completedItem = buildRunCompletedOutboxItem(run, nowIso);
    await this.outboxRepository.stageOutboxItem(completedItem);
    staged.push(completedItem);

    if (events.length > 0) {
      const snapshotItem = buildEventSnapshotOutboxItem(run, events, nowIso);
      await this.outboxRepository.stageOutboxItem(snapshotItem);
      staged.push(snapshotItem);
    }

    return staged;
  }
}
