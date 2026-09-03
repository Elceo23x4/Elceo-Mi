import type { CanonicalAssetSymbol, Timeframe } from '@elceo/types';
import { queryDb } from '../db/client';
import type {
  JournalCaseListQuery,
  JournalCaseRepository,
  PersistedJournalCaseRecord,
  PersistedJournalCaseRevisionRecord
} from './contracts';

function byCaseCreated(left: PersistedJournalCaseRecord, right: PersistedJournalCaseRecord): number {
  return Date.parse(right.createdAt) - Date.parse(left.createdAt) || left.caseId.localeCompare(right.caseId);
}

function byRevisionChangedAsc(left: PersistedJournalCaseRevisionRecord, right: PersistedJournalCaseRevisionRecord): number {
  return Date.parse(left.changedAt) - Date.parse(right.changedAt) || left.revisionId.localeCompare(right.revisionId);
}

function limitFrom(query: JournalCaseListQuery): number {
  return Math.max(1, Math.min(500, query.limit ?? 50));
}

export class MemoryJournalCaseRepository implements JournalCaseRepository {
  private readonly cases = new Map<string, PersistedJournalCaseRecord>();
  private readonly revisions = new Map<string, PersistedJournalCaseRevisionRecord>();

  async saveCase(record: PersistedJournalCaseRecord): Promise<void> {
    this.cases.set(record.caseId, record);
  }

  async getCaseForSubject(subjectKind: PersistedJournalCaseRecord['subjectKind'], subjectId: string, caseId: string): Promise<PersistedJournalCaseRecord | null> {
    const row = this.cases.get(caseId); return row?.subjectKind === subjectKind && row.subjectId === subjectId ? row : null;
  }

  async listCases(query: JournalCaseListQuery): Promise<PersistedJournalCaseRecord[]> {
    const limit = limitFrom(query);
    let rows = [...this.cases.values()];
    if (query.subjectKind) rows = rows.filter((row) => row.subjectKind === query.subjectKind);
    if (query.subjectId) rows = rows.filter((row) => row.subjectId === query.subjectId);
    if (query.asset) rows = rows.filter((row) => row.asset === query.asset);
    if (query.timeframe) rows = rows.filter((row) => row.timeframe === query.timeframe);
    if (query.status) rows = rows.filter((row) => row.status === query.status);
    if (query.createdAfter) rows = rows.filter((row) => Date.parse(row.createdAt) > Date.parse(query.createdAfter!));
    if (query.createdBefore) rows = rows.filter((row) => Date.parse(row.createdAt) < Date.parse(query.createdBefore!));
    rows.sort(byCaseCreated);
    return rows.slice(0, limit);
  }

  async saveRevision(record: PersistedJournalCaseRevisionRecord): Promise<void> {
    if (this.revisions.has(record.revisionId)) return;
    this.revisions.set(record.revisionId, record);
  }

  async listRevisionsForCaseForSubject(subjectKind: PersistedJournalCaseRecord['subjectKind'], subjectId: string, caseId: string): Promise<PersistedJournalCaseRevisionRecord[]> {
    const owned = this.cases.get(caseId);
    if (!owned || owned.subjectKind !== subjectKind || owned.subjectId !== subjectId) return [];
    return [...this.revisions.values()].filter((row) => row.caseId === caseId).sort(byRevisionChangedAsc);
  }

  async getLatestCaseForReasoningRun(reasoningRunId: string): Promise<PersistedJournalCaseRecord | null> {
    const rows = [...this.cases.values()].filter((row) => row.createdFromReasoningRunId === reasoningRunId).sort(byCaseCreated);
    return rows[0] ?? null;
  }
}

