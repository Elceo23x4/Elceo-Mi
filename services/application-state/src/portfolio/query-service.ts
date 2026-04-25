import type { CanonicalAssetSymbol, CanonicalPortfolioSnapshot, Timeframe } from '@elceo/types';
import type { PortfolioRepository } from '../persistence/contracts';
import { deserializeCanonicalPortfolioSnapshot, deserializePortfolioActionItem, deserializePositionRecord, deserializeWatchlistEntry } from './serialization';
import { PortfolioSnapshotService } from './snapshot-service';

export class PortfolioQueryService {
  private readonly snapshotService: PortfolioSnapshotService;

  constructor(private readonly repository: PortfolioRepository) {
    this.snapshotService = new PortfolioSnapshotService(repository);
  }

  async listCurrentWatchlist(subjectKind: 'user' | 'workspace' | 'ops', subjectId: string, limit = 50) {
    return (await this.repository.listWatchlistEntries({ subjectKind, subjectId, limit })).map((row) => deserializeWatchlistEntry(row.entryJson));
  }

  async listOpenPositions(subjectKind: 'user' | 'workspace' | 'ops', subjectId: string, limit = 50) {
    const open = await this.repository.listPositions({ subjectKind, subjectId, status: 'open', limit });
    const reducing = await this.repository.listPositions({ subjectKind, subjectId, status: 'reducing', limit });
    return [...open, ...reducing].map((row) => deserializePositionRecord(row.positionJson)).sort((a, b) => Date.parse(b.updatedAt) - Date.parse(a.updatedAt) || a.positionId.localeCompare(b.positionId));
  }

  async listOpenActionQueue(subjectKind: 'user' | 'workspace' | 'ops', subjectId: string, limit = 50) {
    return (await this.repository.listActionItems({ subjectKind, subjectId, status: 'open', limit })).map((row) => deserializePortfolioActionItem(row.actionJson));
  }

  async getPortfolioSnapshot(subjectKind: 'user' | 'workspace' | 'ops', subjectId: string): Promise<CanonicalPortfolioSnapshot | null> {
    const latest = await this.repository.getLatestSnapshot(subjectKind, subjectId);
    if (!latest) return null;
    return deserializeCanonicalPortfolioSnapshot(latest.snapshotJson);
  }

  async getOrGeneratePortfolioSnapshot(subjectKind: 'user' | 'workspace' | 'ops', subjectId: string): Promise<CanonicalPortfolioSnapshot> {
    const latest = await this.getPortfolioSnapshot(subjectKind, subjectId);
    if (latest) return latest;
    return this.snapshotService.generatePortfolioSnapshot(subjectKind, subjectId);
  }

  async listWeakeningOrInvalidatedEntities(subjectKind: 'user' | 'workspace' | 'ops', subjectId: string, limit = 100) {
    const watchlist = await this.repository.listWatchlistEntries({ subjectKind, subjectId, limit });
    const positions = await this.repository.listPositions({ subjectKind, subjectId, limit });
    return {
      watchlist: watchlist.map((r) => deserializeWatchlistEntry(r.entryJson)).filter((item) => item.thesisHealth === 'weakening' || item.thesisHealth === 'invalidated'),
      positions: positions.map((r) => deserializePositionRecord(r.positionJson)).filter((item) => item.thesisHealth === 'weakening' || item.thesisHealth === 'invalidated')
    };
  }

  async listPortfolioEntitiesByAssetTimeframe(asset: CanonicalAssetSymbol, timeframe: Timeframe, limit = 100) {
    return {
      watchlist: (await this.repository.listWatchlistEntries({ asset, timeframe, limit })).map((row) => deserializeWatchlistEntry(row.entryJson)),
      positions: (await this.repository.listPositions({ asset, timeframe, limit })).map((row) => deserializePositionRecord(row.positionJson)),
      actions: (await this.repository.listActionItems({ asset, timeframe, limit })).map((row) => deserializePortfolioActionItem(row.actionJson))
    };
  }

  async getPortfolioAttentionSummary(subjectKind: 'user' | 'workspace' | 'ops', subjectId: string): Promise<{ openActions: number; criticalOpenActions: number; invalidatedEntities: number }> {
    const snapshot = await this.getOrGeneratePortfolioSnapshot(subjectKind, subjectId);
    return {
      openActions: snapshot.openActionCount,
      criticalOpenActions: snapshot.criticalActionCount,
      invalidatedEntities: snapshot.invalidatedThesisCount
    };
  }

  async listCriticalPortfolioActions(subjectKind: 'user' | 'workspace' | 'ops', subjectId: string, limit = 25) {
    return (await this.repository.listActionItems({ subjectKind, subjectId, status: 'open', limit: 200 }))
      .map((row) => deserializePortfolioActionItem(row.actionJson))
      .filter((item) => item.priority === 'critical')
      .slice(0, limit);
  }
}
