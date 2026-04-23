import type { NotificationPolicyRuleKey } from '@elceo/types';
import type { NotificationPolicyContext } from './input-loader';

export type NotificationMessage = { headline: string; body: string };

export function buildNotificationMessage(ruleKey: NotificationPolicyRuleKey, context: NotificationPolicyContext): NotificationMessage {
  const asset = context.asset;
  const timeframe = context.timeframe;
  const run = context.reasoningRun;
  const cognition = context.cognition;
  const drift = context.driftReport;
  const failureReason = run.failureReason ?? 'unknown_error';

  if (ruleKey === 'reasoning_failure') {
    return { headline: `${asset} ${timeframe}: reasoning failed`, body: `Reasoning run ${run.reasoningRunId} failed with ${failureReason}.` };
  }
  if (ruleKey === 'reasoning_degraded') {
    return { headline: `${asset} ${timeframe}: reasoning degraded`, body: `Reasoning run ${run.reasoningRunId} completed with partial success: ${failureReason}.` };
  }
  if (ruleKey === 'cognition_initialized' && cognition) {
    return {
      headline: `${asset} ${timeframe}: cognition initialized`,
      body: `Bias is ${cognition.bias}. Confidence ${cognition.confidence.score}, contradiction ${cognition.contradiction.score}, freshness ${cognition.freshness.freshnessScore}.`
    };
  }
  if ((ruleKey === 'bias_flip' || ruleKey === 'critical_drift' || ruleKey === 'major_drift') && drift) {
    const headline = ruleKey === 'bias_flip'
      ? `${asset} ${timeframe}: bias flipped to ${drift.biasDelta.currentBias}`
      : ruleKey === 'critical_drift'
        ? `${asset} ${timeframe}: critical cognition drift`
        : `${asset} ${timeframe}: major cognition drift`;
    return { headline, body: drift.summary };
  }
  if (ruleKey === 'invalidation_risk_upgrade' && drift) {
    const matched = drift.keyChanges.find((entry) => entry.toLowerCase().includes('invalidation'));
    return {
      headline: `${asset} ${timeframe}: invalidation risk moved to ${drift.invalidationDelta.currentRiskLabel ?? 'unknown'}`,
      body: matched ?? drift.summary
    };
  }
  if (ruleKey === 'contradiction_spike' && drift && cognition) {
    return {
      headline: `${asset} ${timeframe}: contradiction increased`,
      body: `Contradiction is now ${cognition.contradiction.score} with drift ${drift.contradictionDelta.absoluteDelta}.`
    };
  }
  if (ruleKey === 'confidence_breakdown' && drift && cognition) {
    return {
      headline: `${asset} ${timeframe}: confidence weakened`,
      body: `Confidence is now ${cognition.confidence.score} with drift ${drift.confidenceDelta.absoluteDelta}.`
    };
  }
  if (ruleKey === 'freshness_decay' && drift && cognition) {
    return {
      headline: `${asset} ${timeframe}: evidence freshness decayed`,
      body: `Freshness is now ${cognition.freshness.freshnessScore} with drift ${drift.freshnessDelta.absoluteDelta}.`
    };
  }

  return {
    headline: `${asset} ${timeframe}: ${ruleKey}`,
    body: 'Notification context missing required data.'
  };
}
