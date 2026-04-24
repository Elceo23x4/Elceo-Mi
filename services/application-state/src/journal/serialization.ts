import { validateCanonicalJournalCase, validateJournalCaseRevisionRecord } from '@elceo/schemas';
import type { CanonicalJournalCase, JournalCaseRevisionRecord } from '@elceo/types';

function parseJson(json: string): unknown {
  try {
    return JSON.parse(json) as unknown;
  } catch {
    throw new Error('malformed_json');
  }
}

export function serializeCanonicalJournalCase(input: CanonicalJournalCase): string {
  return JSON.stringify(input);
}

export function deserializeCanonicalJournalCase(json: string): CanonicalJournalCase {
  const parsed = parseJson(json);
  const validated = validateCanonicalJournalCase(parsed);
  if (validated.ok === false) {
    throw new Error(`invalid_canonical_journal_case:${validated.errors.join('; ')}`);
  }
  return validated.value;
}

export function serializeJournalCaseRevisionRecord(input: JournalCaseRevisionRecord): string {
  return JSON.stringify(input);
}

export function deserializeJournalCaseRevisionRecord(json: string): JournalCaseRevisionRecord {
  const parsed = parseJson(json);
  const validated = validateJournalCaseRevisionRecord(parsed);
  if (validated.ok === false) {
    throw new Error(`invalid_journal_case_revision_record:${validated.errors.join('; ')}`);
  }
  return validated.value;
}
