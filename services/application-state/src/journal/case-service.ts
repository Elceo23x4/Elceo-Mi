import { validateCanonicalJournalCase } from '@elceo/schemas';
import type {
  CanonicalJournalCase,
  JournalActorKind,
  JournalCaseRevisionRecord,
  JournalCaseRevisionType,
  JournalCaseStatus
} from '@elceo/types';
import type { JournalCaseRepository, PersistedJournalCaseRecord } from '../persistence/contracts';
import { buildJournalRevisionSummary } from './lifecycle';
import { deserializeCanonicalJournalCase, serializeCanonicalJournalCase } from './serialization';

export type JournalActor = {
  actorKind: JournalActorKind;
  actorId: string;
  changedAt?: string;
};

export type CreateDraftCaseInput = {
  identity: CanonicalJournalCase['identity'];
  plan?: Partial<CanonicalJournalCase['plan']>;
  execution?: Partial<CanonicalJournalCase['execution']>;
  closure?: Partial<CanonicalJournalCase['closure']>;
  review?: Partial<CanonicalJournalCase['review']>;
  tags?: string[];
  createdAt?: string;
};

export type CreateDraftCaseFromReasoningContextInput = {
  subjectKind: CanonicalJournalCase['identity']['subjectKind'];
  subjectId: string;
  reasoningRunId?: string | null;
  snapshotId?: string | null;
  driftId?: string | null;
  asset?: CanonicalJournalCase['identity']['asset'];
  timeframe?: CanonicalJournalCase['identity']['timeframe'];
  title?: string;
  thesis?: string;
  direction?: CanonicalJournalCase['plan']['direction'];
};

export type JournalCasePatch = {
  status?: CanonicalJournalCase['status'];
  plan?: Partial<CanonicalJournalCase['plan']>;
  execution?: Partial<CanonicalJournalCase['execution']>;
  closure?: Partial<CanonicalJournalCase['closure']>;
  review?: Partial<CanonicalJournalCase['review']>;
  tags?: string[];
  identity?: Partial<Omit<CanonicalJournalCase['identity'], 'caseId'>>;
};

function nowIso(): string {
  return new Date().toISOString();
}

