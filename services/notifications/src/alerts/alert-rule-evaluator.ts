import type { DashboardChartWorkspaceViewModel, InAppAlert } from '@elceo/types';
import type { ApplicationUserState } from '@elceo/application-state';

export type AlertEvaluationInput = {
  current: DashboardChartWorkspaceViewModel;
  previous?: DashboardChartWorkspaceViewModel;
  userState: ApplicationUserState;
};

function uuid(): string {
  return crypto.randomUUID();
}

function makeAlert(userId: string, assetCode: string, alertClass: InAppAlert['alert_class'], title: string, body: string, fingerprint: string, metadata: Record<string, unknown>): InAppAlert {
  return {
    alert_id: uuid(),
    user_id: userId,
    asset_code: assetCode,
    alert_class: alertClass,
    title,
    body,
    fingerprint,
    created_at_utc: new Date().toISOString(),
    metadata
  };
}

export function evaluateAlertRules(input: AlertEvaluationInput): InAppAlert[] {
  const next: InAppAlert[] = [];
  const { current, previous, userState } = input;
  const asset = current.dashboard.asset_code;

  const prevBias = previous?.dashboard.directional_bias;
  const nextBias = current.dashboard.directional_bias;
  if (prevBias && prevBias !== nextBias) {
    next.push(
      makeAlert(
        userState.profile.id,
        asset,
        'bias_changes',
        `${asset} bias changed`,
        `Directional bias moved from ${prevBias.toUpperCase()} to ${nextBias.toUpperCase()}.`,
        `${asset}::bias::${nextBias}`,
        { previous_bias: prevBias, next_bias: nextBias }
      )
    );
  }

  const contradictionScore = current.dashboard.contradiction.score;
  if (contradictionScore !== null && contradictionScore >= 58) {
    next.push(
      makeAlert(
        userState.profile.id,
        asset,
        'contradiction_spikes',
        `${asset} contradiction spike`,
        `Contradiction reached ${contradictionScore.toFixed(1)} (${current.dashboard.contradiction.state}).`,
        `${asset}::contradiction::${current.dashboard.contradiction.state}`,
        { contradiction_score: contradictionScore }
      )
    );
  }

  const highZones = current.chart.zones.filter((zone) => zone.significance_score >= 70).slice(0, 1);
  for (const zone of highZones) {
    next.push(
      makeAlert(
        userState.profile.id,
        asset,
        'key_level_interaction',
        `${asset} high-significance zone active`,
        `H4 zone ${zone.lower.toFixed(2)}-${zone.upper.toFixed(2)} significance ${zone.significance_score.toFixed(1)}.`,
        `${asset}::zone::${zone.zone_id}`,
        { zone_id: zone.zone_id, significance: zone.significance_score }
      )
    );
  }

  const macroMarker = current.chart.annotations.find((item) => item.kind === 'macro_event_marker');
  if (macroMarker && 'timestamp_utc' in macroMarker) {
    const minutesToEvent = Math.round((new Date(macroMarker.timestamp_utc).getTime() - Date.now()) / 60_000);
    if (minutesToEvent <= 90) {
      next.push(
        makeAlert(
          userState.profile.id,
          asset,
          'macro_event_incoming',
          `${asset} macro event incoming`,
          `Macro marker is approaching (${minutesToEvent}m).`,
          `${asset}::macro::${macroMarker.annotation_id}`,
          { minutes_to_event: minutesToEvent }
        )
      );
    }
  }

  const prevRegime = previous?.dashboard.contradiction.state;
  const nextRegime = current.dashboard.contradiction.state;
  if (prevRegime && prevRegime !== nextRegime) {
    next.push(
      makeAlert(
        userState.profile.id,
        asset,
        'post_event_regime_shift',
        `${asset} regime transition`,
        `Contradiction state moved from ${prevRegime} to ${nextRegime}.`,
        `${asset}::regime::${nextRegime}`,
        { previous_state: prevRegime, next_state: nextRegime }
      )
    );
  }

  return next;
}
