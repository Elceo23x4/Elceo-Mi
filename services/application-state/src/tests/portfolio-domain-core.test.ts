import { validateCanonicalPortfolioSnapshot } from '@elceo/schemas';
import { deserializeCanonicalPortfolioSnapshot, serializeCanonicalPortfolioSnapshot } from '../portfolio/serialization';
import {
  assertValidActionTransition,
  assertValidPositionTransition,
  assertValidThesisHealthTransition,
  assertValidWatchlistTransition,
  buildPortfolioRevisionSummary
} from '../portfolio/lifecycle';
import { MemoryPortfolioRepository } from '../persistence/portfolio-repository';
import { WatchlistService } from '../portfolio/watchlist-service';
import { PositionService } from '../portfolio/position-service';
import { ActionService } from '../portfolio/action-service';
import { derivePortfolioActionCandidates } from '../portfolio/action-derivation';
import { PortfolioSnapshotService } from '../portfolio/snapshot-service';
import { PortfolioQueryService } from '../portfolio/query-service';
import { getPortfolioEntityReplay } from '../portfolio/replay';
import { PortfolioLinkageService } from '../portfolio/linkage';
import { CanonicalPortfolioBoundaryService } from '../runtime/canonical-portfolio-boundary';

function assert(condition: boolean, message: string): void {
  if (!condition) throw new Error(message);
}

function expectThrows(fn: () => unknown, message: string): void {
  let didThrow = false;
  try {
    fn();
  } catch {
    didThrow = true;
  }
  assert(didThrow, message);
}

async function expectReject(promise: Promise<unknown>, message: string): Promise<void> {
  let didThrow = false;
  try {
    await promise;
  } catch {
    didThrow = true;
  }
  assert(didThrow, message);
}

