import type { CanonicalAssetSymbol, CanonicalJournalCase, Timeframe } from '@elceo/types';
import { JournalCaseService, type CreateDraftCaseFromReasoningContextInput, type CreateDraftCaseInput, type JournalActor, type JournalCasePatch } from '../journal/case-service';
import { JournalQueryService } from '../journal/query-service';
import { getJournalCaseRepository, type JournalCaseListQuery } from '../persistence/journal-case-repository';
import type { JournalCaseReplayBundle } from '../journal/replay';

export class CanonicalJournalBoundaryService {
  constructor(
    private readonly caseService: JournalCaseService = new JournalCaseService(getJournalCaseRepository()),
    private readonly queryService: JournalQueryService = new JournalQueryService(getJournalCaseRepository())
  ) {}

  createDraftCase(input: CreateDraftCaseInput, actor: JournalActor): Promise<CanonicalJournalCase> {
    return this.caseService.createDraftCase(input, actor);
  }

  createDraftCaseFromReasoningContext(input: CreateDraftCaseFromReasoningContextInput, actor: JournalActor): Promise<CanonicalJournalCase> {
    return this.caseService.createDraftCaseFromReasoningContext(input, actor);
  }

  planCase(subjectKind: 'user' | 'workspace' | 'ops', subjectId: string, caseId: string, patch: JournalCasePatch, actor: JournalActor): Promise<CanonicalJournalCase> {
    return this.caseService.planCase(subjectKind, subjectId, caseId, patch, actor);
  }

  markExecuted(subjectKind: 'user' | 'workspace' | 'ops', subjectId: string, caseId: string, patch: JournalCasePatch, actor: JournalActor): Promise<CanonicalJournalCase> {
    return this.caseService.markExecuted(subjectKind, subjectId, caseId, patch, actor);
  }

  adjustExecution(subjectKind: 'user' | 'workspace' | 'ops', subjectId: string, caseId: string, patch: JournalCasePatch, actor: JournalActor): Promise<CanonicalJournalCase> {
    return this.caseService.adjustExecution(subjectKind, subjectId, caseId, patch, actor);
  }

  markPartiallyClosed(subjectKind: 'user' | 'workspace' | 'ops', subjectId: string, caseId: string, patch: JournalCasePatch, actor: JournalActor): Promise<CanonicalJournalCase> {
    return this.caseService.markPartiallyClosed(subjectKind, subjectId, caseId, patch, actor);
  }

  closeCase(subjectKind: 'user' | 'workspace' | 'ops', subjectId: string, caseId: string, patch: JournalCasePatch, actor: JournalActor): Promise<CanonicalJournalCase> {
    return this.caseService.closeCase(subjectKind, subjectId, caseId, patch, actor);
  }

  cancelCase(subjectKind: 'user' | 'workspace' | 'ops', subjectId: string, caseId: string, patch: JournalCasePatch, actor: JournalActor): Promise<CanonicalJournalCase> {
    return this.caseService.cancelCase(subjectKind, subjectId, caseId, patch, actor);
  }

  reviewCase(subjectKind: 'user' | 'workspace' | 'ops', subjectId: string, caseId: string, patch: JournalCasePatch, actor: JournalActor): Promise<CanonicalJournalCase> {
    return this.caseService.reviewCase(subjectKind, subjectId, caseId, patch, actor);
  }

  getJournalCase(subjectKind: 'user' | 'workspace' | 'ops', subjectId: string, caseId: string): Promise<CanonicalJournalCase | null> {
    return this.queryService.getJournalCase(subjectKind, subjectId, caseId);
  }

  listJournalCases(query: JournalCaseListQuery): Promise<CanonicalJournalCase[]> {
    return this.queryService.listJournalCases(query);
  }

  getJournalCaseReplay(subjectKind: 'user' | 'workspace' | 'ops', subjectId: string, caseId: string): Promise<JournalCaseReplayBundle | null> {
    return this.queryService.getJournalCaseReplay(subjectKind, subjectId, caseId);
  }

  getLatestJournalCaseReplayForReasoningRun(reasoningRunId: string): Promise<JournalCaseReplayBundle | null> {
    return this.queryService.getLatestJournalCaseReplayForReasoningRun(reasoningRunId);
  }

  listOpenCasesForSubject(subjectKind: 'user' | 'workspace' | 'ops', subjectId: string, limit?: number): Promise<CanonicalJournalCase[]> {
    return this.queryService.listOpenCasesForSubject(subjectKind, subjectId, limit);
  }

  listCasesByAssetTimeframe(asset: CanonicalAssetSymbol, timeframe: Timeframe, limit?: number): Promise<CanonicalJournalCase[]> {
    return this.queryService.listCasesByAssetTimeframe(asset, timeframe, limit);
  }

  listJournalCasesForReasoningInfluence(
    subjectKind: 'user' | 'workspace' | 'ops',
    subjectId: string,
    asset: CanonicalAssetSymbol,
    timeframe: Timeframe,
    limit?: number
  ): Promise<CanonicalJournalCase[]> {
    return this.queryService.listJournalCasesForReasoningInfluence(subjectKind, subjectId, asset, timeframe, limit);
  }

  getLatestReviewedCaseForAsset(asset: CanonicalAssetSymbol, timeframe: Timeframe): Promise<CanonicalJournalCase | null> {
    return this.queryService.getLatestReviewedCaseForAsset(asset, timeframe);
  }
}
