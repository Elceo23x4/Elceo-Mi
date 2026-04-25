import type { PortfolioActionItem, PortfolioActorKind } from '@elceo/types';
import type { PortfolioRepository } from '../persistence/contracts';
import { assertValidActionTransition } from './lifecycle';
import { assertValidOrThrow, createId, makeRevision, nowIso, toPersistedAction } from './helpers';
import { deserializePortfolioActionItem } from './serialization';

export type ActionActor = { actorKind: PortfolioActorKind; actorId: string; changedAt?: string };

export class ActionService {
  constructor(private readonly repository: PortfolioRepository) {}

  private async load(actionId: string): Promise<PortfolioActionItem> {
    const row = await this.repository.getActionItemById(actionId);
    if (!row) throw new Error(`action_item_not_found:${actionId}`);
    return deserializePortfolioActionItem(row.actionJson);
  }

  private async saveWithRevision(item: PortfolioActionItem, revisionType: 'created' | 'updated' | 'completed' | 'dismissed' | 'linked', actor: ActionActor): Promise<PortfolioActionItem> {
    assertValidOrThrow(item);
    await this.repository.saveActionItem(toPersistedAction(item));
    await this.repository.saveRevision(
      makeRevision({
        entityKind: 'action_item',
        entityId: item.actionId,
        revisionType,
        changedAt: actor.changedAt ?? item.updatedAt,
        changedByKind: actor.actorKind,
        changedById: actor.actorId,
        snapshotJson: JSON.stringify(item)
      })
    );
    return item;
  }

  async createActionItem(input: Omit<PortfolioActionItem, 'actionId' | 'status' | 'createdAt' | 'updatedAt' | 'completedAt' | 'dismissedAt'> & { actionId?: string }, actor: ActionActor): Promise<PortfolioActionItem> {
    const at = actor.changedAt ?? nowIso();
    const item: PortfolioActionItem = {
      ...input,
      actionId: input.actionId ?? createId('act'),
      status: 'open',
      createdAt: at,
      updatedAt: at,
      completedAt: null,
      dismissedAt: null
    };
    return this.saveWithRevision(item, 'created', actor);
  }

  async linkAction(actionId: string, patch: Partial<Pick<PortfolioActionItem, 'linkedEntryId' | 'linkedPositionId' | 'linkedJournalCaseId' | 'linkedReasoningRunId' | 'linkedNotificationDecisionId'>>, actor: ActionActor): Promise<PortfolioActionItem> {
    const current = await this.load(actionId);
    const next: PortfolioActionItem = { ...current, ...patch, updatedAt: actor.changedAt ?? nowIso() };
    return this.saveWithRevision(next, 'linked', actor);
  }

  async updateActionItem(actionId: string, patch: Partial<Omit<PortfolioActionItem, 'actionId' | 'subjectKind' | 'subjectId' | 'createdAt'>>, actor: ActionActor): Promise<PortfolioActionItem> {
    const current = await this.load(actionId);
    const next: PortfolioActionItem = { ...current, ...patch, updatedAt: actor.changedAt ?? nowIso() };
    return this.saveWithRevision(next, 'updated', actor);
  }

  async completeActionItem(actionId: string, completedAt: string, actor: ActionActor): Promise<PortfolioActionItem> {
    const current = await this.load(actionId);
    assertValidActionTransition(current.status, 'completed');
    const next: PortfolioActionItem = { ...current, status: 'completed', completedAt, dismissedAt: current.dismissedAt, updatedAt: actor.changedAt ?? nowIso() };
    return this.saveWithRevision(next, 'completed', actor);
  }

  async dismissActionItem(actionId: string, dismissedAt: string, actor: ActionActor): Promise<PortfolioActionItem> {
    const current = await this.load(actionId);
    assertValidActionTransition(current.status, 'dismissed');
    const next: PortfolioActionItem = { ...current, status: 'dismissed', dismissedAt, completedAt: current.completedAt, updatedAt: actor.changedAt ?? nowIso() };
    return this.saveWithRevision(next, 'dismissed', actor);
  }
}
