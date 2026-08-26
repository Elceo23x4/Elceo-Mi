import { evaluateAlertRules } from '../alerts/alert-rule-evaluator';
import { cooldownMinutesFor, filterByPreference } from '../alerts/dedupe-cooldown';
import { buildAdminOperationalSnapshot } from '../admin/source-health-shaping';
import type { ApplicationUserState } from '@elceo/application-state';
import type { DashboardChartWorkspaceViewModel } from '@elceo/types';

function assert(condition: boolean, message: string): void {
  if (!condition) throw new Error(message);
}

const baseWorkspace: DashboardChartWorkspaceViewModel = {
  dashboard: {
    contract_version: 'dashboard-display-v2',
    asset_code: 'XAU/USD',
    directional_bias: 'bullish',
    confidence_total: 70,
    confidence_anatomy: { sourceConfidence: 70 },
    contradiction: { score: 62, score_availability: 'available', state: 'transition' },
    zones: [],
    annotations: [],
    evidence_notes: [],
    modules: []
  },
  chart: {
    candles: [],
    zones: [{
      zone_id: 'zone-1',
      asset_code: 'XAU/USD',
      timeframe: 'H4',
      lower: 2300,
      upper: 2310,
      center: 2305,
      touches: 4,
      reaction_magnitude_atr: 1.2,
      hours_since_last_touch: 5,
      significance_score: 78
    }],
    annotations: [{
      kind: 'macro_event_marker',
      annotation_id: 'macro-1',
      asset_code: 'XAU/USD',
      event_id: 'ev-1',
      timestamp_utc: new Date(Date.now() + 30 * 60_000).toISOString(),
      evidence_ids: ['ev-1']
    }],
    default_filters: {
      keyLevelZones: true,
      macroEvents: true,
      contradiction: true,
      evidenceNotes: true,
      impulseOrigins: false
    },
    annotation_density_target: 'moderate'
  }
};

const userState = {
  profile: { id: 'u1' },
  notifications: {
    inApp: true,
    biasChanges: true,
    contradictionSpikes: true,
    keyLevelInteractions: true,
    macroEventWarnings: true,
    postEventRegimeShift: true,
    journalCoaching: false
  }
} as unknown as ApplicationUserState;

export function runAlertsAdminTests(): void {
  const previous = {
    ...baseWorkspace,
    dashboard: {
      ...baseWorkspace.dashboard,
      directional_bias: 'bearish',
      contradiction: { score: 40, score_availability: 'available', state: 'aligned' }
    }
  } as DashboardChartWorkspaceViewModel;

  const alerts = evaluateAlertRules({ current: baseWorkspace, previous, userState });
  assert(alerts.length >= 3, 'alerts should trigger from deterministic cognition/chart state');

  const filtered = filterByPreference(alerts, { ...userState.notifications, macroEventWarnings: false });
  assert(filtered.every((alert) => alert.alert_class !== 'macro_event_incoming'), 'preference filter should suppress disabled classes');

  assert(cooldownMinutesFor('contradiction_spikes') === 30, 'cooldown contract should be deterministic');

  const unavailable = { ...baseWorkspace, dashboard: { ...baseWorkspace.dashboard, contradiction: { score: null, score_availability: 'unavailable' as const, state: 'unknown' } } };
  assert(evaluateAlertRules({ current: unavailable, userState }).every((alert) => alert.alert_class !== 'contradiction_spikes'), 'unavailable contradiction must not rank as a real score');

  const admin = buildAdminOperationalSnapshot({ sourceHealth: [], cognitionByAsset: {}, auditLogs: [] });
  assert(Array.isArray(admin.auditLogs), 'audit log shaping should return array');
  assert(Array.isArray(admin.sourceHealth), 'source health shaping should return array');
}
