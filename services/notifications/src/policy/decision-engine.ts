import type { NotificationDecision, NotificationPolicyRuleKey } from '@elceo/types';
import { validateNotificationDecision } from '@elceo/schemas';
import type { NotificationPolicyEvaluationRepositories, PersistedNotificationDecisionRecord } from '../persistence/contracts';
import { serializeNotificationDecision } from '../persistence/serialization';
import { buildCooldownUntil, isCooldownActive, type NotificationDecisionSuppressionReason } from './cooldown';
import { DEFAULT_NOTIFICATION_POLICY_RULES } from './default-rules';
import type { NotificationPolicyContext } from './input-loader';
import { buildMaterialChangeAssessment, buildMaterialityScoreForRule, mapMaterialityBand } from './material-change';
import { buildNotificationMessage } from './message-builder';

export type NotificationPolicyEvaluationReport = {
  evaluationId: string;
  reasoningRunId: string;
  asset: string;
  timeframe: string;
  evaluatedAt: string;
  evaluatedRuleCount: number;
  notifyCount: number;
  suppressedCount: number;
  decisions: NotificationDecision[];
};

function isRiskUpgradeWorsened(previous: string | null, current: string | null): boolean {
  const order = ['guarded', 'warning', 'fragile', 'broken'];
  const previousIndex = previous ? order.indexOf(previous) : -1;
  const currentIndex = current ? order.indexOf(current) : -1;
  return previousIndex >= 0 && currentIndex > previousIndex;
}

function evaluateRuleCondition(ruleKey: NotificationPolicyRuleKey, context: NotificationPolicyContext): boolean {
  const run = context.reasoningRun;
  const cognition = context.cognition;
  const drift = context.driftReport;

  if (ruleKey === 'reasoning_failure') return run.status === 'failed';
  if (ruleKey === 'reasoning_degraded') return run.status === 'partial_success' && Boolean(run.failureReason && run.failureReason.trim());
  if (ruleKey === 'cognition_initialized') return (run.status === 'success' || run.status === 'partial_success') && cognition !== null && drift === null;
  if (ruleKey === 'bias_flip') return drift !== null && drift.biasDelta.flip;
  if (ruleKey === 'critical_drift') return drift !== null && drift.severity === 'critical';
  if (ruleKey === 'major_drift') return drift !== null && drift.severity === 'major';
  if (ruleKey === 'invalidation_risk_upgrade') {
    return drift !== null
      && drift.invalidationDelta.riskLabelChanged
      && isRiskUpgradeWorsened(drift.invalidationDelta.previousRiskLabel, drift.invalidationDelta.currentRiskLabel);
  }
  if (ruleKey === 'contradiction_spike') {
    return drift !== null
      && cognition !== null
      && cognition.contradiction.score >= 60
      && drift.contradictionDelta.direction === 'up'
      && drift.contradictionDelta.absoluteDelta >= 10;
  }
  if (ruleKey === 'confidence_breakdown') {
    return drift !== null
      && cognition !== null
      && cognition.confidence.score <= 45
      && drift.confidenceDelta.direction === 'down'
      && drift.confidenceDelta.absoluteDelta >= 10;
  }
  if (ruleKey === 'freshness_decay') {
    return drift !== null
      && cognition !== null
      && cognition.freshness.freshnessScore <= 40
      && drift.freshnessDelta.direction === 'down'
      && drift.freshnessDelta.absoluteDelta >= 15;
  }
  return false;
}

export function buildNotificationDecisionKey(ruleKey: string, context: NotificationPolicyContext): string {
  if (context.driftRecord?.driftId) return `decision|${ruleKey}|drift|${context.driftRecord.driftId}`;
  if (context.cognitionSnapshot?.snapshotId) return `decision|${ruleKey}|snapshot|${context.cognitionSnapshot.snapshotId}`;
  if (context.reasoningRun.reasoningRunId) return `decision|${ruleKey}|run|${context.reasoningRun.reasoningRunId}`;
  throw new Error('missing_decision_key_identity');
}

