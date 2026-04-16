import type { InAppAlert } from '@elceo/types';

const COOLDOWN_MINUTES: Record<InAppAlert['alert_class'], number> = {
  bias_changes: 45,
  contradiction_spikes: 30,
  key_level_interaction: 20,
  macro_event_incoming: 120,
  post_event_regime_shift: 60,
  journal_coaching_reminder: 1440
};

export function cooldownMinutesFor(alertClass: InAppAlert['alert_class']): number {
  return COOLDOWN_MINUTES[alertClass];
}

export function filterByPreference(alerts: InAppAlert[], notifications: {
  inApp: boolean;
  biasChanges: boolean;
  contradictionSpikes: boolean;
  keyLevelInteractions: boolean;
  macroEventWarnings: boolean;
  postEventRegimeShift: boolean;
  journalCoaching: boolean;
}): InAppAlert[] {
  if (!notifications.inApp) return [];

  return alerts.filter((alert) => {
    if (alert.alert_class === 'bias_changes') return notifications.biasChanges;
    if (alert.alert_class === 'contradiction_spikes') return notifications.contradictionSpikes;
    if (alert.alert_class === 'key_level_interaction') return notifications.keyLevelInteractions;
    if (alert.alert_class === 'macro_event_incoming') return notifications.macroEventWarnings;
    if (alert.alert_class === 'post_event_regime_shift') return notifications.postEventRegimeShift;
    if (alert.alert_class === 'journal_coaching_reminder') return notifications.journalCoaching;
    return true;
  });
}
