import { validateCanonicalJournalCase } from '@elceo/schemas';
import type { CanonicalJournalCase } from '@elceo/types';

export function deserializeCanonicalJournalCase(json: string): CanonicalJournalCase {
  let parsed: unknown;
  try {
    parsed = JSON.parse(json) as unknown;
  } catch {
    throw new Error('malformed_journal_case_json');
  }
  const validated = validateCanonicalJournalCase(parsed);
  if (validated.ok === false) throw new Error(`invalid_journal_case:${validated.errors.join('; ')}`);
  return validated.value;
}
