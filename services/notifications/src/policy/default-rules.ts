import type { NotificationChannel, NotificationPolicyRuleKey, NotificationTriggerKind } from '@elceo/types';

export type NotificationPolicyRule = {
  ruleKey: NotificationPolicyRuleKey;
  triggerKind: NotificationTriggerKind;
  minMaterialityScore: number;
  cooldownMinutes: number;
  eligibleChannels: NotificationChannel[];
  appliesTo: 'market';
};

export const DEFAULT_NOTIFICATION_POLICY_RULES: NotificationPolicyRule[] = [
  { ruleKey: 'reasoning_failure', triggerKind: 'reasoning_failure', minMaterialityScore: 80, cooldownMinutes: 30, eligibleChannels: ['in_app', 'email'], appliesTo: 'market' },
  { ruleKey: 'reasoning_degraded', triggerKind: 'reasoning_degraded', minMaterialityScore: 55, cooldownMinutes: 60, eligibleChannels: ['in_app'], appliesTo: 'market' },
  { ruleKey: 'cognition_initialized', triggerKind: 'cognition_initialized', minMaterialityScore: 55, cooldownMinutes: 1440, eligibleChannels: ['in_app'], appliesTo: 'market' },
  { ruleKey: 'bias_flip', triggerKind: 'bias_flip', minMaterialityScore: 55, cooldownMinutes: 60, eligibleChannels: ['in_app', 'push'], appliesTo: 'market' },
  { ruleKey: 'critical_drift', triggerKind: 'critical_drift', minMaterialityScore: 70, cooldownMinutes: 30, eligibleChannels: ['in_app', 'push', 'email'], appliesTo: 'market' },
  { ruleKey: 'major_drift', triggerKind: 'major_drift', minMaterialityScore: 55, cooldownMinutes: 60, eligibleChannels: ['in_app', 'push'], appliesTo: 'market' },
  { ruleKey: 'invalidation_risk_upgrade', triggerKind: 'invalidation_risk_upgrade', minMaterialityScore: 50, cooldownMinutes: 30, eligibleChannels: ['in_app', 'push'], appliesTo: 'market' },
  { ruleKey: 'contradiction_spike', triggerKind: 'contradiction_spike', minMaterialityScore: 45, cooldownMinutes: 120, eligibleChannels: ['in_app'], appliesTo: 'market' },
  { ruleKey: 'confidence_breakdown', triggerKind: 'confidence_breakdown', minMaterialityScore: 45, cooldownMinutes: 180, eligibleChannels: ['in_app'], appliesTo: 'market' },
  { ruleKey: 'freshness_decay', triggerKind: 'freshness_decay', minMaterialityScore: 35, cooldownMinutes: 360, eligibleChannels: ['in_app'], appliesTo: 'market' }
];
