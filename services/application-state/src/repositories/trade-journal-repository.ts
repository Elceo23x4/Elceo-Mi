import type { TradeJournalCreateInput, TradeJournalEntry, TradeJournalListItem, TradeJournalMedia } from '@elceo/types';
import { queryDb } from '../db/client';

export interface TradeJournalRepository {
  createEntry(userId: string, input: TradeJournalCreateInput): Promise<TradeJournalEntry>;
  listEntries(userId: string, limit?: number): Promise<TradeJournalListItem[]>;
  getEntries(userId: string, limit?: number): Promise<TradeJournalEntry[]>;
}

type TradeJournalRow = {
  entry_id: string;
  user_id: string;
  asset: string;
  direction: TradeJournalEntry['direction'];
  entry_price: number;
  stop_price: number;
  take_profit_price: number;
  exit_price: number;
  outcome: TradeJournalEntry['outcome'];
  result_r_multiple: number;
  setup_type: TradeJournalEntry['setupType'];
  reason: string;
  emotion: TradeJournalEntry['emotion'];
  session_traded: TradeJournalEntry['sessionTraded'];
  major_news_nearby: boolean;
  followed_elceo_bias: boolean;
  confidence_before_trade: number;
  confidence_after_trade: number;
  mistake_category: TradeJournalEntry['mistakeCategory'];
  lesson_category: TradeJournalEntry['lessonCategory'];
  pnl_amount: number;
  traded_at_utc: string;
  closed_at_utc: string;
  created_at_utc: string;
  updated_at_utc: string;
  media: string;
};


const JOURNAL_MEDIA_CAP = 8;
const MEDIA_PENDING_RETENTION_DAYS = 30;

function sanitizeMedia(media: TradeJournalMedia[]): TradeJournalMedia[] {
  const cutoff = Date.now() - MEDIA_PENDING_RETENTION_DAYS * 24 * 60 * 60 * 1000;
  return media
    .filter((item) => item.status === "ready" || new Date(item.uploadedAtUtc).getTime() >= cutoff)
    .slice(0, JOURNAL_MEDIA_CAP);
}

function clampConfidence(value: number): number {
  return Math.max(0, Math.min(100, value));
}

function deriveOutcome(rMultiple: number): TradeJournalEntry['outcome'] {
  if (rMultiple > 0.05) return 'win';
  if (rMultiple < -0.05) return 'loss';
  return 'breakeven';
}

function calculateRMultiple(input: TradeJournalCreateInput): number {
  const riskDistance = Math.abs(input.entryPrice - input.stopPrice);
  if (riskDistance === 0) {
    throw new Error('Stop price cannot equal entry price');
  }

  const pnlDistance = input.direction === 'long' ? input.exitPrice - input.entryPrice : input.entryPrice - input.exitPrice;
  return pnlDistance / riskDistance;
}

function plannedRiskReward(input: TradeJournalCreateInput): number {
  const riskDistance = Math.abs(input.entryPrice - input.stopPrice);
  const rewardDistance = Math.abs(input.takeProfitPrice - input.entryPrice);
  if (riskDistance === 0) return 0;
  return rewardDistance / riskDistance;
}

function toPnlAmount(input: TradeJournalCreateInput): number {
  const rr = calculateRMultiple(input);
  return rr * 100;
}

function mapRow(row: TradeJournalRow): TradeJournalEntry {
  return {
    entryId: row.entry_id,
    userId: row.user_id,
    asset: row.asset,
    direction: row.direction,
    entryPrice: row.entry_price,
    stopPrice: row.stop_price,
    takeProfitPrice: row.take_profit_price,
    exitPrice: row.exit_price,
    outcome: row.outcome,
    resultRMultiple: row.result_r_multiple,
    setupType: row.setup_type,
    reason: row.reason,
    emotion: row.emotion,
    sessionTraded: row.session_traded,
    majorNewsNearby: row.major_news_nearby,
    followedElceoBias: row.followed_elceo_bias,
    confidenceBeforeTrade: row.confidence_before_trade,
    confidenceAfterTrade: row.confidence_after_trade,
    mistakeCategory: row.mistake_category,
    lessonCategory: row.lesson_category,
    pnlAmount: row.pnl_amount,
    tradedAtUtc: row.traded_at_utc,
    closedAtUtc: row.closed_at_utc,
    createdAtUtc: row.created_at_utc,
    updatedAtUtc: row.updated_at_utc,
    media: JSON.parse(row.media) as TradeJournalMedia[]
  };
}

