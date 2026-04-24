import type { NotificationInboxRecord } from '@elceo/types';
import type { NotificationInboxRepository, NotificationTargetRepository } from '../persistence/contracts';
import type { InboxListQuery } from './contracts';

export class NotificationInboxManagementService {
  constructor(private readonly inboxRepository: NotificationInboxRepository, private readonly targetRepository: NotificationTargetRepository) {}

  async listInbox(query: InboxListQuery): Promise<NotificationInboxRecord[]> {
    const normalizedLimit = query.limit ?? 100;
    const includeArchived = query.includeArchived ?? false;

    if (query.subjectKind && query.subjectId) {
      const targets = await this.targetRepository.listTargetsForSubject(query.subjectKind, query.subjectId);
      const targetIds = query.targetId ? targets.filter((target) => target.targetId === query.targetId).map((target) => target.targetId) : targets.map((target) => target.targetId);
      if (targetIds.length === 0) return [];

      const dedupe = new Map<string, NotificationInboxRecord>();
      for (const targetId of targetIds) {
        const items = await this.inboxRepository.listInbox({ targetId, includeArchived: true, limit: 1000 });
        for (const item of items) {
          if (!dedupe.has(item.inboxId)) dedupe.set(item.inboxId, item);
        }
      }

      return [...dedupe.values()]
        .filter((item) => (query.unreadOnly ? item.readAt === null : true))
        .filter((item) => (includeArchived ? true : item.archivedAt === null))
        .sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt) || a.inboxId.localeCompare(b.inboxId))
        .slice(0, normalizedLimit);
    }

    const rows = await this.inboxRepository.listInbox({
      ...(query.targetId ? { targetId: query.targetId } : {}),
      ...(query.unreadOnly !== undefined ? { unreadOnly: query.unreadOnly } : {}),
      includeArchived,
      limit: normalizedLimit
    });
    return rows;
  }

  async markRead(inboxId: string, readAt = new Date().toISOString()): Promise<void> { await this.inboxRepository.markRead(inboxId, readAt); }
  async markUnread(inboxId: string): Promise<void> { await this.inboxRepository.markUnread(inboxId); }
  async archive(inboxId: string, archivedAt = new Date().toISOString()): Promise<void> { await this.inboxRepository.markArchived(inboxId, archivedAt); }
  async unarchive(inboxId: string): Promise<void> { await this.inboxRepository.markUnarchived(inboxId); }
}
