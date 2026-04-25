import { validateCanonicalPortfolioSnapshot, validatePortfolioActionItem, validatePositionRecord, validateWatchlistEntry } from '@elceo/schemas';
import type { CanonicalPortfolioSnapshot, PortfolioActionItem, PositionRecord, WatchlistEntry } from '@elceo/types';

function parseJsonStrict(input: string, label: string): unknown {
  try {
    return JSON.parse(input) as unknown;
  } catch {
    throw new Error(`malformed_json:${label}`);
  }
}

export function serializeWatchlistEntry(entry: WatchlistEntry): string {
  return JSON.stringify(entry);
}

export function deserializeWatchlistEntry(input: string): WatchlistEntry {
  const parsed = parseJsonStrict(input, 'watchlist_entry');
  const result = validateWatchlistEntry(parsed);
  if (result.ok === false) throw new Error(`invalid_watchlist_entry:${result.errors.join('; ')}`);
  return result.value;
}

export function serializePositionRecord(position: PositionRecord): string {
  return JSON.stringify(position);
}

export function deserializePositionRecord(input: string): PositionRecord {
  const parsed = parseJsonStrict(input, 'position_record');
  const result = validatePositionRecord(parsed);
  if (result.ok === false) throw new Error(`invalid_position_record:${result.errors.join('; ')}`);
  return result.value;
}

export function serializePortfolioActionItem(action: PortfolioActionItem): string {
  return JSON.stringify(action);
}

export function deserializePortfolioActionItem(input: string): PortfolioActionItem {
  const parsed = parseJsonStrict(input, 'action_item');
  const result = validatePortfolioActionItem(parsed);
  if (result.ok === false) throw new Error(`invalid_portfolio_action_item:${result.errors.join('; ')}`);
  return result.value;
}

export function serializeCanonicalPortfolioSnapshot(snapshot: CanonicalPortfolioSnapshot): string {
  return JSON.stringify(snapshot);
}

export function deserializeCanonicalPortfolioSnapshot(input: string): CanonicalPortfolioSnapshot {
  const parsed = parseJsonStrict(input, 'portfolio_snapshot');
  const result = validateCanonicalPortfolioSnapshot(parsed);
  if (result.ok === false) throw new Error(`invalid_portfolio_snapshot:${result.errors.join('; ')}`);
  return result.value;
}
