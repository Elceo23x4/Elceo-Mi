import { ApplicationStateService } from '@elceo/application-state';
import type { DashboardChartWorkspaceViewModel, InAppAlert } from '@elceo/types';
import { cooldownMinutesFor, filterByPreference } from './alerts/dedupe-cooldown';
import { evaluateAlertRules } from './alerts/alert-rule-evaluator';
import { BrowserPushDispatcher, EmailDispatcher, InAppDispatcher } from './delivery/dispatchers';

const appStateService = new ApplicationStateService();

export async function evaluateAndPersistAlerts(input: {
  userId: string;
  current: DashboardChartWorkspaceViewModel;
  previous?: DashboardChartWorkspaceViewModel;
}): Promise<InAppAlert[]> {
  const userState = await appStateService.getApplicationStateByUserId(input.userId);

  const evaluated = evaluateAlertRules({
    current: input.current,
    ...(input.previous ? { previous: input.previous } : {}),
    userState
  });

  const preferred = filterByPreference(evaluated, userState.notifications);
  const deduped: InAppAlert[] = [];

  for (const alert of preferred) {
    const cooldown = cooldownMinutesFor(alert.alert_class);
    const recent = await appStateService.hasRecentAlert(alert.user_id, alert.fingerprint, cooldown);
    if (!recent) {
      deduped.push(alert);
    }
  }

  await appStateService.persistAlerts(deduped);

  const inApp = new InAppDispatcher();
  const email = new EmailDispatcher();
  const push = new BrowserPushDispatcher();

  await inApp.dispatch(deduped);
  if (userState.notifications.email) await email.dispatch(deduped);
  if (userState.notifications.browserPush) await push.dispatch(deduped);

  if (deduped.length) {
    await appStateService.appendAuditLog({
      log_id: crypto.randomUUID(),
      actor_user_id: userState.profile.id,
      scope: 'alerts',
      action: 'alerts_evaluated_and_persisted',
      details: { count: deduped.length, classes: deduped.map((a) => a.alert_class) },
      created_at_utc: new Date().toISOString()
    });
  }

  return deduped;
}
