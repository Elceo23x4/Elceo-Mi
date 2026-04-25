import type {
  PortfolioActionStatus,
  PortfolioRevisionType,
  PositionStatus,
  ThesisHealth,
  WatchlistEntryStatus
} from '@elceo/types';

const WATCHLIST_TRANSITIONS: Record<WatchlistEntryStatus, readonly WatchlistEntryStatus[]> = {
  watching: ['thesis_active', 'readiness_pending', 'archived'],
  readiness_pending: ['thesis_active', 'archived'],
  thesis_active: ['archived', 'readiness_pending'],
  archived: []
};

const POSITION_TRANSITIONS: Record<PositionStatus, readonly PositionStatus[]> = {
  proposed: ['open', 'canceled'],
  open: ['reducing', 'closed'],
  reducing: ['closed'],
  closed: [],
  canceled: []
};

const ACTION_TRANSITIONS: Record<PortfolioActionStatus, readonly PortfolioActionStatus[]> = {
  open: ['completed', 'dismissed'],
  completed: [],
  dismissed: []
};

const THESIS_TRANSITIONS: Record<ThesisHealth, readonly ThesisHealth[]> = {
  strong: ['stable', 'weakening', 'invalidated'],
  stable: ['strong', 'weakening', 'invalidated'],
  weakening: ['stable', 'invalidated'],
  invalidated: []
};

const REVISION_SUMMARY_BY_TYPE: Record<PortfolioRevisionType, string> = {
  created: 'Portfolio entity created.',
  updated: 'Portfolio entity updated.',
  archived: 'Watchlist entry archived.',
  status_changed: 'Portfolio status updated.',
  completed: 'Portfolio action completed.',
  dismissed: 'Portfolio action dismissed.',
  thesis_health_changed: 'Thesis health updated.',
  linked: 'Portfolio entity linkage updated.',
  closed: 'Position closed.',
  canceled: 'Position canceled.'
};

export function assertValidWatchlistTransition(previousStatus: WatchlistEntryStatus, nextStatus: WatchlistEntryStatus): void {
  if (!WATCHLIST_TRANSITIONS[previousStatus].includes(nextStatus)) {
    throw new Error(`invalid_watchlist_transition:${previousStatus}_to_${nextStatus}`);
  }
}

export function assertValidPositionTransition(previousStatus: PositionStatus, nextStatus: PositionStatus): void {
  if (!POSITION_TRANSITIONS[previousStatus].includes(nextStatus)) {
    throw new Error(`invalid_position_transition:${previousStatus}_to_${nextStatus}`);
  }
}

export function assertValidActionTransition(previousStatus: PortfolioActionStatus, nextStatus: PortfolioActionStatus): void {
  if (!ACTION_TRANSITIONS[previousStatus].includes(nextStatus)) {
    throw new Error(`invalid_action_transition:${previousStatus}_to_${nextStatus}`);
  }
}

export function assertValidThesisHealthTransition(previousHealth: ThesisHealth, nextHealth: ThesisHealth, explicitRecovery = false): void {
  if (previousHealth === 'invalidated' && nextHealth === 'weakening') {
    if (!explicitRecovery) throw new Error('invalid_thesis_health_transition:invalidated_requires_explicit_recovery');
    return;
  }
  if (!THESIS_TRANSITIONS[previousHealth].includes(nextHealth)) {
    throw new Error(`invalid_thesis_health_transition:${previousHealth}_to_${nextHealth}`);
  }
}

export function buildPortfolioRevisionSummary(revisionType: PortfolioRevisionType): string {
  return REVISION_SUMMARY_BY_TYPE[revisionType];
}
