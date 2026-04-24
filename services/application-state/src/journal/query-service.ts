import type { CanonicalAssetSymbol, CanonicalJournalCase, JournalCaseStatus, Timeframe } from '@elceo/types';
import type { JournalCaseListQuery, JournalCaseRepository } from '../persistence/contracts';
import {
  getJournalCaseReplayById,
  getLatestJournalCaseReplayForReasoningRun,
  listJournalCaseReplays,
  type JournalCaseReplayBundle
} from './replay';
import { deserializeCanonicalJournalCase } from './serialization';

const OPEN_STATUSES: JournalCaseStatus[] = ['draft', 'planned', 'executed', 'partially_closed'];

export class JournalQueryService {
  constructor(private readonly repository: JournalCaseRepository) {}

  async getJournalCase(caseId: string): Promise<CanonicalJournalCase | null> {
    const record = await this.repository.getCaseById(caseId);
    return record ? deserializeCanonicalJournalCase(record.caseJson) : null;
  }

  async listJournalCases(query: JournalCaseListQuery): Promise<CanonicalJournalCase[]> {
    const records = await this.repository.listCases(query);
    return records.map((row) => deserializeCanonicalJournalCase(row.caseJson));
  }

  async getJournalCaseReplay(caseId: string): Promise<JournalCaseReplayBundle | null> {
    return getJournalCaseReplayById(caseId, this.repository);
  }

  async getLatestJournalCaseReplayForReasoningRun(reasoningRunId: string): Promise<JournalCaseReplayBundle | null> {
    return getLatestJournalCaseReplayForReasoningRun(reasoningRunId, this.repository);
  }

  async listOpenCasesForSubject(subjectKind: 'user' | 'workspace' | 'ops', subjectId: string, limit = 50): Promise<CanonicalJournalCase[]> {
    const cases: CanonicalJournalCase[] = [];
    for (const status of OPEN_STATUSES) {
      const entries = await this.listJournalCases({ subjectKind, subjectId, status, limit });
      cases.push(...entries);
    }
    cases.sort((left, right) => Date.parse(right.createdAt) - Date.parse(left.createdAt) || left.identity.caseId.localeCompare(right.identity.caseId));
    return cases.slice(0, Math.max(1, limit));
  }

  async listCasesByAssetTimeframe(asset: CanonicalAssetSymbol, timeframe: Timeframe, limit = 50): Promise<CanonicalJournalCase[]> {
    return this.listJournalCases({ asset, timeframe, limit });
  }

  async listJournalCaseReplays(query: JournalCaseListQuery): Promise<JournalCaseReplayBundle[]> {
    return listJournalCaseReplays(query, this.repository);
  }

  async listJournalCasesForReasoningInfluence(
    subjectKind: 'user' | 'workspace' | 'ops',
    subjectId: string,
    asset: CanonicalAssetSymbol,
    timeframe: Timeframe,
    limit = 20
  ): Promise<CanonicalJournalCase[]> {
    return this.listJournalCases({ subjectKind, subjectId, asset, timeframe, limit });
  }

  async getLatestReviewedCaseForAsset(asset: CanonicalAssetSymbol, timeframe: Timeframe): Promise<CanonicalJournalCase | null> {
    const cases = await this.listJournalCases({ asset, timeframe, status: 'reviewed', limit: 1 });
    return cases[0] ?? null;
  }
}
