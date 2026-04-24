import type { CanonicalJournalCase } from '@elceo/types';
import { queryDb } from './db-client';
import type { AnalyticsCaseSource } from './contracts';
import { deserializeCanonicalJournalCase } from '../core/journal-case-serialization';

function sortByCreatedDesc(left: CanonicalJournalCase, right: CanonicalJournalCase): number {
  return Date.parse(right.createdAt) - Date.parse(left.createdAt) || left.identity.caseId.localeCompare(right.identity.caseId);
}

export class MemoryAnalyticsCaseSource implements AnalyticsCaseSource {
  private readonly cases = new Map<string, CanonicalJournalCase>();

  saveCase(caseData: CanonicalJournalCase): void {
    this.cases.set(caseData.identity.caseId, caseData);
  }

  async listSubjectCases(subjectKind: CanonicalJournalCase['identity']['subjectKind'], subjectId: string, limit = 500): Promise<CanonicalJournalCase[]> {
    return [...this.cases.values()]
      .filter((caseData) => caseData.identity.subjectKind === subjectKind && caseData.identity.subjectId === subjectId)
      .sort(sortByCreatedDesc)
      .slice(0, Math.max(1, Math.min(1000, limit)));
  }
}

type CaseRow = { case_json: string };

export class SqlAnalyticsCaseSource implements AnalyticsCaseSource {
  async listSubjectCases(subjectKind: CanonicalJournalCase['identity']['subjectKind'], subjectId: string, limit = 500): Promise<CanonicalJournalCase[]> {
    const rows = await queryDb<CaseRow>(
      `SELECT case_json::text AS case_json
       FROM app_journal_cases
       WHERE subject_kind = $1 AND subject_id = $2
       ORDER BY created_at DESC, case_id ASC
       LIMIT $3`,
      [subjectKind, subjectId, Math.max(1, Math.min(1000, limit))]
    );
    return rows.map((row) => deserializeCanonicalJournalCase(row.case_json));
  }
}
