import { validateCanonicalPortfolioSnapshot } from '@elceo/schemas';
import type { CanonicalPortfolioSnapshot } from '@elceo/types';
import type { PortfolioRepository } from '../persistence/contracts';
import { createId, nowIso } from './helpers';
import { deserializePortfolioActionItem, deserializePositionRecord, deserializeWatchlistEntry, serializeCanonicalPortfolioSnapshot } from './serialization';

export class PortfolioSnapshotService {
  constructor(private readonly repository: PortfolioRepository) {}

  async generatePortfolioSnapshot(subjectKind: 'user' | 'workspace' | 'ops', subjectId: string, generatedAt = nowIso()): Promise<CanonicalPortfolioSnapshot> {
    const watchlist = (await this.repository.listWatchlistEntries({ subjectKind, subjectId, limit: 1000 })).map((row) => deserializeWatchlistEntry(row.entryJson));
    const positions = (await this.repository.listPositions({ subjectKind, subjectId, limit: 1000 })).map((row) => deserializePositionRecord(row.positionJson));
    const actionQueue = (await this.repository.listActionItems({ subjectKind, subjectId, limit: 1000 })).map((row) => deserializePortfolioActionItem(row.actionJson));

    const snapshot: CanonicalPortfolioSnapshot = {
      snapshotId: createId('psnap'),
      subjectKind,
      subjectId,
      generatedAt,
      activeWatchlistCount: watchlist.filter((item) => item.status !== 'archived').length,
      activePositionCount: positions.filter((item) => item.status === 'open' || item.status === 'reducing').length,
      weakeningThesisCount:
        watchlist.filter((item) => item.thesisHealth === 'weakening').length + positions.filter((item) => item.thesisHealth === 'weakening').length,
      invalidatedThesisCount:
        watchlist.filter((item) => item.thesisHealth === 'invalidated').length + positions.filter((item) => item.thesisHealth === 'invalidated').length,
      openActionCount: actionQueue.filter((item) => item.status === 'open').length,
      criticalActionCount: actionQueue.filter((item) => item.status === 'open' && item.priority === 'critical').length,
      watchlistEntries: watchlist,
      positions,
      actionQueue,
      createdAt: nowIso()
    };

    const validated = validateCanonicalPortfolioSnapshot(snapshot);
    if (validated.ok === false) throw new Error(`invalid_portfolio_snapshot:${validated.errors.join('; ')}`);

    await this.repository.saveSnapshot({
      snapshotId: snapshot.snapshotId,
      subjectKind: snapshot.subjectKind,
      subjectId: snapshot.subjectId,
      generatedAt: snapshot.generatedAt,
      activeWatchlistCount: snapshot.activeWatchlistCount,
      activePositionCount: snapshot.activePositionCount,
      weakeningThesisCount: snapshot.weakeningThesisCount,
      invalidatedThesisCount: snapshot.invalidatedThesisCount,
      openActionCount: snapshot.openActionCount,
      criticalActionCount: snapshot.criticalActionCount,
      snapshotJson: serializeCanonicalPortfolioSnapshot(snapshot),
      createdAt: snapshot.createdAt
    });

    return snapshot;
  }
}
