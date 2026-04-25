import type {
  CanonicalPortfolioSnapshot,
  CoachingSnapshot,
  WorkspaceAgendaItem,
  WorkspaceAttentionLevel,
  WorkspaceNotificationSummary,
  WorkspaceSubjectKind
} from '@elceo/types';

function priorityToScore(priority: WorkspaceAttentionLevel): number {
  if (priority === 'critical') return 90;
  if (priority === 'high') return 70;
  if (priority === 'medium') return 50;
  return 30;
}

function watchlistPriorityToAttention(priority: 'critical' | 'high' | 'medium' | 'low'): WorkspaceAttentionLevel {
  return priority;
}

function uniqueCaseIds(ids: string[], cap = 10): string[] {
  const output: string[] = [];
  const seen = new Set<string>();
  for (const id of ids) {
    if (seen.has(id)) continue;
    seen.add(id);
    output.push(id);
    if (output.length >= cap) break;
  }
  return output;
}

function itemDedupKey(item: Omit<WorkspaceAgendaItem, 'agendaId'>): string {
  return [
    item.sourceKind,
    item.linkedActionId ?? '-',
    item.linkedFocusId ?? '-',
    item.linkedPositionId ?? '-',
    item.linkedWatchlistEntryId ?? '-',
    item.headline
  ].join('|');
}

