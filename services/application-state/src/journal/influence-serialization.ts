import { validateJournalInfluenceSnapshot, validateJournalInfluenceSummary } from '@elceo/schemas';
import type { JournalInfluenceSnapshot, JournalInfluenceSummary } from '@elceo/types';

function parseJson(json: string): unknown {
  try {
    return JSON.parse(json) as unknown;
  } catch {
    throw new Error('malformed_json');
  }
}

export function serializeJournalInfluenceSummary(input: JournalInfluenceSummary): string {
  return JSON.stringify(input);
}

export function deserializeJournalInfluenceSummary(json: string): JournalInfluenceSummary {
  const parsed = parseJson(json);
  const validated = validateJournalInfluenceSummary(parsed);
  if (validated.ok === false) throw new Error(`invalid_journal_influence_summary:${validated.errors.join('; ')}`);
  return validated.value;
}

export function serializeJournalInfluenceSnapshot(input: JournalInfluenceSnapshot): string {
  return JSON.stringify(input);
}

export function deserializeJournalInfluenceSnapshot(json: string): JournalInfluenceSnapshot {
  const parsed = parseJson(json);
  const validated = validateJournalInfluenceSnapshot(parsed);
  if (validated.ok === false) throw new Error(`invalid_journal_influence_snapshot:${validated.errors.join('; ')}`);
  return validated.value;
}