type CaseRow = {
  case_id: string;
  subject_kind: PersistedJournalCaseRecord['subjectKind'];
  subject_id: string;
  asset: string;
  timeframe: string;
  title: string;
  status: PersistedJournalCaseRecord['status'];
  direction: PersistedJournalCaseRecord['direction'];
  conviction: PersistedJournalCaseRecord['conviction'];
  thesis: string;
  setup_type: string;
  entry_price_planned: number | null;
  stop_loss_planned: number | null;
  take_profit_planned_json: string;
  risk_amount_planned: number | null;
  risk_percent_planned: number | null;
  invalidation_note: string | null;
  execution_checklist_json: string;
  created_from_reasoning_run_id: string | null;
  created_from_snapshot_id: string | null;
  created_from_drift_id: string | null;
  entry_price_executed: number | null;
  position_size: number | null;
  opened_at: string | null;
  last_adjusted_at: string | null;
  execution_notes_json: string;
  execution_quality: PersistedJournalCaseRecord['executionQuality'];
  exit_price: number | null;
  closed_at: string | null;
  pnl_amount: number | null;
  pnl_percent: number | null;
  r_multiple: number | null;
  outcome: PersistedJournalCaseRecord['outcome'];
  closure_reason: string | null;
  reviewed_at: string | null;
  what_went_well_json: string;
  what_went_wrong_json: string;
  lessons_json: string;
  behavior_tags_json: string;
  follow_up_actions_json: string;
  tags_json: string;
  created_at: string;
  updated_at: string;
  case_json: string;
};

function mapCaseRow(row: CaseRow): PersistedJournalCaseRecord {
  return {
    caseId: row.case_id,
    subjectKind: row.subject_kind,
    subjectId: row.subject_id,
    asset: row.asset,
    timeframe: row.timeframe as Timeframe,
    title: row.title,
    status: row.status,
    direction: row.direction,
    conviction: row.conviction,
    thesis: row.thesis,
    setupType: row.setup_type,
    entryPricePlanned: row.entry_price_planned,
    stopLossPlanned: row.stop_loss_planned,
    takeProfitPlannedJson: row.take_profit_planned_json,
    riskAmountPlanned: row.risk_amount_planned,
    riskPercentPlanned: row.risk_percent_planned,
    invalidationNote: row.invalidation_note,
    executionChecklistJson: row.execution_checklist_json,
    createdFromReasoningRunId: row.created_from_reasoning_run_id,
    createdFromSnapshotId: row.created_from_snapshot_id,
    createdFromDriftId: row.created_from_drift_id,
    entryPriceExecuted: row.entry_price_executed,
    positionSize: row.position_size,
    openedAt: row.opened_at,
    lastAdjustedAt: row.last_adjusted_at,
    executionNotesJson: row.execution_notes_json,
    executionQuality: row.execution_quality,
    exitPrice: row.exit_price,
    closedAt: row.closed_at,
    pnlAmount: row.pnl_amount,
    pnlPercent: row.pnl_percent,
    rMultiple: row.r_multiple,
    outcome: row.outcome,
    closureReason: row.closure_reason,
    reviewedAt: row.reviewed_at,
    whatWentWellJson: row.what_went_well_json,
    whatWentWrongJson: row.what_went_wrong_json,
    lessonsJson: row.lessons_json,
    behaviorTagsJson: row.behavior_tags_json,
    followUpActionsJson: row.follow_up_actions_json,
    tagsJson: row.tags_json,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    caseJson: row.case_json
  };
}

type RevisionRow = {
  revision_id: string;
  case_id: string;
  revision_type: PersistedJournalCaseRevisionRecord['revisionType'];
  previous_status: PersistedJournalCaseRevisionRecord['previousStatus'];
  next_status: PersistedJournalCaseRevisionRecord['nextStatus'];
  changed_at: string;
  changed_by_kind: PersistedJournalCaseRevisionRecord['changedByKind'];
  changed_by_id: string;
  summary: string;
  snapshot_json: string;
};

function mapRevisionRow(row: RevisionRow): PersistedJournalCaseRevisionRecord {
  return {
    revisionId: row.revision_id,
    caseId: row.case_id,
    revisionType: row.revision_type,
    previousStatus: row.previous_status,
    nextStatus: row.next_status,
    changedAt: row.changed_at,
    changedByKind: row.changed_by_kind,
    changedById: row.changed_by_id,
    summary: row.summary,
    snapshotJson: row.snapshot_json
  };
}

