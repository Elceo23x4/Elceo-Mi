import type { PortfolioEntityKind } from '@elceo/types';
import type { PortfolioRepository } from '../persistence/contracts';
import { deserializeCanonicalPortfolioSnapshot, deserializePortfolioActionItem, deserializePositionRecord, deserializeWatchlistEntry } from './serialization';

export type PortfolioEntityReplay = {
  entityKind: PortfolioEntityKind;
  entityId: string;
  current: unknown;
  revisions: {
    revisionId: string;
    revisionType: string;
    changedAt: string;
    summary: string;
    snapshotJson: string;
  }[];
};

export async function getPortfolioEntityReplay(repository: PortfolioRepository, subjectKind: 'user' | 'workspace' | 'ops', subjectId: string, entityKind: PortfolioEntityKind, entityId: string): Promise<PortfolioEntityReplay | null> {
  let current: unknown;
  if (entityKind === 'watchlist_entry') {
    const row = await repository.getWatchlistEntryForSubject(subjectKind, subjectId, entityId);
    if (!row) return null;
    current = deserializeWatchlistEntry(row.entryJson);
  } else if (entityKind === 'position') {
    const row = await repository.getPositionForSubject(subjectKind, subjectId, entityId);
    if (!row) return null;
    current = deserializePositionRecord(row.positionJson);
  } else {
    const row = await repository.getActionItemForSubject(subjectKind, subjectId, entityId);
    if (!row) return null;
    current = deserializePortfolioActionItem(row.actionJson);
  }

  const revisions = await repository.listRevisionsForEntityForSubject(subjectKind, subjectId, entityKind, entityId);
  return { entityKind, entityId, current, revisions };
}

export async function getPortfolioSnapshotReplay(repository: PortfolioRepository, subjectKind: 'user' | 'workspace' | 'ops', subjectId: string) {
  const latest = await repository.getLatestSnapshot(subjectKind, subjectId);
  if (!latest) return null;
  return {
    snapshotId: latest.snapshotId,
    snapshot: deserializeCanonicalPortfolioSnapshot(latest.snapshotJson)
  };
}
