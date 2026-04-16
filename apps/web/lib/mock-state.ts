export type PlanTier = 'free' | 'premium';

export type NotificationChannelPrefs = {
  inApp: boolean;
  email: boolean;
  browserPush: boolean;
};

export type NotificationClassPrefs = {
  biasChanges: boolean;
  contradictionSpikes: boolean;
  keyLevelInteractions: boolean;
  macroEventWarnings: boolean;
  postEventRegimeShift: boolean;
  journalCoaching: boolean;
};

export type ElceoUserState = {
  termsAccepted: boolean;
  disclaimerAccepted: boolean;
  selectedAssets: string[];
  planTier: PlanTier;
  motionIntensity: 'low' | 'medium' | 'high';
  notifications: NotificationChannelPrefs;
  notificationClasses: NotificationClassPrefs;
  onboardingCompletedAt?: string;
};

export const LAUNCH_ASSET_CLUSTER = [
  'XAU/USD',
  'Nasdaq 100',
  'S&P 500',
  'DE30',
  'BTC/USD',
  'EUR/USD',
  'GBP/USD',
  'USD/JPY',
  'USD/CHF',
  'AUD/USD',
  'NZD/USD',
  'USD/CAD'
] as const;

export const TRACKED_ASSET_LIMITS: Record<PlanTier, number> = {
  free: 4,
  premium: LAUNCH_ASSET_CLUSTER.length
};

export const STORAGE_KEY = 'elceo-user-state';

export const DEFAULT_STATE: ElceoUserState = {
  termsAccepted: false,
  disclaimerAccepted: false,
  selectedAssets: ['XAU/USD', 'Nasdaq 100', 'EUR/USD'],
  planTier: 'free',
  motionIntensity: 'medium',
  notifications: {
    inApp: true,
    email: true,
    browserPush: false
  },
  notificationClasses: {
    biasChanges: true,
    contradictionSpikes: true,
    keyLevelInteractions: true,
    macroEventWarnings: true,
    postEventRegimeShift: true,
    journalCoaching: false
  }
};

export function safeParseState(raw: string | null): ElceoUserState {
  if (!raw) return DEFAULT_STATE;

  try {
    const parsed = JSON.parse(raw) as Partial<ElceoUserState>;
    return {
      ...DEFAULT_STATE,
      ...parsed,
      notifications: { ...DEFAULT_STATE.notifications, ...parsed.notifications },
      notificationClasses: { ...DEFAULT_STATE.notificationClasses, ...parsed.notificationClasses },
      selectedAssets: Array.isArray(parsed.selectedAssets) ? parsed.selectedAssets : DEFAULT_STATE.selectedAssets
    };
  } catch {
    return DEFAULT_STATE;
  }
}

export function getTrackedAssetLimit(plan: PlanTier): number {
  return TRACKED_ASSET_LIMITS[plan];
}
