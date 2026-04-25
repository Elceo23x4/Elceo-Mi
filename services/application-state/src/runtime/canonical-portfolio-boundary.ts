import type { PortfolioEntityKind } from '@elceo/types';
import type { PortfolioRepository } from '../persistence/contracts';
import { getPortfolioRepository } from '../persistence/portfolio-repository';
import { ActionService, type ActionActor } from '../portfolio/action-service';
import { derivePortfolioActionCandidates, type DerivePortfolioActionCandidatesParams } from '../portfolio/action-derivation';
import { PortfolioLinkageService } from '../portfolio/linkage';
import { PositionService, type PositionActor } from '../portfolio/position-service';
import { PortfolioQueryService } from '../portfolio/query-service';
import { getPortfolioEntityReplay } from '../portfolio/replay';
import { PortfolioSnapshotService } from '../portfolio/snapshot-service';
import { WatchlistService, type WatchlistActor } from '../portfolio/watchlist-service';

export class CanonicalPortfolioBoundaryService {
  private readonly watchlist: WatchlistService;
  private readonly positions: PositionService;
  private readonly actions: ActionService;
  private readonly snapshots: PortfolioSnapshotService;
  private readonly query: PortfolioQueryService;
  private readonly linkage: PortfolioLinkageService;

  constructor(private readonly repository: PortfolioRepository = getPortfolioRepository()) {
    this.watchlist = new WatchlistService(repository);
    this.positions = new PositionService(repository);
    this.actions = new ActionService(repository);
    this.snapshots = new PortfolioSnapshotService(repository);
    this.query = new PortfolioQueryService(repository);
    this.linkage = new PortfolioLinkageService(repository);
  }

  async createWatchlistEntry(input: Parameters<WatchlistService['createWatchlistEntry']>[0], actor: WatchlistActor) { return this.watchlist.createWatchlistEntry(input, actor); }
  async updateWatchlistEntry(entryId: string, patch: Parameters<WatchlistService['updateWatchlistEntry']>[1], actor: WatchlistActor) { return this.watchlist.updateWatchlistEntry(entryId, patch, actor); }
  async changeWatchlistStatus(entryId: string, status: Parameters<WatchlistService['changeWatchlistStatus']>[1], actor: WatchlistActor) { return this.watchlist.changeWatchlistStatus(entryId, status, actor); }
  async changeWatchlistThesisHealth(entryId: string, thesisHealth: Parameters<WatchlistService['changeWatchlistThesisHealth']>[1], actor: WatchlistActor, explicitRecovery = false) { return this.watchlist.changeWatchlistThesisHealth(entryId, thesisHealth, actor, explicitRecovery); }
  async archiveWatchlistEntry(entryId: string, actor: WatchlistActor) { return this.watchlist.archiveWatchlistEntry(entryId, actor); }

  async createProposedPosition(input: Parameters<PositionService['createProposedPosition']>[0], actor: PositionActor) { return this.positions.createProposedPosition(input, actor); }
  async openPosition(positionId: string, openedAt: string, patch: Parameters<PositionService['openPosition']>[2], actor: PositionActor) { return this.positions.openPosition(positionId, openedAt, patch, actor); }
  async reducePosition(positionId: string, patch: Parameters<PositionService['reducePosition']>[1], actor: PositionActor) { return this.positions.reducePosition(positionId, patch, actor); }
  async closePosition(positionId: string, closedAt: string, patch: Parameters<PositionService['closePosition']>[2], actor: PositionActor) { return this.positions.closePosition(positionId, closedAt, patch, actor); }
  async cancelPosition(positionId: string, actor: PositionActor) { return this.positions.cancelPosition(positionId, actor); }
  async updatePosition(positionId: string, patch: Parameters<PositionService['updatePosition']>[1], actor: PositionActor) { return this.positions.updatePosition(positionId, patch, actor); }
  async changePositionThesisHealth(positionId: string, thesisHealth: Parameters<PositionService['changePositionThesisHealth']>[1], actor: PositionActor, explicitRecovery = false) { return this.positions.changePositionThesisHealth(positionId, thesisHealth, actor, explicitRecovery); }