export async function runPortfolioDomainCoreTests(): Promise<void> {
  const repository = new MemoryPortfolioRepository();
  const watchlist = new WatchlistService(repository);
  const position = new PositionService(repository);
  const action = new ActionService(repository);
  const snapshotService = new PortfolioSnapshotService(repository);
  const query = new PortfolioQueryService(repository);
  const linkage = new PortfolioLinkageService(repository);
  const boundary = new CanonicalPortfolioBoundaryService(repository);
  const actor = { actorKind: 'user' as const, actorId: 'u-1', changedAt: '2026-04-25T08:00:00.000Z' };

  const createdWatch = await watchlist.createWatchlistEntry(
    {
      subjectKind: 'user',
      subjectId: 'u-1',
      asset: 'XAU/USD',
      timeframe: 'H1',
      priority: 'high',
      status: 'watching',
      thesisHealth: 'stable',
      note: 'London continuation watch',
      linkedReasoningRunId: null,
      linkedSnapshotId: null,
      linkedDriftId: null,
      linkedJournalCaseId: null
    },
    actor
  );
  assert(createdWatch.status === 'watching', 'watchlist create should set requested state');

  await watchlist.changeWatchlistStatus('user', 'u-1', createdWatch.entryId, 'thesis_active', { ...actor, changedAt: '2026-04-25T08:02:00.000Z' });
  await watchlist.changeWatchlistThesisHealth('user', 'u-1', createdWatch.entryId, 'weakening', { ...actor, changedAt: '2026-04-25T08:03:00.000Z' });
  await watchlist.archiveWatchlistEntry('user', 'u-1', createdWatch.entryId, { ...actor, changedAt: '2026-04-25T08:04:00.000Z' });

  const proposed = await position.createProposedPosition(
    {
      subjectKind: 'user',
      subjectId: 'u-1',
      asset: 'BTC/USD',
      timeframe: 'M15',
      direction: 'long',
      entryPrice: null,
      stopLoss: null,
      takeProfitLevels: [95200, 96000],
      size: null,
      thesisHealth: 'strong',
      linkedJournalCaseId: null,
      linkedReasoningRunId: null,
      linkedSnapshotId: null,
      linkedDriftId: null,
      note: null
    },
    { ...actor, changedAt: '2026-04-25T09:00:00.000Z' }
  );
  const opened = await position.openPosition('user', 'u-1', proposed.positionId, '2026-04-25T09:05:00.000Z', { entryPrice: 95000, size: 0.5 }, { ...actor, changedAt: '2026-04-25T09:05:00.000Z' });
  const reducing = await position.reducePosition('user', 'u-1', opened.positionId, { size: 0.3 }, { ...actor, changedAt: '2026-04-25T09:10:00.000Z' });
  const closed = await position.closePosition('user', 'u-1', reducing.positionId, '2026-04-25T09:20:00.000Z', { note: 'Closed per invalidation risk' }, { ...actor, changedAt: '2026-04-25T09:20:00.000Z' });
  assert(closed.status === 'closed', 'position should close deterministically');

  const cancelable = await position.createProposedPosition(
    {
      subjectKind: 'user',
      subjectId: 'u-1',
      asset: 'EUR/USD',
      timeframe: 'H4',
      direction: 'short',
      entryPrice: null,
      stopLoss: null,
      takeProfitLevels: [],
      size: null,
      thesisHealth: 'stable',
      linkedJournalCaseId: null,
      linkedReasoningRunId: null,
      linkedSnapshotId: null,
      linkedDriftId: null,
      note: null
    },
    { ...actor, changedAt: '2026-04-25T09:30:00.000Z' }
  );
  const canceled = await position.cancelPosition('user', 'u-1', cancelable.positionId, { ...actor, changedAt: '2026-04-25T09:35:00.000Z' });
  assert(canceled.status === 'canceled', 'proposed position should cancel deterministically');

  const actionItem = await action.createActionItem(
    {
      subjectKind: 'user',
      subjectId: 'u-1',
      kind: 'review_thesis',
      priority: 'critical',
      asset: 'BTC/USD',
      timeframe: 'M15',
      headline: 'Review current thesis.',
      rationale: 'Recent signals indicate thesis quality may need reassessment.',
      linkedEntryId: null,
      linkedPositionId: proposed.positionId,
      linkedJournalCaseId: null,
      linkedReasoningRunId: null,
      linkedNotificationDecisionId: null
    },
    { ...actor, changedAt: '2026-04-25T10:00:00.000Z' }
  );
  await action.updateActionItem('user', 'u-1', actionItem.actionId, { headline: 'Review thesis now.' }, { ...actor, changedAt: '2026-04-25T10:01:00.000Z' });
  await action.completeActionItem('user', 'u-1', actionItem.actionId, '2026-04-25T10:02:00.000Z', { ...actor, changedAt: '2026-04-25T10:02:00.000Z' });

  const dismissed = await action.createActionItem(
    {
      subjectKind: 'user',
      subjectId: 'u-1',
      kind: 'update_journal',
      priority: 'medium',
      asset: null,
      timeframe: null,
      headline: 'Update journal record.',
      rationale: 'A portfolio-linked event requires journal follow-through.',
      linkedEntryId: null,
      linkedPositionId: null,
      linkedJournalCaseId: null,
      linkedReasoningRunId: null,
      linkedNotificationDecisionId: null
    },
    { ...actor, changedAt: '2026-04-25T10:03:00.000Z' }
  );
  await action.dismissActionItem('user', 'u-1', dismissed.actionId, '2026-04-25T10:04:00.000Z', { ...actor, changedAt: '2026-04-25T10:04:00.000Z' });

  const liveEntry = await watchlist.createWatchlistEntry(
    {
      subjectKind: 'user',
      subjectId: 'u-1',
      asset: 'BTC/USD',
      timeframe: 'M15',
      priority: 'critical',
      status: 'readiness_pending',
      thesisHealth: 'invalidated',
      note: null,
      linkedReasoningRunId: null,
      linkedSnapshotId: null,
      linkedDriftId: null,
      linkedJournalCaseId: null
    },
    { ...actor, changedAt: '2026-04-25T10:05:00.000Z' }
  );

  await linkage.linkWatchlistEntryToReasoning('user', 'u-1', liveEntry.entryId, 'run-1', 'snap-1', { ...actor, changedAt: '2026-04-25T10:06:00.000Z' });
  await linkage.linkPositionToJournalCase('user', 'u-1', closed.positionId, 'case-9', { ...actor, changedAt: '2026-04-25T10:07:00.000Z' });
  await linkage.linkActionToNotificationDecision('user', 'u-1', dismissed.actionId, 'decision-7', { ...actor, changedAt: '2026-04-25T10:08:00.000Z' });
  await linkage.linkPortfolioEntityToDrift('user', 'u-1', 'watchlist_entry', liveEntry.entryId, 'drift-33', { ...actor, changedAt: '2026-04-25T10:09:00.000Z' });

  const generated = await snapshotService.generatePortfolioSnapshot('user', 'u-1', '2026-04-25T10:10:00.000Z');
  assert(validateCanonicalPortfolioSnapshot(generated).ok, 'generated snapshot should validate');
  const serialized = serializeCanonicalPortfolioSnapshot(generated);
  const roundTrip = deserializeCanonicalPortfolioSnapshot(serialized);
  assert(roundTrip.snapshotId === generated.snapshotId, 'snapshot serialization should round-trip');
  expectThrows(() => deserializeCanonicalPortfolioSnapshot('{invalid'), 'malformed snapshot json should fail deterministically');

  const snapshot = await query.getPortfolioSnapshot('user', 'u-1');
  assert(snapshot?.snapshotId === generated.snapshotId, 'query should read persisted snapshot without recompute');
  const openPositions = await query.listOpenPositions('user', 'u-1', 20);
  assert(openPositions.length === 0, 'only open/reducing positions are returned');
  const currentWatch = await query.listCurrentWatchlist('user', 'u-1', 20);
  assert(currentWatch.length >= 2, 'current watchlist query should return entities');
  const weakInvalid = await query.listWeakeningOrInvalidatedEntities('user', 'u-1', 30);
  assert(weakInvalid.watchlist.some((entry) => entry.entryId === liveEntry.entryId), 'invalidated watchlist should be listed');
  const byAssetTf = await query.listPortfolioEntitiesByAssetTimeframe('BTC/USD', 'M15', 30);
  assert(byAssetTf.watchlist.some((entry) => entry.entryId === liveEntry.entryId), 'asset/timeframe query should match watchlist records');

  const replay = await getPortfolioEntityReplay(repository, 'user', 'u-1', 'watchlist_entry', liveEntry.entryId);
  assert((replay?.revisions.length ?? 0) > 0, 'entity replay should include ordered revisions');

  const candidates = derivePortfolioActionCandidates({
    inputs: [
      { subjectKind: 'user', subjectId: 'u-1', priority: 'critical', kind: 'review_invalidated_thesis', asset: 'BTC/USD', timeframe: 'M15', linkedEntryId: liveEntry.entryId },
      { subjectKind: 'user', subjectId: 'u-1', priority: 'critical', kind: 'review_invalidated_thesis', asset: 'BTC/USD', timeframe: 'M15', linkedEntryId: liveEntry.entryId },
      { subjectKind: 'user', subjectId: 'u-1', priority: 'high', kind: 'review_risk', asset: 'BTC/USD', timeframe: 'M15' }
    ]
  });
  assert(candidates.length === 2, 'action derivation should suppress duplicates');
  assert(candidates[0]?.kind === 'review_invalidated_thesis', 'action derivation should order by severity then kind');

  assertValidWatchlistTransition('watching', 'thesis_active');
  assertValidPositionTransition('open', 'reducing');
  assertValidActionTransition('open', 'completed');
  assertValidThesisHealthTransition('stable', 'invalidated');
  assertValidThesisHealthTransition('invalidated', 'weakening', true);
  expectThrows(() => assertValidThesisHealthTransition('invalidated', 'weakening'), 'invalidated recovery must require explicit flag');
  expectThrows(() => assertValidWatchlistTransition('archived', 'watching'), 'archived watchlist is terminal');
  expectThrows(() => assertValidPositionTransition('closed', 'open'), 'closed position is terminal');
  expectThrows(() => assertValidActionTransition('dismissed', 'open'), 'dismissed action is terminal');
  assert(buildPortfolioRevisionSummary('closed') === 'Position closed.', 'revision summary template should be deterministic');

  const boundaryEntry = await boundary.createWatchlistEntry(
    {
      subjectKind: 'workspace',
      subjectId: 'ws-1',
      asset: 'EUR/USD',
      timeframe: 'H4',
      priority: 'medium',
      status: 'watching',
      thesisHealth: 'stable',
      note: null,
      linkedReasoningRunId: null,
      linkedSnapshotId: null,
      linkedDriftId: null,
      linkedJournalCaseId: null
    },
    { actorKind: 'workspace', actorId: 'ws-1', changedAt: '2026-04-25T11:00:00.000Z' }
  );
  assert(boundaryEntry.subjectKind === 'workspace', 'boundary should create watchlist end-to-end');
  const attention = await boundary.getPortfolioAttentionSummary('workspace', 'ws-1');
  assert(typeof attention.openActions === 'number', 'boundary summary helper should execute');


  // SEC-A1 two-user adversarial authority: foreign reads, replay and mutations are indistinguishable from missing resources.
  const foreignWatchBefore = await repository.getWatchlistEntryForSubject('user', 'u-1', boundaryEntry.entryId);
  assert(foreignWatchBefore === null, 'USER_A cannot read USER_B watchlist entry');
  assert(await getPortfolioEntityReplay(repository, 'user', 'u-1', 'watchlist_entry', boundaryEntry.entryId) === null, 'USER_A cannot replay USER_B history');
  assert(await repository.getPositionForSubject('user', 'attacker', closed.positionId) === null, 'USER_A cannot read USER_B position');
  assert(await repository.getActionItemForSubject('user', 'attacker', dismissed.actionId) === null, 'USER_A cannot read USER_B action');
  const revisionCountBefore = (await repository.listRevisionsForEntityForSubject('workspace', 'ws-1', 'watchlist_entry', boundaryEntry.entryId)).length;
  await expectReject(watchlist.updateWatchlistEntry('user', 'u-1', boundaryEntry.entryId, { note: 'attack' }, actor), 'USER_A cannot mutate USER_B watchlist');
  await expectReject(watchlist.changeWatchlistStatus('user', 'u-1', boundaryEntry.entryId, 'archived', actor), 'USER_A cannot transition USER_B watchlist');
  await expectReject(watchlist.changeWatchlistThesisHealth('user', 'u-1', boundaryEntry.entryId, 'weakening', actor), 'USER_A cannot change USER_B watchlist thesis');
  await expectReject(position.updatePosition('user', 'attacker', closed.positionId, { note: 'attack' }, actor), 'wrong subject cannot mutate position');
  await expectReject(position.openPosition('user', 'attacker', closed.positionId, '2026-04-25T12:00:00.000Z', {}, actor), 'wrong subject cannot open position');
  await expectReject(position.reducePosition('user', 'attacker', closed.positionId, {}, actor), 'wrong subject cannot reduce position');
  await expectReject(position.closePosition('user', 'attacker', closed.positionId, '2026-04-25T12:00:00.000Z', {}, actor), 'wrong subject cannot close position');
  await expectReject(position.cancelPosition('user', 'attacker', closed.positionId, actor), 'wrong subject cannot cancel position');
  await expectReject(action.updateActionItem('user', 'attacker', dismissed.actionId, { headline: 'attack' }, actor), 'wrong subject cannot mutate action');
  await expectReject(action.completeActionItem('user', 'attacker', dismissed.actionId, '2026-04-25T12:00:00.000Z', actor), 'wrong subject cannot complete action');
  await expectReject(action.dismissActionItem('user', 'attacker', dismissed.actionId, '2026-04-25T12:00:00.000Z', actor), 'wrong subject cannot dismiss action');
  assert((await repository.listRevisionsForEntityForSubject('workspace', 'ws-1', 'watchlist_entry', boundaryEntry.entryId)).length === revisionCountBefore, 'denied portfolio mutation creates no revision');

  await expectReject(position.cancelPosition('user', 'u-1', proposed.positionId, actor), 'cancel should fail after opening lifecycle');
}