export class SqlJournalCaseRepository implements JournalCaseRepository {
  async saveCase(record: PersistedJournalCaseRecord): Promise<void> {
    await queryDb(
      `INSERT INTO app_journal_cases (
        case_id, subject_kind, subject_id, asset, timeframe, title, status, direction, conviction, thesis,
        setup_type, entry_price_planned, stop_loss_planned, take_profit_planned_json, risk_amount_planned,
        risk_percent_planned, invalidation_note, execution_checklist_json, created_from_reasoning_run_id,
        created_from_snapshot_id, created_from_drift_id, entry_price_executed, position_size, opened_at,
        last_adjusted_at, execution_notes_json, execution_quality, exit_price, closed_at, pnl_amount,
        pnl_percent, r_multiple, outcome, closure_reason, reviewed_at, what_went_well_json,
        what_went_wrong_json, lessons_json, behavior_tags_json, follow_up_actions_json, tags_json,
        created_at, updated_at, case_json
      ) VALUES (
        $1,$2,$3,$4,$5,$6,$7,$8,$9,$10,
        $11,$12,$13,$14::jsonb,$15,
        $16,$17,$18::jsonb,$19,
        $20,$21,$22,$23,$24,
        $25,$26::jsonb,$27,$28,$29,$30,
        $31,$32,$33,$34,$35,$36::jsonb,
        $37::jsonb,$38::jsonb,$39::jsonb,$40::jsonb,$41::jsonb,
        $42,$43,$44::jsonb
      )
      ON CONFLICT (case_id) DO UPDATE SET
        asset=EXCLUDED.asset,
        timeframe=EXCLUDED.timeframe,
        title=EXCLUDED.title,
        status=EXCLUDED.status,
        direction=EXCLUDED.direction,
        conviction=EXCLUDED.conviction,
        thesis=EXCLUDED.thesis,
        setup_type=EXCLUDED.setup_type,
        entry_price_planned=EXCLUDED.entry_price_planned,
        stop_loss_planned=EXCLUDED.stop_loss_planned,
        take_profit_planned_json=EXCLUDED.take_profit_planned_json,
        risk_amount_planned=EXCLUDED.risk_amount_planned,
        risk_percent_planned=EXCLUDED.risk_percent_planned,
        invalidation_note=EXCLUDED.invalidation_note,
        execution_checklist_json=EXCLUDED.execution_checklist_json,
        created_from_reasoning_run_id=EXCLUDED.created_from_reasoning_run_id,
        created_from_snapshot_id=EXCLUDED.created_from_snapshot_id,
        created_from_drift_id=EXCLUDED.created_from_drift_id,
        entry_price_executed=EXCLUDED.entry_price_executed,
        position_size=EXCLUDED.position_size,
        opened_at=EXCLUDED.opened_at,
        last_adjusted_at=EXCLUDED.last_adjusted_at,
        execution_notes_json=EXCLUDED.execution_notes_json,
        execution_quality=EXCLUDED.execution_quality,
        exit_price=EXCLUDED.exit_price,
        closed_at=EXCLUDED.closed_at,
        pnl_amount=EXCLUDED.pnl_amount,
        pnl_percent=EXCLUDED.pnl_percent,
        r_multiple=EXCLUDED.r_multiple,
        outcome=EXCLUDED.outcome,
        closure_reason=EXCLUDED.closure_reason,
        reviewed_at=EXCLUDED.reviewed_at,
        what_went_well_json=EXCLUDED.what_went_well_json,
        what_went_wrong_json=EXCLUDED.what_went_wrong_json,
        lessons_json=EXCLUDED.lessons_json,
        behavior_tags_json=EXCLUDED.behavior_tags_json,
        follow_up_actions_json=EXCLUDED.follow_up_actions_json,
        tags_json=EXCLUDED.tags_json,
        created_at=EXCLUDED.created_at,
        updated_at=EXCLUDED.updated_at,
        case_json=EXCLUDED.case_json WHERE app_journal_cases.subject_kind=EXCLUDED.subject_kind AND app_journal_cases.subject_id=EXCLUDED.subject_id`,
      [
        record.caseId, record.subjectKind, record.subjectId, record.asset, record.timeframe, record.title, record.status, record.direction, record.conviction, record.thesis,
        record.setupType, record.entryPricePlanned, record.stopLossPlanned, record.takeProfitPlannedJson, record.riskAmountPlanned,
        record.riskPercentPlanned, record.invalidationNote, record.executionChecklistJson, record.createdFromReasoningRunId,
        record.createdFromSnapshotId, record.createdFromDriftId, record.entryPriceExecuted, record.positionSize, record.openedAt,
        record.lastAdjustedAt, record.executionNotesJson, record.executionQuality, record.exitPrice, record.closedAt, record.pnlAmount,
        record.pnlPercent, record.rMultiple, record.outcome, record.closureReason, record.reviewedAt, record.whatWentWellJson,
        record.whatWentWrongJson, record.lessonsJson, record.behaviorTagsJson, record.followUpActionsJson, record.tagsJson,
        record.createdAt, record.updatedAt, record.caseJson
      ]
    );
  }