function createCaseId(): string {
  return `jcase-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

function createRevisionId(): string {
  return `jrev-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

function applyPatch(current: CanonicalJournalCase, patch: JournalCasePatch, nextStatus: JournalCaseStatus | null, updatedAt: string): CanonicalJournalCase {
  return {
    ...current,
    identity: {
      ...current.identity,
      ...(patch.identity ?? {})
    },
    status: nextStatus ?? current.status,
    plan: {
      ...current.plan,
      ...(patch.plan ?? {})
    },
    execution: {
      ...current.execution,
      ...(patch.execution ?? {})
    },
    closure: {
      ...current.closure,
      ...(patch.closure ?? {})
    },
    review: {
      ...current.review,
      ...(patch.review ?? {})
    },
    tags: patch.tags ?? current.tags,
    updatedAt
  };
}

function toPersistedCaseRecord(caseData: CanonicalJournalCase): PersistedJournalCaseRecord {
  return {
    caseId: caseData.identity.caseId,
    subjectKind: caseData.identity.subjectKind,
    subjectId: caseData.identity.subjectId,
    asset: caseData.identity.asset,
    timeframe: caseData.identity.timeframe,
    title: caseData.identity.title,
    status: caseData.status,
    direction: caseData.plan.direction,
    conviction: caseData.plan.conviction,
    thesis: caseData.plan.thesis,
    setupType: caseData.plan.setupType,
    entryPricePlanned: caseData.plan.entryPricePlanned,
    stopLossPlanned: caseData.plan.stopLossPlanned,
    takeProfitPlannedJson: JSON.stringify(caseData.plan.takeProfitPlanned),
    riskAmountPlanned: caseData.plan.riskAmountPlanned,
    riskPercentPlanned: caseData.plan.riskPercentPlanned,
    invalidationNote: caseData.plan.invalidationNote,
    executionChecklistJson: JSON.stringify(caseData.plan.executionChecklist),
    createdFromReasoningRunId: caseData.plan.createdFromReasoningRunId,
    createdFromSnapshotId: caseData.plan.createdFromSnapshotId,
    createdFromDriftId: caseData.plan.createdFromDriftId,
    entryPriceExecuted: caseData.execution.entryPriceExecuted,
    positionSize: caseData.execution.positionSize,
    openedAt: caseData.execution.openedAt,
    lastAdjustedAt: caseData.execution.lastAdjustedAt,
    executionNotesJson: JSON.stringify(caseData.execution.notes),
    executionQuality: caseData.execution.executionQuality,
    exitPrice: caseData.closure.exitPrice,
    closedAt: caseData.closure.closedAt,
    pnlAmount: caseData.closure.pnlAmount,
    pnlPercent: caseData.closure.pnlPercent,
    rMultiple: caseData.closure.rMultiple,
    outcome: caseData.closure.outcome,
    closureReason: caseData.closure.closureReason,
    reviewedAt: caseData.review.reviewedAt,
    whatWentWellJson: JSON.stringify(caseData.review.whatWentWell),
    whatWentWrongJson: JSON.stringify(caseData.review.whatWentWrong),
    lessonsJson: JSON.stringify(caseData.review.lessons),
    behaviorTagsJson: JSON.stringify(caseData.review.behaviorTags),
    followUpActionsJson: JSON.stringify(caseData.review.followUpActions),
    tagsJson: JSON.stringify(caseData.tags),
    createdAt: caseData.createdAt,
    updatedAt: caseData.updatedAt,
    caseJson: serializeCanonicalJournalCase(caseData)
  };
}

function makeRevisionRecord(caseData: CanonicalJournalCase, input: {
  previousStatus: JournalCaseStatus | null;
  nextStatus: JournalCaseStatus;
  revisionType: JournalCaseRevisionType;
  actor: JournalActor;
  changedAt: string;
}): JournalCaseRevisionRecord {
  return {
    revisionId: createRevisionId(),
    caseId: caseData.identity.caseId,
    revisionType: input.revisionType,
    previousStatus: input.previousStatus,
    nextStatus: input.nextStatus,
    changedAt: input.changedAt,
    changedByKind: input.actor.actorKind,
    changedById: input.actor.actorId,
    summary: buildJournalRevisionSummary(input.revisionType),
    snapshotJson: serializeCanonicalJournalCase(caseData)
  };
}

export class JournalCaseService {
  constructor(private readonly repository: JournalCaseRepository) {}

  async createDraftCase(input: CreateDraftCaseInput, actor: JournalActor): Promise<CanonicalJournalCase> {
    const at = input.createdAt ?? actor.changedAt ?? nowIso();
    const caseData: CanonicalJournalCase = {
      identity: {
        caseId: input.identity.caseId,
        subjectKind: input.identity.subjectKind,
        subjectId: input.identity.subjectId,
        asset: input.identity.asset,
        timeframe: input.identity.timeframe,
        title: input.identity.title
      },
      status: 'draft',
      plan: {
        direction: input.plan?.direction ?? 'long',
        thesis: input.plan?.thesis ?? 'Draft thesis pending.',
        setupType: input.plan?.setupType ?? 'unspecified',
        conviction: input.plan?.conviction ?? 'exploratory',
        entryPricePlanned: input.plan?.entryPricePlanned ?? null,
        stopLossPlanned: input.plan?.stopLossPlanned ?? null,
        takeProfitPlanned: input.plan?.takeProfitPlanned ?? [],
        riskAmountPlanned: input.plan?.riskAmountPlanned ?? null,
        riskPercentPlanned: input.plan?.riskPercentPlanned ?? null,
        invalidationNote: input.plan?.invalidationNote ?? null,
        executionChecklist: input.plan?.executionChecklist ?? [],
        createdFromReasoningRunId: input.plan?.createdFromReasoningRunId ?? null,
        createdFromSnapshotId: input.plan?.createdFromSnapshotId ?? null,
        createdFromDriftId: input.plan?.createdFromDriftId ?? null
      },
      execution: {
        entryPriceExecuted: input.execution?.entryPriceExecuted ?? null,
        positionSize: input.execution?.positionSize ?? null,
        openedAt: input.execution?.openedAt ?? null,
        lastAdjustedAt: input.execution?.lastAdjustedAt ?? null,
        notes: input.execution?.notes ?? [],
        executionQuality: input.execution?.executionQuality ?? null
      },
      closure: {
        exitPrice: input.closure?.exitPrice ?? null,
        closedAt: input.closure?.closedAt ?? null,
        pnlAmount: input.closure?.pnlAmount ?? null,
        pnlPercent: input.closure?.pnlPercent ?? null,
        rMultiple: input.closure?.rMultiple ?? null,
        outcome: 'open',
        closureReason: input.closure?.closureReason ?? null
      },
      review: {
        reviewedAt: input.review?.reviewedAt ?? null,
        whatWentWell: input.review?.whatWentWell ?? [],
        whatWentWrong: input.review?.whatWentWrong ?? [],
        lessons: input.review?.lessons ?? [],
        behaviorTags: input.review?.behaviorTags ?? [],
        followUpActions: input.review?.followUpActions ?? []
      },
      tags: input.tags ?? [],
      createdAt: at,
      updatedAt: at
    };

    const validated = validateCanonicalJournalCase(caseData);
    if (validated.ok === false) throw new Error(`invalid_journal_case:${validated.errors.join('; ')}`);

    if (!await this.repository.saveCase(toPersistedCaseRecord(caseData))) throw new Error(`journal_case_not_found:${caseData.identity.caseId}`);
    const revision = makeRevisionRecord(caseData, {
      previousStatus: null,
      nextStatus: 'draft',
      revisionType: 'created',
      actor,
      changedAt: at
    });

    await this.repository.saveRevision({
      revisionId: revision.revisionId,
      caseId: revision.caseId,
      revisionType: revision.revisionType,
      previousStatus: revision.previousStatus,
      nextStatus: revision.nextStatus,
      changedAt: revision.changedAt,
      changedByKind: revision.changedByKind,
      changedById: revision.changedById,
      summary: revision.summary,
      snapshotJson: revision.snapshotJson
    });
    return caseData;
  }

  async createDraftCaseFromReasoningContext(input: CreateDraftCaseFromReasoningContextInput, actor: JournalActor): Promise<CanonicalJournalCase> {
    if (!input.reasoningRunId && !input.snapshotId) {
      throw new Error('invalid_reasoning_context:reasoningRunId_or_snapshotId_required');
    }

    return this.createDraftCase(
      {
        identity: {
          caseId: createCaseId(),
          subjectKind: input.subjectKind,
          subjectId: input.subjectId,
          asset: input.asset ?? 'XAU/USD',
          timeframe: input.timeframe ?? 'H1',
          title: input.title ?? `Reasoning-linked case ${input.reasoningRunId ?? input.snapshotId}`
        },
        plan: {
          thesis: input.thesis ?? 'Reasoning-linked draft case.',
          direction: input.direction ?? 'long',
          setupType: 'reasoning_context',
          conviction: 'exploratory',
          createdFromReasoningRunId: input.reasoningRunId ?? null,
          createdFromSnapshotId: input.snapshotId ?? null,
          createdFromDriftId: input.driftId ?? null
        }
      },
      actor
    );
  }

  private async loadCase(subjectKind: 'user' | 'workspace' | 'ops', subjectId: string, caseId: string): Promise<CanonicalJournalCase> {
    const record = await this.repository.getCaseForSubject(subjectKind, subjectId, caseId);
    if (!record) throw new Error(`journal_case_not_found:${caseId}`);
    return deserializeCanonicalJournalCase(record.caseJson);
  }

  private async writeMutation(caseData: CanonicalJournalCase, previousStatus: JournalCaseStatus, revisionType: JournalCaseRevisionType, actor: JournalActor): Promise<CanonicalJournalCase> {
    const validated = validateCanonicalJournalCase(caseData);
    if (validated.ok === false) throw new Error(`invalid_journal_case:${validated.errors.join('; ')}`);
    if (!await this.repository.saveCase(toPersistedCaseRecord(caseData))) throw new Error(`journal_case_not_found:${caseData.identity.caseId}`);
    const changedAt = actor.changedAt ?? caseData.updatedAt;
    const revision = makeRevisionRecord(caseData, {
      previousStatus,
      nextStatus: caseData.status,
      revisionType,
      actor,
      changedAt
    });
    await this.repository.saveRevision({
      revisionId: revision.revisionId,
      caseId: revision.caseId,
      revisionType: revision.revisionType,
      previousStatus: revision.previousStatus,
      nextStatus: revision.nextStatus,
      changedAt: revision.changedAt,
      changedByKind: revision.changedByKind,
      changedById: revision.changedById,
      summary: revision.summary,
      snapshotJson: serializeCanonicalJournalCase(caseData)
    });
    return caseData;
  }

  async planCase(subjectKind: 'user' | 'workspace' | 'ops', subjectId: string, caseId: string, patch: JournalCasePatch, actor: JournalActor): Promise<CanonicalJournalCase> {
    const current = await this.loadCase(subjectKind, subjectId, caseId);
    if (current.status !== 'draft') throw new Error(`invalid_journal_transition:${current.status}_to_planned`);
    const updatedAt = actor.changedAt ?? nowIso();
    const next = applyPatch(current, patch, 'planned', updatedAt);
    return this.writeMutation(next, current.status, 'planned', actor);
  }

  async markExecuted(subjectKind: 'user' | 'workspace' | 'ops', subjectId: string, caseId: string, patch: JournalCasePatch, actor: JournalActor): Promise<CanonicalJournalCase> {
    const current = await this.loadCase(subjectKind, subjectId, caseId);
    if (current.status !== 'planned') throw new Error(`invalid_journal_transition:${current.status}_to_executed`);
    const updatedAt = actor.changedAt ?? nowIso();
    const next = applyPatch(current, patch, 'executed', updatedAt);
    if (!next.execution.openedAt) throw new Error('invalid_journal_execution:openedAt_required');
    return this.writeMutation(next, current.status, 'executed', actor);
  }

  async adjustExecution(subjectKind: 'user' | 'workspace' | 'ops', subjectId: string, caseId: string, patch: JournalCasePatch, actor: JournalActor): Promise<CanonicalJournalCase> {
    const current = await this.loadCase(subjectKind, subjectId, caseId);
    if (!(current.status === 'executed' || current.status === 'partially_closed')) {
      throw new Error(`invalid_journal_transition:${current.status}_to_adjusted`);
    }
    const updatedAt = actor.changedAt ?? nowIso();
    const next = applyPatch(current, patch, current.status, updatedAt);
    return this.writeMutation(next, current.status, 'adjusted', actor);
  }

  async markPartiallyClosed(subjectKind: 'user' | 'workspace' | 'ops', subjectId: string, caseId: string, patch: JournalCasePatch, actor: JournalActor): Promise<CanonicalJournalCase> {
    const current = await this.loadCase(subjectKind, subjectId, caseId);
    if (current.status !== 'executed') throw new Error(`invalid_journal_transition:${current.status}_to_partially_closed`);
    const updatedAt = actor.changedAt ?? nowIso();
    const next = applyPatch(current, patch, 'partially_closed', updatedAt);
    return this.writeMutation(next, current.status, 'partially_closed', actor);
  }

  async closeCase(subjectKind: 'user' | 'workspace' | 'ops', subjectId: string, caseId: string, patch: JournalCasePatch, actor: JournalActor): Promise<CanonicalJournalCase> {
    const current = await this.loadCase(subjectKind, subjectId, caseId);
    if (!(current.status === 'executed' || current.status === 'partially_closed')) {
      throw new Error(`invalid_journal_transition:${current.status}_to_closed`);
    }
    const updatedAt = actor.changedAt ?? nowIso();
    const next = applyPatch(current, patch, 'closed', updatedAt);
    if (!next.closure.closedAt) throw new Error('invalid_journal_closure:closedAt_required');
    if (next.closure.outcome === 'open') throw new Error('invalid_journal_closure:outcome_must_not_be_open');
    return this.writeMutation(next, current.status, 'closed', actor);
  }

  async cancelCase(subjectKind: 'user' | 'workspace' | 'ops', subjectId: string, caseId: string, patch: JournalCasePatch, actor: JournalActor): Promise<CanonicalJournalCase> {
    const current = await this.loadCase(subjectKind, subjectId, caseId);
    if (!(current.status === 'draft' || current.status === 'planned')) {
      throw new Error(`invalid_journal_transition:${current.status}_to_canceled`);
    }
    const updatedAt = actor.changedAt ?? nowIso();
    const next = applyPatch(current, patch, 'canceled', updatedAt);
    next.closure.outcome = 'open';
    return this.writeMutation(next, current.status, 'canceled', actor);
  }

  async reviewCase(subjectKind: 'user' | 'workspace' | 'ops', subjectId: string, caseId: string, patch: JournalCasePatch, actor: JournalActor): Promise<CanonicalJournalCase> {
    const current = await this.loadCase(subjectKind, subjectId, caseId);
    if (!(current.status === 'closed' || current.status === 'canceled')) {
      throw new Error(`invalid_journal_transition:${current.status}_to_reviewed`);
    }
    const updatedAt = actor.changedAt ?? nowIso();
    const next = applyPatch(current, patch, 'reviewed', updatedAt);
    if (!next.review.reviewedAt) throw new Error('invalid_journal_review:reviewedAt_required');
    return this.writeMutation(next, current.status, 'reviewed', actor);
  }
}
