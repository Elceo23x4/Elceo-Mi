import { validateRecentReasoningSignal } from '@elceo/schemas';
import type {
  AnalyticsSnapshot,
  CoachingSnapshot,
  RecentReasoningSignal,
  WorkspaceSubjectKind,
  CanonicalPortfolioSnapshot
} from '@elceo/types';
import type { PortfolioWorkspaceLoader, CoachingWorkspaceLoader, AnalyticsWorkspaceLoader, ReasoningWorkspaceLoader, NotificationWorkspaceLoader } from './dependency-contracts';

export type PortfolioBoundaryLike = {
  generatePortfolioSnapshot(subjectKind: WorkspaceSubjectKind, subjectId: string, generatedAt?: string): Promise<CanonicalPortfolioSnapshot>;
};

export type CoachingBoundaryLike = {
  getLatestCoachingSnapshot(subjectKind: WorkspaceSubjectKind, subjectId: string, assetScope: '*', timeframeScope: '*'): Promise<CoachingSnapshot | null>;
};

export type AnalyticsBoundaryLike = {
  getLatestAnalyticsSnapshot(subjectKind: WorkspaceSubjectKind, subjectId: string, assetScope: '*', timeframeScope: '*', lookbackDays: number): Promise<AnalyticsSnapshot | null>;
};

export type ReasoningRunsRepositoryLike = {
  listRecentReasoningRuns(params: { limit: number; status?: 'success' | 'partial_success' | 'failed' }): Promise<Array<{ reasoningRunId: string; snapshotId: string | null; asset: RecentReasoningSignal['asset']; timeframe: RecentReasoningSignal['timeframe'] }>>;
};

export type ReasoningSnapshotRepositoryLike = {
  getSnapshotByReasoningRunId(reasoningRunId: string): Promise<{ evaluatedAt: string; confidenceScore: number; contradictionScore: number; freshnessScore: number; bias: RecentReasoningSignal['bias']; snapshotId: string } | null>;
};

export type NotificationRepositoriesLike = {
  targetRepository: { listTargetsForSubject(subjectKind: WorkspaceSubjectKind, subjectId: string): Promise<Array<{ targetId: string }>> };
  inboxRepository: { listInboxForTarget(targetId: string, limit?: number): Promise<Array<{ inboxId: string; readAt: string | null }>> };
  targetHealthRepository?: { listTargetHealthForSubject(subjectKind: WorkspaceSubjectKind, subjectId: string): Promise<Array<{ healthState: string }>> };
  receiptRepository?: { listReceiptsForTarget(targetId: string, limit?: number): Promise<Array<{ receiptId: string; severity: string; occurredAt: string }>> };
};

export class DefaultPortfolioWorkspaceLoader implements PortfolioWorkspaceLoader {
  constructor(private readonly boundary: PortfolioBoundaryLike) {}
  generatePortfolioSnapshot(subjectKind: WorkspaceSubjectKind, subjectId: string, generatedAt?: string): Promise<CanonicalPortfolioSnapshot> {
    return this.boundary.generatePortfolioSnapshot(subjectKind, subjectId, generatedAt);
  }
}

export class DefaultCoachingWorkspaceLoader implements CoachingWorkspaceLoader {
  constructor(private readonly boundary: CoachingBoundaryLike) {}
  getLatestCoachingSnapshot(subjectKind: WorkspaceSubjectKind, subjectId: string, assetScope: '*', timeframeScope: '*'): Promise<CoachingSnapshot | null> {
    return this.boundary.getLatestCoachingSnapshot(subjectKind, subjectId, assetScope, timeframeScope);
  }
}

export class DefaultAnalyticsWorkspaceLoader implements AnalyticsWorkspaceLoader {
  constructor(private readonly boundary: AnalyticsBoundaryLike, private readonly defaultLookbackDays = 180) {}
  getLatestAnalyticsSnapshot(subjectKind: WorkspaceSubjectKind, subjectId: string, assetScope: '*', timeframeScope: '*', lookbackDays: number = this.defaultLookbackDays): Promise<AnalyticsSnapshot | null> {
    return this.boundary.getLatestAnalyticsSnapshot(subjectKind, subjectId, assetScope, timeframeScope, lookbackDays);
  }
}