  async getCaseForSubject(subjectKind: PersistedJournalCaseRecord['subjectKind'], subjectId: string, caseId: string): Promise<PersistedJournalCaseRecord | null> {
    const rows = await queryDb<CaseRow>(
      `SELECT
        case_id, subject_kind, subject_id, asset, timeframe, title, status, direction, conviction, thesis,
        setup_type, entry_price_planned, stop_loss_planned,
        take_profit_planned_json::text AS take_profit_planned_json,
        risk_amount_planned, risk_percent_planned, invalidation_note,
        execution_checklist_json::text AS execution_checklist_json,
        created_from_reasoning_run_id, created_from_snapshot_id, created_from_drift_id,
        entry_price_executed, position_size, opened_at, last_adjusted_at,
        execution_notes_json::text AS execution_notes_json, execution_quality,
        exit_price, closed_at, pnl_amount, pnl_percent, r_multiple, outcome, closure_reason, reviewed_at,
        what_went_well_json::text AS what_went_well_json,
        what_went_wrong_json::text AS what_went_wrong_json,
        lessons_json::text AS lessons_json,
        behavior_tags_json::text AS behavior_tags_json,
        follow_up_actions_json::text AS follow_up_actions_json,
        tags_json::text AS tags_json,
        created_at, updated_at, case_json::text AS case_json
       FROM app_journal_cases WHERE case_id = $1 AND subject_kind = $2 AND subject_id = $3`,
      [caseId, subjectKind, subjectId]
    );
    return rows[0] ? mapCaseRow(rows[0]) : null;
  }

  async listCases(query: JournalCaseListQuery): Promise<PersistedJournalCaseRecord[]> {
    const clauses: string[] = [];
    const values: unknown[] = [];
    if (query.subjectKind) {
      values.push(query.subjectKind);
      clauses.push(`subject_kind = $${values.length}`);
    }
    if (query.subjectId) {
      values.push(query.subjectId);
      clauses.push(`subject_id = $${values.length}`);
    }
    if (query.asset) {
      values.push(query.asset);
      clauses.push(`asset = $${values.length}`);
    }
    if (query.timeframe) {
      values.push(query.timeframe);
      clauses.push(`timeframe = $${values.length}`);
    }
    if (query.status) {
      values.push(query.status);
      clauses.push(`status = $${values.length}`);
    }
    if (query.createdAfter) {
      values.push(query.createdAfter);
      clauses.push(`created_at > $${values.length}`);
    }
    if (query.createdBefore) {
      values.push(query.createdBefore);
      clauses.push(`created_at < $${values.length}`);
    }
    values.push(limitFrom(query));
    const whereSql = clauses.length > 0 ? `WHERE ${clauses.join(' AND ')}` : '';
    const rows = await queryDb<CaseRow>(
      `SELECT
        case_id, subject_kind, subject_id, asset, timeframe, title, status, direction, conviction, thesis,
        setup_type, entry_price_planned, stop_loss_planned,
        take_profit_planned_json::text AS take_profit_planned_json,
        risk_amount_planned, risk_percent_planned, invalidation_note,
        execution_checklist_json::text AS execution_checklist_json,
        created_from_reasoning_run_id, created_from_snapshot_id, created_from_drift_id,
        entry_price_executed, position_size, opened_at, last_adjusted_at,
        execution_notes_json::text AS execution_notes_json, execution_quality,
        exit_price, closed_at, pnl_amount, pnl_percent, r_multiple, outcome, closure_reason, reviewed_at,
        what_went_well_json::text AS what_went_well_json,
        what_went_wrong_json::text AS what_went_wrong_json,
        lessons_json::text AS lessons_json,
        behavior_tags_json::text AS behavior_tags_json,
        follow_up_actions_json::text AS follow_up_actions_json,
        tags_json::text AS tags_json,
        created_at, updated_at, case_json::text AS case_json
       FROM app_journal_cases
       ${whereSql}
       ORDER BY created_at DESC, case_id ASC
       LIMIT $${values.length}`,
      values
    );
    return rows.map(mapCaseRow);
  }

