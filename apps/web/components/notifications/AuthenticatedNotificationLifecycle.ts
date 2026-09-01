'use client';

import { useEffect } from 'react';
import { initializeOneSignalBrowser } from '../../lib/notifications/onesignal-browser-client';

export type AuthenticatedNotificationInitializer = () => Promise<unknown>;

export function startAuthenticatedNotificationLifecycle(initializer: AuthenticatedNotificationInitializer = initializeOneSignalBrowser): void {
  void initializer().catch(() => undefined);
}

/** Authenticated-shell bootstrap only. Durable ownership is intentionally not detached on unmount. */
export function AuthenticatedNotificationLifecycle(): null {
  useEffect(() => {
    startAuthenticatedNotificationLifecycle();
  }, []);
  return null;
}
