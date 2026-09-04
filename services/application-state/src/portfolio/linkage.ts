import type { PortfolioActorKind } from '@elceo/types';
import type { PortfolioRepository } from '../persistence/contracts';
import { ActionService } from './action-service';
import { PositionService } from './position-service';
import { WatchlistService } from './watchlist-service';

export type PortfolioActor = { actorKind: PortfolioActorKind; actorId: string; changedAt?: string };

export class PortfolioLinkageService {
  private readonly watchlist: WatchlistService;
  private readonly positions: PositionService;
  private readonly actions: ActionService;

  constructor(repository: PortfolioRepository) {
    this.watchlist = new WatchlistService(repository);
    this.positions = new PositionService(repository);
    this.actions = new ActionService(repository);
  }

  async linkWatchlistEntryToReasoning(subjectKind: 'user' | 'workspace' | 'ops', subjectId: string, entryId: string, linkedReasoningRunId: string | null, linkedSnapshotId: string | null, actor: PortfolioActor) {
    return this.watchlist.linkWatchlistEntry(subjectKind, subjectId, entryId, { linkedReasoningRunId, linkedSnapshotId }, actor);
  }

  async linkPositionToJournalCase(subjectKind: 'user' | 'workspace' | 'ops', subjectId: string, positionId: string, linkedJournalCaseId: string | null, actor: PortfolioActor) {
    return this.positions.linkPosition(subjectKind, subjectId, positionId, { linkedJournalCaseId }, actor);
  }

  async linkActionToNotificationDecision(subjectKind: 'user' | 'workspace' | 'ops', subjectId: string, actionId: string, linkedNotificationDecisionId: string | null, actor: PortfolioActor) {
    return this.actions.linkAction(subjectKind, subjectId, actionId, { linkedNotificationDecisionId }, actor);
  }

  async linkPortfolioEntityToDrift(subjectKind: 'user' | 'workspace' | 'ops', subjectId: string, entityKind: 'watchlist_entry' | 'position', entityId: string, linkedDriftId: string | null, actor: PortfolioActor) {
    if (entityKind === 'watchlist_entry') {
      return this.watchlist.linkWatchlistEntry(subjectKind, subjectId, entityId, { linkedDriftId }, actor);
    }
    return this.positions.linkPosition(subjectKind, subjectId, entityId, { linkedDriftId }, actor);
  }
}
