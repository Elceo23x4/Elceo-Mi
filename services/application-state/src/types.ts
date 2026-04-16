import type { AppRole, PlanTier } from '@elceo/config';
import type { EntitlementState } from '@elceo/types';

export type UserProfileRecord = {
  id: string;
  email: string;
  name: string;
  role: AppRole;
  planTier: PlanTier;
  termsAccepted: boolean;
  disclaimerAccepted: boolean;
  onboardingCompletedAt: string | null;
  motionIntensity: 'low' | 'medium' | 'high';
};

export type UserWatchlistRecord = {
  userId: string;
  assets: string[];
};

export type UserNotificationSettings = {
  inApp: boolean;
  email: boolean;
  browserPush: boolean;
  biasChanges: boolean;
  contradictionSpikes: boolean;
  keyLevelInteractions: boolean;
  macroEventWarnings: boolean;
  postEventRegimeShift: boolean;
  journalCoaching: boolean;
};

export type ApplicationUserState = {
  profile: UserProfileRecord;
  watchlist: UserWatchlistRecord;
  entitlement: EntitlementState;
  notifications: UserNotificationSettings;
};

export type OnboardingUpdateInput = {
  termsAccepted: boolean;
  disclaimerAccepted: boolean;
  planTier: PlanTier;
  selectedAssets: string[];
};

export type SettingsUpdateInput = {
  motionIntensity: 'low' | 'medium' | 'high';
  notifications: Pick<UserNotificationSettings, 'inApp' | 'email' | 'browserPush'>;
  notificationClasses: Pick<
    UserNotificationSettings,
    'biasChanges' | 'contradictionSpikes' | 'keyLevelInteractions' | 'macroEventWarnings' | 'postEventRegimeShift' | 'journalCoaching'
  >;
};
