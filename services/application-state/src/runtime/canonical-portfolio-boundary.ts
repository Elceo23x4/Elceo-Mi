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
  async updateWatchlistEntry(subjectKind: 'user' | 'workspace' | 'ops', subjectId: string, entryId: string, patch: Parameters<WatchlistService['updateWatchlistEntry']>[3], actor: WatchlistActor) { return this.watchlist.updateWatchlistEntry(subjectKind, subjectId, entryId, patch, actor); }
  async changeWatchlistStatus(subjectKind: 'user' | 'workspace' | 'ops', subjectId: string, entryId: string, status: Parameters<WatchlistService['changeWatchlistStatus']>[3], actor: WatchlistActor) { return this.watchlist.changeWatchlistStatus(subjectKind, subjectId, entryId, status, actor); }
  async changeWatchlistThesisHealth(subjectKind: 'user' | 'workspace' | 'ops', subjectId: string, entryId: string, thesisHealth: Parameters<WatchlistService['changeWatchlistThesisHealth']>[3], actor: WatchlistActor, explicitRecovery = false) { return this.watchlist.changeWatchlistThesisHealth(subjectKind, subjectId, entryId, thesisHealth, actor, explicitRecovery); }
  async archiveWatchlistEntry(subjectKind: 'user' | 'workspace' | 'ops', subjectId: string, entryId: string, actor: WatchlistActor) { return this.watchlist.archiveWatchlistEntry(subjectKind, subjectId, entryId, actor); }

  async createProposedPosition(input: Parameters<PositionService['createProposedPosition']>[0], actor: PositionActor) { return this.positions.createProposedPosition(input, actor); }
  async openPosition(subjectKind: 'user' | 'workspace' | 'ops', subjectId: string, positionId: string, openedAt: string, patch: Parameters<PositionService['openPosition']>[4], actor: PositionActor) { return this.positions.openPosition(subjectKind, subjectId, positionId, openedAt, patch, actor); }
  async reducePosition(subjectKind: 'user' | 'workspace' | 'ops', subjectId: string, positionId: string, patch: Parameters<PositionService['reducePosition']>[3], actor: PositionActor) { return this.positions.reducePosition(subjectKind, subjectId, positionId, patch, actor); }
  async closePosition(subjectKind: 'user' | 'workspace' | 'ops', subjectId: string, positionId: string, closedAt: string, patch: Parameters<PositionService['closePosition']>[4], actor: PositionActor) { return this.positions.closePosition(subjectKind, subjectId, positionId, closedAt, patch, actor); }
  async cancelPosition(subjectKind: 'user' | 'workspace' | 'ops', subjectId: string, positionId: string, actor: PositionActor) { return this.positions.cancelPosition(subjectKind, subjectId, positionId, actor); }
  async updatePosition(subjectKind: 'user' | 'workspace' | 'ops', subjectId: string, positionId: string, patch: Parameters<PositionService['updatePosition']>[3], actor: PositionActor) { return this.positions.updatePosition(subjectKind, subjectId, positionId, patch, actor); }
  async changePositionThesisHealth(subjectKind: 'user' | 'workspace' | 'ops', subjectId: string, positionId: string, thesisHealth: Parameters<PositionService['changePositionThesisHealth']>[3], actor: PositionActor, explicitRecovery = false) { return this.positions.changePositionThesisHealth(subjectKind, subjectId, positionId, thesisHealth, actor, explicitRecovery); }

  async createActionItem(input: Parameters<ActionService['createActionItem']>[0], actor: ActionActor) { return this.actions.createActionItem(input, actor); }
  async updateActionItem(subjectKind: 'user' | 'workspace' | 'ops', subjectId: string, actionId: string, patch: Parameters<ActionService['updateActionItem']>[3], actor: ActionActor) { return this.actions.updateActionItem(subjectKind, subjectId, actionId, patch, actor); }
  async completeActionItem(subjectKind: 'user' | 'workspace' | 'ops', subjectId: string, actionId: string, completedAt: string, actor: ActionActor) { return this.actions.completeActionItem(subjectKind, subjectId, actionId, completedAt, actor); }
  async dismissActionItem(subjectKind: 'user' | 'workspace' | 'ops', subjectId: string, actionId: string, dismissedAt: string, actor: ActionActor) { return this.actions.dismissActionItem(subjectKind, subjectId, actionId, dismissedAt, actor); }

  derivePortfolioActionCandidates(params: DerivePortfolioActionCandidatesParams) { return derivePortfolioActionCandidates(params); }
  async generatePortfolioSnapshot(subjectKind: 'user' | 'workspace' | 'ops', subjectId: string, generatedAt?: string) { return this.snapshots.generatePortfolioSnapshot(subjectKind, subjectId, generatedAt); }
  async listCurrentWatchlist(subjectKind: 'user' | 'workspace' | 'ops', subjectId: string, limit?: number) { return this.query.listCurrentWatchlist(subjectKind, subjectId, limit); }
  async listOpenPositions(subjectKind: 'user' | 'workspace' | 'ops', subjectId: string, limit?: number) { return this.query.listOpenPositions(subjectKind, subjectId, limit); }
  async listOpenActionQueue(subjectKind: 'user' | 'workspace' | 'ops', subjectId: string, limit?: number) { return this.query.listOpenActionQueue(subjectKind, subjectId, limit); }
  async getPortfolioSnapshot(subjectKind: 'user' | 'workspace' | 'ops', subjectId: string) { return this.query.getPortfolioSnapshot(subjectKind, subjectId); }
  async getPortfolioEntityReplay(subjectKind: 'user' | 'workspace' | 'ops', subjectId: string, entityKind: PortfolioEntityKind, entityId: string) { return getPortfolioEntityReplay(this.repository, subjectKind, subjectId, entityKind, entityId); }
  async listWeakeningOrInvalidatedEntities(subjectKind: 'user' | 'workspace' | 'ops', subjectId: string, limit?: number) { return this.query.listWeakeningOrInvalidatedEntities(subjectKind, subjectId, limit); }
  async listPortfolioEntitiesByAssetTimeframe(asset: Parameters<PortfolioQueryService['listPortfolioEntitiesByAssetTimeframe']>[0], timeframe: Parameters<PortfolioQueryService['listPortfolioEntitiesByAssetTimeframe']>[1], limit?: number) { return this.query.listPortfolioEntitiesByAssetTimeframe(asset, timeframe, limit); }

  async linkWatchlistEntryToReasoning(subjectKind: 'user' | 'workspace' | 'ops', subjectId: string, entryId: string, linkedReasoningRunId: string | null, linkedSnapshotId: string | null, actor: WatchlistActor) { return this.linkage.linkWatchlistEntryToReasoning(subjectKind, subjectId, entryId, linkedReasoningRunId, linkedSnapshotId, actor); }
  async linkPositionToJournalCase(subjectKind: 'user' | 'workspace' | 'ops', subjectId: string, positionId: string, linkedJournalCaseId: string | null, actor: PositionActor) { return this.linkage.linkPositionToJournalCase(subjectKind, subjectId, positionId, linkedJournalCaseId, actor); }
  async linkActionToNotificationDecision(subjectKind: 'user' | 'workspace' | 'ops', subjectId: string, actionId: string, linkedNotificationDecisionId: string | null, actor: ActionActor) { return this.linkage.linkActionToNotificationDecision(subjectKind, subjectId, actionId, linkedNotificationDecisionId, actor); }
  async linkPortfolioEntityToDrift(subjectKind: 'user' | 'workspace' | 'ops', subjectId: string, entityKind: 'watchlist_entry' | 'position', entityId: string, linkedDriftId: string | null, actor: WatchlistActor | PositionActor) { return this.linkage.linkPortfolioEntityToDrift(subjectKind, subjectId, entityKind, entityId, linkedDriftId, actor); }

  async getPortfolioAttentionSummary(subjectKind: 'user' | 'workspace' | 'ops', subjectId: string) { return this.query.getPortfolioAttentionSummary(subjectKind, subjectId); }
  async listCriticalPortfolioActions(subjectKind: 'user' | 'workspace' | 'ops', subjectId: string, limit?: number) { return this.query.listCriticalPortfolioActions(subjectKind, subjectId, limit); }
}
