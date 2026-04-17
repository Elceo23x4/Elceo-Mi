import type { InAppAlert } from '@elceo/types';

export interface AlertDeliveryDispatcher {
  dispatch(alerts: InAppAlert[]): Promise<void>;
}

export class InAppDispatcher implements AlertDeliveryDispatcher {
  async dispatch(_alerts: InAppAlert[]): Promise<void> {
    // persisted in app-state repository, no-op here
  }
}

export class EmailDispatcher implements AlertDeliveryDispatcher {
  async dispatch(alerts: InAppAlert[]): Promise<void> {
    for (const alert of alerts) {
      console.info('[alerts.email.scaffold]', { alertId: alert.alert_id, class: alert.alert_class, userId: alert.user_id });
    }
  }
}

export class BrowserPushDispatcher implements AlertDeliveryDispatcher {
  async dispatch(alerts: InAppAlert[]): Promise<void> {
    for (const alert of alerts) {
      console.info('[alerts.push.scaffold]', { alertId: alert.alert_id, class: alert.alert_class, userId: alert.user_id });
    }
  }
}
