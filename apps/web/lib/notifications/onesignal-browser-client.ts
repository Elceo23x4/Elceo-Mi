'use client';

export type OneSignalCapabilityState = 'configuration_missing' | 'unsupported' | 'permission_default' | 'permission_denied' | 'subscribed' | 'unsubscribed' | 'ios_home_screen_required' | 'initialization_error';

type PushSubscription = { id?: string | null; optedIn?: boolean; addEventListener(type: 'change', listener: (event: { current?: { id?: string | null } }) => void): void };
type OneSignalSdk = { init(options: { appId: string; notifyButton: { enable: false }; serviceWorkerPath: string }): Promise<void>; Notifications: { permission: boolean; permissionNative?: NotificationPermission; requestPermission(): Promise<void> }; User: { PushSubscription: PushSubscription } };
declare global { interface Window { OneSignalDeferred?: Array<(sdk: OneSignalSdk) => void | Promise<void>> } }

const INITIALIZATION_TIMEOUT_MS = 10_000;
let initialization: Promise<OneSignalCapabilityState> | null = null;
let sdkInstance: OneSignalSdk | null = null;
let boundSubscriptionId: string | null = null;

const standalone = () => window.matchMedia('(display-mode: standalone)').matches || (navigator as Navigator & { standalone?: boolean }).standalone === true;
const appleMobile = () => /iPhone|iPad|iPod/i.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
const iosHomeScreenRequired = () => appleMobile() && !standalone();
const permissionState = (sdk: OneSignalSdk): OneSignalCapabilityState => sdk.Notifications.permissionNative === 'denied' ? 'permission_denied' : sdk.Notifications.permission ? (sdk.User.PushSubscription.id ? 'subscribed' : 'unsubscribed') : 'permission_default';

async function backend(operation: 'bind' | 'unbind', subscriptionId: string): Promise<void> {
  await fetch('/api/notifications/push/subscription', { method: operation === 'bind' ? 'PUT' : 'DELETE', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ subscriptionId }) });
}

async function synchronize(nextId: string | null): Promise<void> {
  if (boundSubscriptionId && boundSubscriptionId !== nextId) await backend('unbind', boundSubscriptionId);
  if (nextId && boundSubscriptionId !== nextId) await backend('bind', nextId);
  boundSubscriptionId = nextId;
}

export function initializeOneSignalBrowser(): Promise<OneSignalCapabilityState> {
  if (initialization) return initialization;
  initialization = new Promise<OneSignalCapabilityState>((resolve) => {
    const appId = process.env.NEXT_PUBLIC_ONESIGNAL_APP_ID?.trim();
    if (!appId) return resolve('configuration_missing');
    if (typeof window === 'undefined' || !('serviceWorker' in navigator) || !('Notification' in window)) return resolve('unsupported');
    if (iosHomeScreenRequired()) return resolve('ios_home_screen_required');
    let settled = false;
    const finish = (state: OneSignalCapabilityState) => { if (!settled) { settled = true; clearTimeout(timeout); resolve(state); } };
    const timeout = window.setTimeout(() => finish('initialization_error'), INITIALIZATION_TIMEOUT_MS);
    window.OneSignalDeferred = window.OneSignalDeferred ?? [];
    window.OneSignalDeferred.push(async (sdk) => {
      try {
        await sdk.init({ appId, notifyButton: { enable: false }, serviceWorkerPath: '/OneSignalSDKWorker.js' });
        sdkInstance = sdk;
        boundSubscriptionId = sdk.User.PushSubscription.id ?? null;
        sdk.User.PushSubscription.addEventListener('change', (event) => { void synchronize(event.current?.id ?? null); });
        finish(permissionState(sdk));
      } catch { finish('initialization_error'); }
    });
    const script = document.createElement('script');
    script.src = 'https://cdn.onesignal.com/sdks/web/v16/OneSignalSDK.page.js';
    script.async = true;
    script.onerror = () => finish('initialization_error');
    document.head.appendChild(script);
  });
  return initialization;
}

/** Must be called directly from an explicit click/tap handler. Initialization never prompts. */
export async function requestOneSignalPermission(): Promise<OneSignalCapabilityState> {
  const state = await initializeOneSignalBrowser();
  if (!sdkInstance || ['configuration_missing', 'unsupported', 'ios_home_screen_required', 'initialization_error'].includes(state)) return state;
  try { await sdkInstance.Notifications.requestPermission(); await synchronize(sdkInstance.User.PushSubscription.id ?? null); return permissionState(sdkInstance); }
  catch { return 'initialization_error'; }
}

/** Detaches ELCEO ownership only; it intentionally does not opt the browser out globally. */
export async function detachOneSignalOnLogout(): Promise<void> {
  if (boundSubscriptionId) await backend('unbind', boundSubscriptionId);
  boundSubscriptionId = null;
}