export function generateWorkspaceAgenda(params: {
  subjectKind: WorkspaceSubjectKind;
  subjectId: string;
  generatedAt: string;
  portfolioSnapshot: CanonicalPortfolioSnapshot | null;
  coachingSnapshot: CoachingSnapshot | null;
  notificationSummary: WorkspaceNotificationSummary;
}): WorkspaceAgendaItem[] {
  const items: Array<Omit<WorkspaceAgendaItem, 'agendaId'>> = [];
  const portfolio = params.portfolioSnapshot;

  if (portfolio) {
    portfolio.actionQueue
      .filter((action) => action.status === 'open')
      .forEach((action) => {
        const priority = watchlistPriorityToAttention(action.priority);
        items.push({
          sourceKind: 'portfolio_action',
          priority,
          headline: action.headline,
          rationale: action.rationale,
          linkedActionId: action.actionId,
          linkedFocusId: null,
          linkedNotificationDecisionId: action.linkedNotificationDecisionId,
          linkedReasoningRunId: action.linkedReasoningRunId,
          linkedPositionId: action.linkedPositionId,
          linkedWatchlistEntryId: action.linkedEntryId,
          supportingCaseIds: uniqueCaseIds(action.linkedJournalCaseId ? [action.linkedJournalCaseId] : []),
          score: priorityToScore(priority)
        });
      });
  }

  if (params.coachingSnapshot) {
    [...params.coachingSnapshot.summary.focusAreas]
      .sort((a, b) => b.score - a.score || a.focusId.localeCompare(b.focusId))
      .slice(0, 3)
      .forEach((focus) => {
        items.push({
          sourceKind: 'coaching_focus',
          priority: focus.priority,
          headline: focus.headline,
          rationale: focus.explanation,
          linkedActionId: null,
          linkedFocusId: focus.focusId,
          linkedNotificationDecisionId: null,
          linkedReasoningRunId: null,
          linkedPositionId: null,
          linkedWatchlistEntryId: null,
          supportingCaseIds: uniqueCaseIds(focus.supportingCaseIds),
          score: focus.score
        });
      });
  }

  if (portfolio) {
    const existingLinks = new Set(
      portfolio.actionQueue
        .filter((item) => item.status === 'open')
        .flatMap((item) => [item.linkedEntryId, item.linkedPositionId].filter((v): v is string => typeof v === 'string'))
    );

    portfolio.watchlistEntries.forEach((entry) => {
      if (existingLinks.has(entry.entryId)) return;
      if (entry.thesisHealth === 'invalidated') {
        items.push({
          sourceKind: 'thesis_health',
          priority: 'critical',
          headline: 'Review invalidated thesis.',
          rationale: 'A tracked thesis has moved to invalidated and requires attention.',
          linkedActionId: null,
          linkedFocusId: null,
          linkedNotificationDecisionId: null,
          linkedReasoningRunId: entry.linkedReasoningRunId,
          linkedPositionId: null,
          linkedWatchlistEntryId: entry.entryId,
          supportingCaseIds: uniqueCaseIds(entry.linkedJournalCaseId ? [entry.linkedJournalCaseId] : []),
          score: 88
        });
      }
      if (entry.thesisHealth === 'weakening') {
        items.push({
          sourceKind: 'thesis_health',
          priority: 'high',
          headline: 'Review weakening thesis.',
          rationale: 'A tracked thesis is weakening and should be reassessed.',
          linkedActionId: null,
          linkedFocusId: null,
          linkedNotificationDecisionId: null,
          linkedReasoningRunId: entry.linkedReasoningRunId,
          linkedPositionId: null,
          linkedWatchlistEntryId: entry.entryId,
          supportingCaseIds: uniqueCaseIds(entry.linkedJournalCaseId ? [entry.linkedJournalCaseId] : []),
          score: 68
        });
      }
    });

    portfolio.positions.forEach((position) => {
      if (existingLinks.has(position.positionId)) return;
      if (position.thesisHealth === 'invalidated') {
        items.push({
          sourceKind: 'thesis_health',
          priority: 'critical',
          headline: 'Review invalidated thesis.',
          rationale: 'A tracked thesis has moved to invalidated and requires attention.',
          linkedActionId: null,
          linkedFocusId: null,
          linkedNotificationDecisionId: null,
          linkedReasoningRunId: position.linkedReasoningRunId,
          linkedPositionId: position.positionId,
          linkedWatchlistEntryId: null,
          supportingCaseIds: uniqueCaseIds(position.linkedJournalCaseId ? [position.linkedJournalCaseId] : []),
          score: 88
        });
      }
      if (position.thesisHealth === 'weakening') {
        items.push({
          sourceKind: 'thesis_health',
          priority: 'high',
          headline: 'Review weakening thesis.',
          rationale: 'A tracked thesis is weakening and should be reassessed.',
          linkedActionId: null,
          linkedFocusId: null,
          linkedNotificationDecisionId: null,
          linkedReasoningRunId: position.linkedReasoningRunId,
          linkedPositionId: position.positionId,
          linkedWatchlistEntryId: null,
          supportingCaseIds: uniqueCaseIds(position.linkedJournalCaseId ? [position.linkedJournalCaseId] : []),
          score: 68
        });
      }
    });
  }

  if (params.notificationSummary.unreadInboxCount >= 3) {
    items.push({
      sourceKind: 'notification',
      priority: 'medium',
      headline: 'Review unread notification backlog.',
      rationale: 'Unread operational notifications are accumulating.',
      linkedActionId: null,
      linkedFocusId: null,
      linkedNotificationDecisionId: null,
      linkedReasoningRunId: null,
      linkedPositionId: null,
      linkedWatchlistEntryId: null,
      supportingCaseIds: [],
      score: Math.min(65, 30 + params.notificationSummary.unreadInboxCount * 5)
    });
  }

  if (params.notificationSummary.degradedTargetCount > 0 || params.notificationSummary.criticalReceiptCount > 0) {
    const degraded = params.notificationSummary.degradedTargetCount > 0;
    items.push({
      sourceKind: 'notification',
      priority: degraded ? 'high' : 'medium',
      headline: 'Review notification delivery health.',
      rationale: 'Delivery health signals show degraded targets or critical receipts.',
      linkedActionId: null,
      linkedFocusId: null,
      linkedNotificationDecisionId: null,
      linkedReasoningRunId: null,
      linkedPositionId: null,
      linkedWatchlistEntryId: null,
      supportingCaseIds: [],
      score: degraded ? 72 : 52
    });
  }

  const deduped: Array<Omit<WorkspaceAgendaItem, 'agendaId'>> = [];
  const dedupeSet = new Set<string>();
  for (const item of items) {
    const key = itemDedupKey(item);
    if (dedupeSet.has(key)) continue;
    dedupeSet.add(key);
    deduped.push(item);
  }

  return deduped
    .sort((a, b) => b.score - a.score || a.sourceKind.localeCompare(b.sourceKind) || a.headline.localeCompare(b.headline))
    .slice(0, 10)
    .map((item, index) => ({
      ...item,
      agendaId: `agenda|${item.sourceKind}|${params.subjectKind}|${params.subjectId}|${params.generatedAt}|${index + 1}`,
      supportingCaseIds: uniqueCaseIds(item.supportingCaseIds, 10)
    }));
}
