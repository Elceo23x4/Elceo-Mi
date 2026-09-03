import type { CanonicalJournalCase } from '@elceo/types';
import type { JournalCaseListQuery, JournalCaseRepository, PersistedJournalCaseRecord, PersistedJournalCaseRevisionRecord } from '../persistence/contracts';
import { deserializeCanonicalJournalCase } from './serialization';

export type JournalCaseReplayBundle = {
  caseRecord: PersistedJournalCaseRecord;
  caseData: CanonicalJournalCase;
  revisions: PersistedJournalCaseRevisionRecord[];
};

async function toReplayBundle(
  caseRecord: PersistedJournalCaseRecord,
  repository: JournalCaseRepository
): Promise<JournalCaseReplayBundle> {
  const caseData = deserializeCanonicalJournalCase(caseRecord.caseJson);
  const revisions = await repository.listRevisionsForCaseForSubject(caseRecord.subjectKind, caseRecord.subjectId, caseRecord.caseId);
  return { caseRecord, caseData, revisions };
}

export async function getJournalCaseReplayById(subjectKind: 'user' | 'workspace' | 'ops', subjectId: string, caseId: string, repository: JournalCaseRepository): Promise<JournalCaseReplayBundle | null> {
  const caseRecord = await repository.getCaseForSubject(subjectKind, subjectId, caseId);
  if (!caseRecord) return null;
  return toReplayBundle(caseRecord, repository);
}

export async function getLatestJournalCaseReplayForReasoningRun(
  reasoningRunId: string,
  repository: JournalCaseRepository
): Promise<JournalCaseReplayBundle | null> {
  const caseRecord = await repository.getLatestCaseForReasoningRun(reasoningRunId);
  if (!caseRecord) return null;
  return toReplayBundle(caseRecord, repository);
}

export async function listJournalCaseReplays(query: JournalCaseListQuery, repository: JournalCaseRepository): Promise<JournalCaseReplayBundle[]> {
  const records = await repository.listCases(query);
  const bundles: JournalCaseReplayBundle[] = [];
  for (const caseRecord of records) {
    bundles.push(await toReplayBundle(caseRecord, repository));
  }
  return bundles;
}