export class PostgresTradeJournalRepository implements TradeJournalRepository {
  async createEntry(userId: string, input: TradeJournalCreateInput): Promise<TradeJournalEntry> {
    const resultRMultiple = calculateRMultiple(input);
    const outcome = deriveOutcome(resultRMultiple);
    const pnlAmount = toPnlAmount(input);

    const rows = await queryDb<TradeJournalRow>(
      `INSERT INTO app_trade_journal_entries (
        user_id, asset, direction, entry_price, stop_price, take_profit_price, exit_price,
        outcome, result_r_multiple, setup_type, reason, emotion, session_traded, major_news_nearby,
        followed_elceo_bias, confidence_before_trade, confidence_after_trade, mistake_category,
        lesson_category, pnl_amount, traded_at_utc, closed_at_utc, media
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7,
        $8, $9, $10, $11, $12, $13, $14,
        $15, $16, $17, $18,
        $19, $20, $21, $22, $23
      )
      RETURNING
        entry_id, user_id, asset, direction, entry_price, stop_price, take_profit_price, exit_price,
        outcome, result_r_multiple, setup_type, reason, emotion, session_traded, major_news_nearby,
        followed_elceo_bias, confidence_before_trade, confidence_after_trade, mistake_category,
        lesson_category, pnl_amount, traded_at_utc, closed_at_utc, created_at_utc, updated_at_utc,
        media::text AS media`,
      [
        userId,
        input.asset,
        input.direction,
        input.entryPrice,
        input.stopPrice,
        input.takeProfitPrice,
        input.exitPrice,
        outcome,
        resultRMultiple,
        input.setupType,
        input.reason,
        input.emotion,
        input.sessionTraded,
        input.majorNewsNearby,
        input.followedElceoBias,
        clampConfidence(input.confidenceBeforeTrade),
        clampConfidence(input.confidenceAfterTrade),
        input.mistakeCategory,
        input.lessonCategory,
        pnlAmount,
        input.tradedAtUtc,
        input.closedAtUtc,
        JSON.stringify(sanitizeMedia(input.media))
      ]
    );

    if (!rows[0]) throw new Error('Unable to create journal entry');
    return mapRow(rows[0]);
  }

  async listEntries(userId: string, limit = 60): Promise<TradeJournalListItem[]> {
    const rows = await this.getEntries(userId, limit);
    return rows.map((entry) => ({
      entryId: entry.entryId,
      asset: entry.asset,
      direction: entry.direction,
      outcome: entry.outcome,
      resultRMultiple: entry.resultRMultiple,
      pnlAmount: entry.pnlAmount,
      setupType: entry.setupType,
      emotion: entry.emotion,
      sessionTraded: entry.sessionTraded,
      tradedAtUtc: entry.tradedAtUtc,
      closedAtUtc: entry.closedAtUtc
    }));
  }

  async getEntries(userId: string, limit = 250): Promise<TradeJournalEntry[]> {
    const rows = await queryDb<TradeJournalRow>(
      `SELECT
        entry_id, user_id, asset, direction, entry_price, stop_price, take_profit_price, exit_price,
        outcome, result_r_multiple, setup_type, reason, emotion, session_traded, major_news_nearby,
        followed_elceo_bias, confidence_before_trade, confidence_after_trade, mistake_category,
        lesson_category, pnl_amount, traded_at_utc, closed_at_utc, created_at_utc, updated_at_utc,
        media::text AS media
      FROM app_trade_journal_entries
      WHERE user_id = $1
      ORDER BY traded_at_utc DESC
      LIMIT $2`,
      [userId, limit]
    );

    return rows.map(mapRow);
  }
}

const memoryEntries = new Map<string, TradeJournalEntry[]>();

export class InMemoryTradeJournalRepository implements TradeJournalRepository {
  async createEntry(userId: string, input: TradeJournalCreateInput): Promise<TradeJournalEntry> {
    const resultRMultiple = calculateRMultiple(input);
    const outcome = deriveOutcome(resultRMultiple);
    const now = new Date().toISOString();

    const entry: TradeJournalEntry = {
      entryId: crypto.randomUUID(),
      userId,
      asset: input.asset,
      direction: input.direction,
      entryPrice: input.entryPrice,
      stopPrice: input.stopPrice,
      takeProfitPrice: input.takeProfitPrice,
      exitPrice: input.exitPrice,
      outcome,
      resultRMultiple,
      setupType: input.setupType,
      reason: input.reason,
      emotion: input.emotion,
      sessionTraded: input.sessionTraded,
      majorNewsNearby: input.majorNewsNearby,
      followedElceoBias: input.followedElceoBias,
      confidenceBeforeTrade: clampConfidence(input.confidenceBeforeTrade),
      confidenceAfterTrade: clampConfidence(input.confidenceAfterTrade),
      mistakeCategory: input.mistakeCategory,
      lessonCategory: input.lessonCategory,
      pnlAmount: toPnlAmount(input),
      tradedAtUtc: input.tradedAtUtc,
      closedAtUtc: input.closedAtUtc,
      createdAtUtc: now,
      updatedAtUtc: now,
      media: sanitizeMedia(input.media)
    };

    const bucket = memoryEntries.get(userId) ?? [];
    memoryEntries.set(userId, [entry, ...bucket]);
    return entry;
  }

  async listEntries(userId: string, limit = 60): Promise<TradeJournalListItem[]> {
    const rows = await this.getEntries(userId, limit);
    return rows.map((entry) => ({
      entryId: entry.entryId,
      asset: entry.asset,
      direction: entry.direction,
      outcome: entry.outcome,
      resultRMultiple: entry.resultRMultiple,
      pnlAmount: entry.pnlAmount,
      setupType: entry.setupType,
      emotion: entry.emotion,
      sessionTraded: entry.sessionTraded,
      tradedAtUtc: entry.tradedAtUtc,
      closedAtUtc: entry.closedAtUtc
    }));
  }

  async getEntries(userId: string, limit = 250): Promise<TradeJournalEntry[]> {
    return (memoryEntries.get(userId) ?? []).slice(0, limit);
  }
}

export function computePlannedRiskReward(input: TradeJournalCreateInput): number {
  return plannedRiskReward(input);
}