export class DefaultReasoningWorkspaceLoader implements ReasoningWorkspaceLoader {
  constructor(private readonly runsRepository: ReasoningRunsRepositoryLike, private readonly snapshotRepository: ReasoningSnapshotRepositoryLike) {}

  async listRecentReasoningSignals(_subjectKind: WorkspaceSubjectKind, _subjectId: string, limit: number, asOfIso?: string): Promise<RecentReasoningSignal[]> {
    const rows = await this.runsRepository.listRecentReasoningRuns({ limit: Math.max(limit * 5, 20), status: 'success' });
    const asOfMs = asOfIso ? Date.parse(asOfIso) : Number.POSITIVE_INFINITY;
    const signals: RecentReasoningSignal[] = [];

    for (const run of rows) {
      if (signals.length >= limit) break;
      const snapshot = await this.snapshotRepository.getSnapshotByReasoningRunId(run.reasoningRunId);
      if (!snapshot) continue;
      const evaluatedAtMs = Date.parse(snapshot.evaluatedAt);
      if (Number.isFinite(asOfMs) && evaluatedAtMs > asOfMs) continue;
      const signal: RecentReasoningSignal = {
        reasoningRunId: run.reasoningRunId,
        snapshotId: run.snapshotId,
        asset: run.asset,
        timeframe: run.timeframe,
        bias: snapshot.bias,
        confidenceScore: snapshot.confidenceScore,
        contradictionScore: snapshot.contradictionScore,
        freshnessScore: snapshot.freshnessScore,
        evaluatedAt: snapshot.evaluatedAt
      };
      const validated = validateRecentReasoningSignal(signal);
      if (validated.ok === true) signals.push(validated.value);
    }

    return signals
      .sort((a, b) => Date.parse(b.evaluatedAt) - Date.parse(a.evaluatedAt) || a.reasoningRunId.localeCompare(b.reasoningRunId))
      .slice(0, limit);
  }
}

export class DefaultNotificationWorkspaceLoader implements NotificationWorkspaceLoader {
  constructor(private readonly repositories: NotificationRepositoriesLike) {}

  async listUnreadInboxCount(subjectKind: WorkspaceSubjectKind, subjectId: string): Promise<number> {
    const targets = await this.repositories.targetRepository.listTargetsForSubject(subjectKind, subjectId);
    const dedupe = new Set<string>();
    for (const target of targets) {
      const inboxRows = await this.repositories.inboxRepository.listInboxForTarget(target.targetId, 1000);
      inboxRows.forEach((row) => {
        if (row.readAt === null) dedupe.add(row.inboxId);
      });
    }
    return dedupe.size;
  }

  async listDegradedTargetCount(subjectKind: WorkspaceSubjectKind, subjectId: string): Promise<number> {
    if (!this.repositories.targetHealthRepository) return 0;
    const rows = await this.repositories.targetHealthRepository.listTargetHealthForSubject(subjectKind, subjectId);
    return rows.filter((row) => row.healthState === 'degraded' || row.healthState === 'disabled').length;
  }

  async listRecentCriticalReceiptCount(subjectKind: WorkspaceSubjectKind, subjectId: string, lookbackHours: number): Promise<number> {
    if (!this.repositories.receiptRepository) return 0;
    const targets = await this.repositories.targetRepository.listTargetsForSubject(subjectKind, subjectId);
    const minMs = Date.now() - lookbackHours * 60 * 60 * 1000;
    const dedupe = new Set<string>();
    for (const target of targets) {
      const rows = await this.repositories.receiptRepository.listReceiptsForTarget(target.targetId, 1000);
      rows.forEach((row) => {
        if (row.severity !== 'critical') return;
        const occurredMs = Date.parse(row.occurredAt);
        if (Number.isNaN(occurredMs) || occurredMs < minMs) return;
        dedupe.add(row.receiptId);
      });
    }
    return dedupe.size;
  }
}