  async saveRevision(record: PersistedJournalCaseRevisionRecord): Promise<void> {
    await queryDb(
      `INSERT INTO app_journal_case_revisions (
        revision_id, case_id, revision_type, previous_status, next_status, changed_at,
        changed_by_kind, changed_by_id, summary, snapshot_json
      ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10::jsonb)
      ON CONFLICT (revision_id) DO NOTHING`,
      [
        record.revisionId,
        record.caseId,
        record.revisionType,
        record.previousStatus,
        record.nextStatus,
        record.changedAt,
        record.changedByKind,
        record.changedById,
        record.summary,
        record.snapshotJson
      ]
    );
  }

  async listRevisionsForCaseForSubject(subjectKind: PersistedJournalCaseRecord['subjectKind'], subjectId: string, caseId: string): Promise<PersistedJournalCaseRevisionRecord[]> {
    const rows = await queryDb<RevisionRow>(
      `SELECT revision_id, case_id, revision_type, previous_status, next_status, changed_at,
        changed_by_kind, changed_by_id, summary, snapshot_json::text AS snapshot_json
       FROM app_journal_case_revisions
       WHERE case_id = $1
         AND EXISTS (SELECT 1 FROM app_journal_cases c WHERE c.case_id=$1 AND c.subject_kind=$2 AND c.subject_id=$3)
       ORDER BY changed_at ASC, revision_id ASC`,
      [caseId, subjectKind, subjectId]
    );
    return rows.map(mapRevisionRow);
  }

  async getLatestCaseForReasoningRun(reasoningRunId: string): Promise<PersistedJournalCaseRecord | null> {
    const rows = await queryDb<CaseRow>(
      `SELECT
        case_id, subject_kind, subject_id, asset, timeframe, title, status, direction, conviction, thesis,
        setup_type, entry_price_planned, stop_loss_planned,
        take_profit_planned_json::text AS take_profit_planned_json,
        risk_amount_planned, risk_percent_planned, invalidation_note,
        execution_checklist_json::text AS execution_checklist_json,
        created_from_reasoning_run_id, created_from_snapshot_id, created_from_drift_id,
        entry_price_executed, position_size, opened_at, last_adjusted_at,
        execution_notes_json::text AS execution_notes_json, execution_quality,
        exit_price, closed_at, pnl_amount, pnl_percent, r_multiple, outcome, closure_reason, reviewed_at,
        what_went_well_json::text AS what_went_well_json,
        what_went_wrong_json::text AS what_went_wrong_json,
        lessons_json::text AS lessons_json,
        behavior_tags_json::text AS behavior_tags_json,
        follow_up_actions_json::text AS follow_up_actions_json,
        tags_json::text AS tags_json,
        created_at, updated_at, case_json::text AS case_json
       FROM app_journal_cases
       WHERE created_from_reasoning_run_id = $1
       ORDER BY created_at DESC, case_id ASC
       LIMIT 1`,
      [reasoningRunId]
    );
    return rows[0] ? mapCaseRow(rows[0]) : null;
  }
}

function runtimeEnv(): Record<string, string | undefined> {
  return (globalThis as { process?: { env?: Record<string, string | undefined> } }).process?.env ?? {};
}

let singleton: JournalCaseRepository | null = null;

export function getJournalCaseRepository(): JournalCaseRepository {
  if (!singleton) {
    singleton = runtimeEnv().APP_STATE_REPOSITORY === 'memory' ? new MemoryJournalCaseRepository() : new SqlJournalCaseRepository();
  }
  return singleton;
}

export function setJournalCaseRepository(next: JournalCaseRepository): void {
  singleton = next;
}

export type { JournalCaseRepository, PersistedJournalCaseRecord, PersistedJournalCaseRevisionRecord };
export type { JournalCaseListQuery };
export type { CanonicalAssetSymbol, Timeframe };
