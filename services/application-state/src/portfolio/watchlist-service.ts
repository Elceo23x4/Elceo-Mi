import { deserializeWatchlistEntry } from './serialization';
import type { PortfolioActorKind, ThesisHealth, WatchlistEntry, WatchlistEntryStatus } from '@elceo/types';
import type { PortfolioRepository } from '../persistence/contracts';
import { assertValidThesisHealthTransition, assertValidWatchlistTransition } from './lifecycle';
import { assertValidOrThrow, createId, makeRevision, nowIso, toPersistedWatchlist } from './helpers';

export type WatchlistActor = { actorKind: PortfolioActorKind; actorId: string; changedAt?: string };

export class WatchlistService {
  constructor(private readonly repository: PortfolioRepository) {}

  private async load(subjectKind: 'user' | 'workspace' | 'ops', subjectId: string, entryId: string): Promise<WatchlistEntry> {
    const row = await this.repository.getWatchlistEntryForSubject(subjectKind, subjectId, entryId);
    if (!row) throw new Error(`watchlist_entry_not_found:${entryId}`);
    return deserializeWatchlistEntry(row.entryJson);
  }

  private async saveWithRevision(
    entry: WatchlistEntry,
    revisionType: 'created' | 'updated' | 'status_changed' | 'thesis_health_changed' | 'archived' | 'linked',
    actor: WatchlistActor
  ): Promise<WatchlistEntry> {
    assertValidOrThrow(entry);
    await this.repository.saveWatchlistEntry(toPersistedWatchlist(entry));
    await this.repository.saveRevision(
      makeRevision({
        entityKind: 'watchlist_entry',
        entityId: entry.entryId,
        revisionType,
        changedAt: actor.changedAt ?? entry.updatedAt,
        changedByKind: actor.actorKind,
        changedById: actor.actorId,
        snapshotJson: JSON.stringify(entry)
      })
    );
    return entry;
  }

  async createWatchlistEntry(input: Omit<WatchlistEntry, 'createdAt' | 'updatedAt' | 'entryId'> & { entryId?: string }, actor: WatchlistActor): Promise<WatchlistEntry> {
    const at = actor.changedAt ?? nowIso();
    const entry: WatchlistEntry = { ...input, entryId: input.entryId ?? createId('wentry'), createdAt: at, updatedAt: at };
    return this.saveWithRevision(entry, 'created', actor);
  }

  async updateWatchlistEntry(subjectKind: 'user' | 'workspace' | 'ops', subjectId: string, entryId: string, patch: Partial<Omit<WatchlistEntry, 'entryId' | 'subjectKind' | 'subjectId' | 'createdAt'>>, actor: WatchlistActor): Promise<WatchlistEntry> {
    const current = await this.load(subjectKind, subjectId, entryId);
    const next: WatchlistEntry = { ...current, ...patch, updatedAt: actor.changedAt ?? nowIso() };
    return this.saveWithRevision(next, 'updated', actor);
  }

  async linkWatchlistEntry(subjectKind: 'user' | 'workspace' | 'ops', subjectId: string, entryId: string, patch: Partial<Pick<WatchlistEntry, 'linkedReasoningRunId' | 'linkedSnapshotId' | 'linkedDriftId' | 'linkedJournalCaseId'>>, actor: WatchlistActor): Promise<WatchlistEntry> {
    const current = await this.load(subjectKind, subjectId, entryId);
    const next: WatchlistEntry = { ...current, ...patch, updatedAt: actor.changedAt ?? nowIso() };
    return this.saveWithRevision(next, 'linked', actor);
  }

  async changeWatchlistStatus(subjectKind: 'user' | 'workspace' | 'ops', subjectId: string, entryId: string, status: WatchlistEntryStatus, actor: WatchlistActor): Promise<WatchlistEntry> {
    const current = await this.load(subjectKind, subjectId, entryId);
    assertValidWatchlistTransition(current.status, status);
    const next: WatchlistEntry = { ...current, status, updatedAt: actor.changedAt ?? nowIso() };
    return this.saveWithRevision(next, status === 'archived' ? 'archived' : 'status_changed', actor);
  }

  async changeWatchlistThesisHealth(subjectKind: 'user' | 'workspace' | 'ops', subjectId: string, entryId: string, thesisHealth: ThesisHealth, actor: WatchlistActor, explicitRecovery = false): Promise<WatchlistEntry> {
    const current = await this.load(subjectKind, subjectId, entryId);
    assertValidThesisHealthTransition(current.thesisHealth, thesisHealth, explicitRecovery);
    const next: WatchlistEntry = { ...current, thesisHealth, updatedAt: actor.changedAt ?? nowIso() };
    return this.saveWithRevision(next, 'thesis_health_changed', actor);
  }

  async archiveWatchlistEntry(subjectKind: 'user' | 'workspace' | 'ops', subjectId: string, entryId: string, actor: WatchlistActor): Promise<WatchlistEntry> {
    return this.changeWatchlistStatus(subjectKind, subjectId, entryId, 'archived', actor);
  }
}
