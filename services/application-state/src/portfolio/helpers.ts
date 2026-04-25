import { validatePortfolioActionItem, validatePositionRecord, validatePortfolioRevisionRecord, validateWatchlistEntry } from '@elceo/schemas';
import type {
  PortfolioActionItem,
  PortfolioActorKind,
  PortfolioEntityKind,
  PortfolioRevisionRecord,
  PortfolioRevisionType,
  PositionRecord,
  WatchlistEntry
} from '@elceo/types';
import type {
  PersistedPortfolioActionItemRecord,
  PersistedPortfolioRevisionRecord,
  PersistedPositionRecord,
  PersistedWatchlistEntryRecord
} from '../persistence/contracts';
import { buildPortfolioRevisionSummary } from './lifecycle';
import {
  serializePortfolioActionItem,
  serializePositionRecord,
  serializeWatchlistEntry
} from './serialization';

export function nowIso(): string {
  return new Date().toISOString();
}

export function createId(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

export function assertValidOrThrow(input: WatchlistEntry | PositionRecord | PortfolioActionItem): void {
  if ('entryId' in input) {
    const result = validateWatchlistEntry(input);
    if (result.ok === false) throw new Error(`invalid_watchlist_entry:${result.errors.join('; ')}`);
    return;
  }
  if ('positionId' in input) {
    const result = validatePositionRecord(input);
    if (result.ok === false) throw new Error(`invalid_position_record:${result.errors.join('; ')}`);
    return;
  }
  const result = validatePortfolioActionItem(input);
  if (result.ok === false) throw new Error(`invalid_action_item:${result.errors.join('; ')}`);
}

export function toPersistedWatchlist(entry: WatchlistEntry): PersistedWatchlistEntryRecord {
  return {
    entryId: entry.entryId,
    subjectKind: entry.subjectKind,
    subjectId: entry.subjectId,
    asset: entry.asset,
    timeframe: entry.timeframe,
    priority: entry.priority,
    status: entry.status,
    thesisHealth: entry.thesisHealth,
    note: entry.note,
    linkedReasoningRunId: entry.linkedReasoningRunId,
    linkedSnapshotId: entry.linkedSnapshotId,
    linkedDriftId: entry.linkedDriftId,
    linkedJournalCaseId: entry.linkedJournalCaseId,
    createdAt: entry.createdAt,
    updatedAt: entry.updatedAt,
    entryJson: serializeWatchlistEntry(entry)
  };
}

export function toPersistedPosition(position: PositionRecord): PersistedPositionRecord {
  return {
    positionId: position.positionId,
    subjectKind: position.subjectKind,
    subjectId: position.subjectId,
    asset: position.asset,
    timeframe: position.timeframe,
    status: position.status,
    direction: position.direction,
    entryPrice: position.entryPrice,
    stopLoss: position.stopLoss,
    takeProfitLevelsJson: JSON.stringify(position.takeProfitLevels),
    size: position.size,
    openedAt: position.openedAt,
    updatedAt: position.updatedAt,
    closedAt: position.closedAt,
    thesisHealth: position.thesisHealth,
    linkedJournalCaseId: position.linkedJournalCaseId,
    linkedReasoningRunId: position.linkedReasoningRunId,
    linkedSnapshotId: position.linkedSnapshotId,
    linkedDriftId: position.linkedDriftId,
    note: position.note,
    positionJson: serializePositionRecord(position)
  };
}

export function toPersistedAction(action: PortfolioActionItem): PersistedPortfolioActionItemRecord {
  return {
    actionId: action.actionId,
    subjectKind: action.subjectKind,
    subjectId: action.subjectId,
    kind: action.kind,
    status: action.status,
    priority: action.priority,
    asset: action.asset,
    timeframe: action.timeframe,
    headline: action.headline,
    rationale: action.rationale,
    linkedEntryId: action.linkedEntryId,
    linkedPositionId: action.linkedPositionId,
    linkedJournalCaseId: action.linkedJournalCaseId,
    linkedReasoningRunId: action.linkedReasoningRunId,
    linkedNotificationDecisionId: action.linkedNotificationDecisionId,
    createdAt: action.createdAt,
    updatedAt: action.updatedAt,
    completedAt: action.completedAt,
    dismissedAt: action.dismissedAt,
    actionJson: serializePortfolioActionItem(action)
  };
}

export function makeRevision(params: {
  entityKind: PortfolioEntityKind;
  entityId: string;
  revisionType: PortfolioRevisionType;
  changedAt: string;
  changedByKind: PortfolioActorKind;
  changedById: string;
  snapshotJson: string;
}): PersistedPortfolioRevisionRecord {
  const revision: PortfolioRevisionRecord = {
    revisionId: createId('prev'),
    entityKind: params.entityKind,
    entityId: params.entityId,
    revisionType: params.revisionType,
    changedAt: params.changedAt,
    changedByKind: params.changedByKind,
    changedById: params.changedById,
    summary: buildPortfolioRevisionSummary(params.revisionType),
    snapshotJson: params.snapshotJson
  };
  const validated = validatePortfolioRevisionRecord(revision);
  if (validated.ok === false) throw new Error(`invalid_portfolio_revision:${validated.errors.join('; ')}`);
  return revision;
}
