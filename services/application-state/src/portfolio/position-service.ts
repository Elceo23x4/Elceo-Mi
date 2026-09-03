import type { PortfolioActorKind, PositionRecord, ThesisHealth } from '@elceo/types';
import type { PortfolioRepository } from '../persistence/contracts';
import { assertValidPositionTransition, assertValidThesisHealthTransition } from './lifecycle';
import { assertValidOrThrow, createId, makeRevision, nowIso, toPersistedPosition } from './helpers';
import { deserializePositionRecord } from './serialization';

export type PositionActor = { actorKind: PortfolioActorKind; actorId: string; changedAt?: string };

export class PositionService {
  constructor(private readonly repository: PortfolioRepository) {}

  private async load(subjectKind: 'user' | 'workspace' | 'ops', subjectId: string, positionId: string): Promise<PositionRecord> {
    const row = await this.repository.getPositionForSubject(subjectKind, subjectId, positionId);
    if (!row) throw new Error(`position_not_found:${positionId}`);
    return deserializePositionRecord(row.positionJson);
  }

  private async saveWithRevision(
    position: PositionRecord,
    revisionType: 'created' | 'updated' | 'status_changed' | 'closed' | 'canceled' | 'thesis_health_changed' | 'linked',
    actor: PositionActor
  ): Promise<PositionRecord> {
    assertValidOrThrow(position);
    const saved = await this.repository.savePosition(toPersistedPosition(position));
    if (!saved) throw new Error(`position_not_found:${position.positionId}`);
    await this.repository.saveRevision(
      makeRevision({
        entityKind: 'position',
        entityId: position.positionId,
        revisionType,
        changedAt: actor.changedAt ?? position.updatedAt,
        changedByKind: actor.actorKind,
        changedById: actor.actorId,
        snapshotJson: JSON.stringify(position)
      })
    );
    return position;
  }

  async createProposedPosition(input: Omit<PositionRecord, 'positionId' | 'status' | 'updatedAt' | 'openedAt' | 'closedAt'> & { positionId?: string }, actor: PositionActor): Promise<PositionRecord> {
    const at = actor.changedAt ?? nowIso();
    const position: PositionRecord = {
      ...input,
      positionId: input.positionId ?? createId('pos'),
      status: 'proposed',
      openedAt: null,
      closedAt: null,
      updatedAt: at
    };
    return this.saveWithRevision(position, 'created', actor);
  }

  async openPosition(subjectKind: 'user' | 'workspace' | 'ops', subjectId: string, positionId: string, openedAt: string, patch: Partial<Omit<PositionRecord, 'positionId' | 'subjectKind' | 'subjectId' | 'asset' | 'timeframe'>> = {}, actor: PositionActor): Promise<PositionRecord> {
    const current = await this.load(subjectKind, subjectId, positionId);
    assertValidPositionTransition(current.status, 'open');
    const next: PositionRecord = { ...current, ...patch, status: 'open', openedAt, closedAt: null, updatedAt: actor.changedAt ?? nowIso() };
    return this.saveWithRevision(next, 'status_changed', actor);
  }

  async reducePosition(subjectKind: 'user' | 'workspace' | 'ops', subjectId: string, positionId: string, patch: Partial<Omit<PositionRecord, 'positionId' | 'subjectKind' | 'subjectId' | 'asset' | 'timeframe'>> = {}, actor: PositionActor): Promise<PositionRecord> {
    const current = await this.load(subjectKind, subjectId, positionId);
    assertValidPositionTransition(current.status, 'reducing');
    const next: PositionRecord = { ...current, ...patch, status: 'reducing', updatedAt: actor.changedAt ?? nowIso() };
    return this.saveWithRevision(next, 'status_changed', actor);
  }

  async closePosition(subjectKind: 'user' | 'workspace' | 'ops', subjectId: string, positionId: string, closedAt: string, patch: Partial<Omit<PositionRecord, 'positionId' | 'subjectKind' | 'subjectId' | 'asset' | 'timeframe'>> = {}, actor: PositionActor): Promise<PositionRecord> {
    const current = await this.load(subjectKind, subjectId, positionId);
    if (!(current.status === 'open' || current.status === 'reducing')) throw new Error(`invalid_position_transition:${current.status}_to_closed`);
    const next: PositionRecord = { ...current, ...patch, status: 'closed', closedAt, updatedAt: actor.changedAt ?? nowIso() };
    return this.saveWithRevision(next, 'closed', actor);
  }

  async cancelPosition(subjectKind: 'user' | 'workspace' | 'ops', subjectId: string, positionId: string, actor: PositionActor): Promise<PositionRecord> {
    const current = await this.load(subjectKind, subjectId, positionId);
    assertValidPositionTransition(current.status, 'canceled');
    const next: PositionRecord = { ...current, status: 'canceled', updatedAt: actor.changedAt ?? nowIso() };
    return this.saveWithRevision(next, 'canceled', actor);
  }

  async linkPosition(subjectKind: 'user' | 'workspace' | 'ops', subjectId: string, positionId: string, patch: Partial<Pick<PositionRecord, 'linkedJournalCaseId' | 'linkedReasoningRunId' | 'linkedSnapshotId' | 'linkedDriftId'>>, actor: PositionActor): Promise<PositionRecord> {
    const current = await this.load(subjectKind, subjectId, positionId);
    const next: PositionRecord = { ...current, ...patch, updatedAt: actor.changedAt ?? nowIso() };
    return this.saveWithRevision(next, 'linked', actor);
  }

  async updatePosition(subjectKind: 'user' | 'workspace' | 'ops', subjectId: string, positionId: string, patch: Partial<Omit<PositionRecord, 'positionId' | 'subjectKind' | 'subjectId' | 'asset' | 'timeframe'>>, actor: PositionActor): Promise<PositionRecord> {
    const current = await this.load(subjectKind, subjectId, positionId);
    const next: PositionRecord = { ...current, ...patch, updatedAt: actor.changedAt ?? nowIso() };
    return this.saveWithRevision(next, 'updated', actor);
  }

  async changePositionThesisHealth(subjectKind: 'user' | 'workspace' | 'ops', subjectId: string, positionId: string, thesisHealth: ThesisHealth, actor: PositionActor, explicitRecovery = false): Promise<PositionRecord> {
    const current = await this.load(subjectKind, subjectId, positionId);
    assertValidThesisHealthTransition(current.thesisHealth, thesisHealth, explicitRecovery);
    const next: PositionRecord = { ...current, thesisHealth, updatedAt: actor.changedAt ?? nowIso() };
    return this.saveWithRevision(next, 'thesis_health_changed', actor);
  }
}
