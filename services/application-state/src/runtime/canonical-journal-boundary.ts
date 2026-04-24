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

  planCase(caseId: string, patch: JournalCasePatch, actor: JournalActor): Promise<CanonicalJournalCase> {
    return this.caseService.planCase(caseId, patch, actor);
  }

  markExecuted(caseId: string, patch: JournalCasePatch, actor: JournalActor): Promise<CanonicalJournalCase> {
    return this.caseService.markExecuted(caseId, patch, actor);
  }

  adjustExecution(caseId: string, patch: JournalCasePatch, actor: JournalActor): Promise<CanonicalJournalCase> {
    return this.caseService.adjustExecution(caseId, patch, actor);
  }

  markPartiallyClosed(caseId: string, patch: JournalCasePatch, actor: JournalActor): Promise<CanonicalJournalCase> {
    return this.caseService.markPartiallyClosed(caseId, patch, actor);
  }

  closeCase(caseId: string, patch: JournalCasePatch, actor: JournalActor): Promise<CanonicalJournalCase> {
    return this.caseService.closeCase(caseId, patch, actor);
  }

  cancelCase(caseId: string, patch: JournalCasePatch, actor: JournalActor): Promise<CanonicalJournalCase> {
    return this.caseService.cancelCase(caseId, patch, actor);
  }

  reviewCase(caseId: string, patch: JournalCasePatch, actor: JournalActor): Promise<CanonicalJournalCase> {
    return this.caseService.reviewCase(caseId, patch, actor);
  }

  getJournalCase(caseId: string): Promise<CanonicalJournalCase | null> {
    return this.queryService.getJournalCase(caseId);
  }

  listJournalCases(query: JournalCaseListQuery): Promise<CanonicalJournalCase[]> {
    return this.queryService.listJournalCases(query);
  }

  getJournalCaseReplay(caseId: string): Promise<JournalCaseReplayBundle | null> {
    return this.queryService.getJournalCaseReplay(caseId);
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