function toPersistedRecord(decision: NotificationDecision): PersistedNotificationDecisionRecord {
  return {
    decisionId: decision.decisionId ?? decision.decisionKey ?? `decision-id|${decision.ruleKey ?? 'unknown'}|${decision.createdAt}`,
    decisionKey: decision.decisionKey ?? '',
    asset: decision.asset ?? 'XAU/USD',
    timeframe: decision.timeframe ?? 'H1',
    ruleKey: decision.ruleKey ?? 'reasoning_failure',
    triggerKind: decision.triggerKind,
    reasoningRunId: decision.reasoningRunId ?? null,
    snapshotId: decision.snapshotId ?? null,
    driftId: decision.driftId ?? null,
    materialityScore: decision.materialityScore ?? 0,
    shouldNotify: decision.shouldNotify ?? decision.shouldFire,
    suppressionReason: decision.suppressionReason ?? null,
    channelsJson: JSON.stringify(decision.channels),
    cooldownUntil: decision.cooldownUntil ?? null,
    headline: decision.headline ?? '',
    body: decision.body ?? '',
    createdAt: decision.createdAt,
    decisionJson: serializeNotificationDecision(decision)
  };
}

export async function evaluateNotificationPolicyForReasoningRun(
  context: NotificationPolicyContext,
  repositories: NotificationPolicyEvaluationRepositories,
  nowIso: string
): Promise<NotificationPolicyEvaluationReport> {
  const assessment = buildMaterialChangeAssessment(context);
  const decisions: NotificationDecision[] = [];

  for (const rule of DEFAULT_NOTIFICATION_POLICY_RULES) {
    const conditionMet = evaluateRuleCondition(rule.ruleKey, context);
    const materialityScore = buildMaterialityScoreForRule(rule.ruleKey, assessment);
    const latest = await repositories.decisionRepository.getLatestDecisionForRule(context.asset, context.timeframe, rule.ruleKey);

    let suppressionReason: NotificationDecisionSuppressionReason | null = null;
    if (!conditionMet) {
      suppressionReason = 'condition_not_met';
    } else if (materialityScore < rule.minMaterialityScore) {
      suppressionReason = 'below_materiality_threshold';
    } else if (isCooldownActive(latest, nowIso)) {
      suppressionReason = 'cooldown_active';
    }

    const shouldNotify = suppressionReason === null;
    const message = buildNotificationMessage(rule.ruleKey, context);
    const decisionKey = buildNotificationDecisionKey(rule.ruleKey, context);
    const decisionId = decisionKey;
    const cooldownUntil = shouldNotify ? buildCooldownUntil(nowIso, rule.cooldownMinutes) : null;

    const decision: NotificationDecision = {
      decisionId,
      decisionKey,
      shouldFire: shouldNotify,
      shouldNotify,
      reason: shouldNotify ? 'notify' : suppressionReason ?? 'condition_not_met',
      triggerKind: rule.triggerKind,
      channels: shouldNotify ? rule.eligibleChannels : [],
      cooldownApplied: suppressionReason === 'cooldown_active',
      suppressionApplied: !shouldNotify,
      evidenceIds: context.cognition?.evidence.topEvidenceIds ?? [],
      createdAt: nowIso,
      asset: context.asset,
      timeframe: context.timeframe,
      ruleKey: rule.ruleKey,
      reasoningRunId: context.reasoningRun.reasoningRunId,
      snapshotId: context.cognitionSnapshot?.snapshotId ?? null,
      driftId: context.driftRecord?.driftId ?? null,
      materialityScore,
      materialityBand: mapMaterialityBand(materialityScore),
      minMaterialityScore: rule.minMaterialityScore,
      suppressionReason,
      cooldownUntil,
      headline: message.headline,
      body: message.body,
      evaluatedAt: nowIso
    };

    const validated = validateNotificationDecision(decision);
    if (!validated.ok) {
      const errs = ('errors' in validated) ? validated.errors : [];
      throw new Error(`invalid_notification_decision:${errs.join(';')}`);
    }

    await repositories.decisionRepository.saveDecision(toPersistedRecord(decision));
    decisions.push(decision);
  }

  return {
    evaluationId: `evaluation|${context.reasoningRun.reasoningRunId}|${nowIso}`,
    reasoningRunId: context.reasoningRun.reasoningRunId,
    asset: context.asset,
    timeframe: context.timeframe,
    evaluatedAt: nowIso,
    evaluatedRuleCount: decisions.length,
    notifyCount: decisions.filter((decision) => decision.shouldNotify).length,
    suppressedCount: decisions.filter((decision) => !decision.shouldNotify).length,
    decisions
  };
}
