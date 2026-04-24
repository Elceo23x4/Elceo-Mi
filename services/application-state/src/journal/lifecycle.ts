import type { CanonicalJournalCase, JournalCaseRevisionType, JournalCaseStatus } from '@elceo/types';

const ALLOWED_TRANSITIONS: Record<JournalCaseStatus, readonly JournalCaseStatus[]> = {
  draft: ['planned', 'canceled'],
  planned: ['executed', 'canceled'],
  executed: ['partially_closed', 'closed'],
  partially_closed: ['closed'],
  closed: ['reviewed'],
  canceled: ['reviewed'],
  reviewed: []
};

const REVISION_SUMMARY_BY_TYPE: Record<JournalCaseRevisionType, string> = {
  created: 'Case created.',
  planned: 'Case planned.',
  executed: 'Case executed.',
  adjusted: 'Execution adjusted.',
  partially_closed: 'Case partially closed.',
  closed: 'Case closed.',
  canceled: 'Case canceled.',
  reviewed: 'Case reviewed.'
};

export function assertValidJournalCaseTransition(
  previousStatus: JournalCaseStatus,
  nextStatus: JournalCaseStatus,
  caseData: CanonicalJournalCase
): void {
  if (previousStatus === 'executed' && nextStatus === 'canceled') {
    if (caseData.execution.openedAt !== null) {
      throw new Error('invalid_journal_transition:executed_to_canceled_disallowed_after_opened');
    }
  }

  const allowed = ALLOWED_TRANSITIONS[previousStatus];
  if (!allowed.includes(nextStatus)) {
    throw new Error(`invalid_journal_transition:${previousStatus}_to_${nextStatus}`);
  }
}

export function buildJournalRevisionSummary(revisionType: JournalCaseRevisionType): string {
  return REVISION_SUMMARY_BY_TYPE[revisionType];
}
