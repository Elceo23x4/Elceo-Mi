import type { PortfolioActionItem, PortfolioActionKind, WatchlistPriority } from '@elceo/types';

export type PortfolioActionCandidateInput = {
  subjectKind: PortfolioActionItem['subjectKind'];
  subjectId: string;
  priority: WatchlistPriority;
  kind: PortfolioActionKind;
  asset?: PortfolioActionItem['asset'];
  timeframe?: PortfolioActionItem['timeframe'];
  linkedEntryId?: string | null;
  linkedPositionId?: string | null;
  linkedJournalCaseId?: string | null;
  linkedReasoningRunId?: string | null;
  linkedNotificationDecisionId?: string | null;
};

export type DerivePortfolioActionCandidatesParams = {
  inputs: PortfolioActionCandidateInput[];
};

const PRIORITY_SCORE: Record<WatchlistPriority, number> = { critical: 4, high: 3, medium: 2, low: 1 };

const COPY: Record<PortfolioActionKind, { headline: string; rationale: string }> = {
  review_thesis: {
    headline: 'Review current thesis.',
    rationale: 'Recent signals indicate thesis quality may need reassessment.'
  },
  review_risk: {
    headline: 'Review position risk.',
    rationale: 'Current state suggests risk parameters should be reassessed.'
  },
  tighten_execution: {
    headline: 'Tighten execution process.',
    rationale: 'Execution discipline or adherence metrics are under pressure.'
  },
  prepare_entry: {
    headline: 'Prepare structured entry review.',
    rationale: 'Watchlist readiness is improving and requires execution planning.'
  },
  reduce_exposure: {
    headline: 'Reduce exposure attention.',
    rationale: 'Position state or thesis health indicates rising caution.'
  },
  close_position: {
    headline: 'Review close-position scenario.',
    rationale: 'Invalidation or deterioration signals justify close review.'
  },
  review_invalidated_thesis: {
    headline: 'Review invalidated thesis.',
    rationale: 'Thesis health has moved to invalidated.'
  },
  update_journal: {
    headline: 'Update journal record.',
    rationale: 'A portfolio-linked event requires journal follow-through.'
  },
  review_notification_signal: {
    headline: 'Review recent notification signal.',
    rationale: 'A high-priority notification requires portfolio attention.'
  }
};

function dedupeKey(input: PortfolioActionCandidateInput): string {
  return [input.kind, input.linkedEntryId ?? '-', input.linkedPositionId ?? '-', input.linkedJournalCaseId ?? '-', input.linkedNotificationDecisionId ?? '-', input.asset ?? '-', input.timeframe ?? '-'].join('|');
}

export function derivePortfolioActionCandidates(params: DerivePortfolioActionCandidatesParams): Omit<PortfolioActionItem, 'actionId' | 'createdAt' | 'updatedAt' | 'status' | 'completedAt' | 'dismissedAt'>[] {
  const seen = new Set<string>();
  const rows: Omit<PortfolioActionItem, 'actionId' | 'createdAt' | 'updatedAt' | 'status' | 'completedAt' | 'dismissedAt'>[] = [];

  for (const input of params.inputs) {
    const key = dedupeKey(input);
    if (seen.has(key)) continue;
    seen.add(key);
    rows.push({
      subjectKind: input.subjectKind,
      subjectId: input.subjectId,
      kind: input.kind,
      priority: input.priority,
      asset: input.asset ?? null,
      timeframe: input.timeframe ?? null,
      headline: COPY[input.kind].headline,
      rationale: COPY[input.kind].rationale,
      linkedEntryId: input.linkedEntryId ?? null,
      linkedPositionId: input.linkedPositionId ?? null,
      linkedJournalCaseId: input.linkedJournalCaseId ?? null,
      linkedReasoningRunId: input.linkedReasoningRunId ?? null,
      linkedNotificationDecisionId: input.linkedNotificationDecisionId ?? null
    });
  }

  rows.sort((a, b) => {
    const p = PRIORITY_SCORE[b.priority] - PRIORITY_SCORE[a.priority];
    if (p !== 0) return p;
    const kind = a.kind.localeCompare(b.kind);
    if (kind !== 0) return kind;
    const asset = (a.asset ?? '').localeCompare(b.asset ?? '');
    if (asset !== 0) return asset;
    return (a.timeframe ?? '').localeCompare(b.timeframe ?? '');
  });

  return rows;
}
