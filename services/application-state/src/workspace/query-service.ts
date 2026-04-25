import type { WorkspaceAgendaItem, WorkspaceAttentionDetail, WorkspaceHealthState, WorkspaceSnapshot, WorkspaceSubjectKind, WorkspaceSummary } from '@elceo/types';
import type { WorkspaceSnapshotRepository } from '../persistence/contracts';
import { getLatestWorkspaceSnapshotReplay, getWorkspaceSnapshotReplayById, listWorkspaceSnapshotReplays } from './replay';

export type WorkspaceAttentionSummary = {
  healthState: WorkspaceHealthState;
  attentionLevel: WorkspaceSummary['attentionLevel'];
  portfolioAttentionScore: WorkspaceAttentionDetail['portfolioAttentionScore'];
  coachingAttentionScore: WorkspaceAttentionDetail['coachingAttentionScore'];
  notificationAttentionScore: WorkspaceAttentionDetail['notificationAttentionScore'];
  reasoningAttentionScore: WorkspaceAttentionDetail['reasoningAttentionScore'];
  dependencyPenaltyApplied: WorkspaceAttentionDetail['dependencyPenaltyApplied'];
};

export class WorkspaceQueryService {
  constructor(private readonly repository: WorkspaceSnapshotRepository) {}

  async getWorkspaceSnapshot(snapshotId: string): Promise<WorkspaceSnapshot | null> {
    const replay = await getWorkspaceSnapshotReplayById(snapshotId, this.repository);
    return replay?.snapshot ?? null;
  }

  async getLatestWorkspaceSnapshot(subjectKind: WorkspaceSubjectKind, subjectId: string): Promise<WorkspaceSnapshot | null> {
    const replay = await getLatestWorkspaceSnapshotReplay(subjectKind, subjectId, this.repository);
    return replay?.snapshot ?? null;
  }

  async listWorkspaceSnapshots(subjectKind: WorkspaceSubjectKind, subjectId: string, limit?: number): Promise<WorkspaceSnapshot[]> {
    const replays = await listWorkspaceSnapshotReplays(subjectKind, subjectId, this.repository, limit);
    return replays.map((item) => item.snapshot);
  }

  async getCurrentWorkspaceAgenda(subjectKind: WorkspaceSubjectKind, subjectId: string): Promise<WorkspaceAgendaItem[]> {
    const snapshot = await this.getLatestWorkspaceSnapshot(subjectKind, subjectId);
    return snapshot?.summary.agenda ?? [];
  }

  async getCurrentWorkspaceAttentionSummary(subjectKind: WorkspaceSubjectKind, subjectId: string): Promise<WorkspaceAttentionSummary | null> {
    const snapshot = await this.getLatestWorkspaceSnapshot(subjectKind, subjectId);
    if (!snapshot) return null;
    return {
      healthState: snapshot.summary.healthState,
      attentionLevel: snapshot.summary.attentionLevel,
      portfolioAttentionScore: snapshot.summary.attentionDetail.portfolioAttentionScore,
      coachingAttentionScore: snapshot.summary.attentionDetail.coachingAttentionScore,
      notificationAttentionScore: snapshot.summary.attentionDetail.notificationAttentionScore,
      reasoningAttentionScore: snapshot.summary.attentionDetail.reasoningAttentionScore,
      dependencyPenaltyApplied: snapshot.summary.attentionDetail.dependencyPenaltyApplied
    };
  }
}