  async createActionItem(input: Parameters<ActionService['createActionItem']>[0], actor: ActionActor) { return this.actions.createActionItem(input, actor); }
  async updateActionItem(actionId: string, patch: Parameters<ActionService['updateActionItem']>[1], actor: ActionActor) { return this.actions.updateActionItem(actionId, patch, actor); }
  async completeActionItem(actionId: string, completedAt: string, actor: ActionActor) { return this.actions.completeActionItem(actionId, completedAt, actor); }
  async dismissActionItem(actionId: string, dismissedAt: string, actor: ActionActor) { return this.actions.dismissActionItem(actionId, dismissedAt, actor); }

  derivePortfolioActionCandidates(params: DerivePortfolioActionCandidatesParams) { return derivePortfolioActionCandidates(params); }
  async generatePortfolioSnapshot(subjectKind: 'user' | 'workspace' | 'ops', subjectId: string, generatedAt?: string) { return this.snapshots.generatePortfolioSnapshot(subjectKind, subjectId, generatedAt); }
  async listCurrentWatchlist(subjectKind: 'user' | 'workspace' | 'ops', subjectId: string, limit?: number) { return this.query.listCurrentWatchlist(subjectKind, subjectId, limit); }
  async listOpenPositions(subjectKind: 'user' | 'workspace' | 'ops', subjectId: string, limit?: number) { return this.query.listOpenPositions(subjectKind, subjectId, limit); }
  async listOpenActionQueue(subjectKind: 'user' | 'workspace' | 'ops', subjectId: string, limit?: number) { return this.query.listOpenActionQueue(subjectKind, subjectId, limit); }
  async getPortfolioSnapshot(subjectKind: 'user' | 'workspace' | 'ops', subjectId: string) { return this.query.getPortfolioSnapshot(subjectKind, subjectId); }
  async getPortfolioEntityReplay(entityKind: PortfolioEntityKind, entityId: string) { return getPortfolioEntityReplay(this.repository, entityKind, entityId); }
  async listWeakeningOrInvalidatedEntities(subjectKind: 'user' | 'workspace' | 'ops', subjectId: string, limit?: number) { return this.query.listWeakeningOrInvalidatedEntities(subjectKind, subjectId, limit); }
  async listPortfolioEntitiesByAssetTimeframe(asset: Parameters<PortfolioQueryService['listPortfolioEntitiesByAssetTimeframe']>[0], timeframe: Parameters<PortfolioQueryService['listPortfolioEntitiesByAssetTimeframe']>[1], limit?: number) { return this.query.listPortfolioEntitiesByAssetTimeframe(asset, timeframe, limit); }

  async linkWatchlistEntryToReasoning(entryId: string, linkedReasoningRunId: string | null, linkedSnapshotId: string | null, actor: WatchlistActor) { return this.linkage.linkWatchlistEntryToReasoning(entryId, linkedReasoningRunId, linkedSnapshotId, actor); }
  async linkPositionToJournalCase(positionId: string, linkedJournalCaseId: string | null, actor: PositionActor) { return this.linkage.linkPositionToJournalCase(positionId, linkedJournalCaseId, actor); }
  async linkActionToNotificationDecision(actionId: string, linkedNotificationDecisionId: string | null, actor: ActionActor) { return this.linkage.linkActionToNotificationDecision(actionId, linkedNotificationDecisionId, actor); }
  async linkPortfolioEntityToDrift(entityKind: 'watchlist_entry' | 'position', entityId: string, linkedDriftId: string | null, actor: WatchlistActor | PositionActor) { return this.linkage.linkPortfolioEntityToDrift(entityKind, entityId, linkedDriftId, actor); }

  async getPortfolioAttentionSummary(subjectKind: 'user' | 'workspace' | 'ops', subjectId: string) { return this.query.getPortfolioAttentionSummary(subjectKind, subjectId); }
  async listCriticalPortfolioActions(subjectKind: 'user' | 'workspace' | 'ops', subjectId: string, limit?: number) { return this.query.listCriticalPortfolioActions(subjectKind, subjectId, limit); }
}
