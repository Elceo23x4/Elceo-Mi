import type { PlanTier } from '@elceo/config';
import type { OnboardingUpdateInput, SettingsUpdateInput, UserNotificationSettings, UserProfileRecord, UserWatchlistRecord } from '../types';
import { queryDb } from '../db/client';

export interface UserStateRepository {
  getUserProfileById(userId: string): Promise<UserProfileRecord | null>;
  getUserProfileByEmail(email: string): Promise<UserProfileRecord | null>;
  createUserProfile(input: { email: string; name: string; role?: UserProfileRecord['role']; planTier?: PlanTier; passwordHash?: string | null }): Promise<UserProfileRecord>;
  verifyPasswordCredentials(email: string, password: string): Promise<UserProfileRecord | null>;
  updateOnboarding(userId: string, input: OnboardingUpdateInput): Promise<UserProfileRecord>;
  getWatchlist(userId: string): Promise<UserWatchlistRecord>;
  setWatchlist(userId: string, assets: string[]): Promise<UserWatchlistRecord>;
  getNotificationSettings(userId: string): Promise<UserNotificationSettings>;
  updateSettings(userId: string, input: SettingsUpdateInput): Promise<UserNotificationSettings>;
}

type ProfileRow = {
  id: string;
  email: string;
  name: string;
  role: UserProfileRecord['role'];
  plan_tier: PlanTier;
  terms_accepted: boolean;
  disclaimer_accepted: boolean;
  onboarding_completed_at: string | null;
  motion_intensity: UserProfileRecord['motionIntensity'];
};

type NotificationRow = {
  in_app: boolean;
  email: boolean;
  browser_push: boolean;
  bias_changes: boolean;
  contradiction_spikes: boolean;
  key_level_interactions: boolean;
  macro_event_warnings: boolean;
  post_event_regime_shift: boolean;
  journal_coaching: boolean;
};

function mapProfile(row: ProfileRow): UserProfileRecord {
  return {
    id: row.id,
    email: row.email,
    name: row.name,
    role: row.role,
    planTier: row.plan_tier,
    termsAccepted: row.terms_accepted,
    disclaimerAccepted: row.disclaimer_accepted,
    onboardingCompletedAt: row.onboarding_completed_at,
    motionIntensity: row.motion_intensity
  };
}

function mapNotifications(row: NotificationRow): UserNotificationSettings {
  return {
    inApp: row.in_app,
    email: row.email,
    browserPush: row.browser_push,
    biasChanges: row.bias_changes,
    contradictionSpikes: row.contradiction_spikes,
    keyLevelInteractions: row.key_level_interactions,
    macroEventWarnings: row.macro_event_warnings,
    postEventRegimeShift: row.post_event_regime_shift,
    journalCoaching: row.journal_coaching
  };
}

export class PostgresUserStateRepository implements UserStateRepository {
  async getUserProfileById(userId: string): Promise<UserProfileRecord | null> {
    const rows = await queryDb<ProfileRow>(
      `SELECT id, email, name, role, plan_tier, terms_accepted, disclaimer_accepted, onboarding_completed_at, motion_intensity
       FROM app_user_profiles
       WHERE id = $1`,
      [userId]
    );

    return rows[0] ? mapProfile(rows[0]) : null;
  }

  async getUserProfileByEmail(email: string): Promise<UserProfileRecord | null> {
    const rows = await queryDb<ProfileRow>(
      `SELECT id, email, name, role, plan_tier, terms_accepted, disclaimer_accepted, onboarding_completed_at, motion_intensity
       FROM app_user_profiles
       WHERE lower(email) = lower($1)`,
      [email]
    );

    return rows[0] ? mapProfile(rows[0]) : null;
  }

  async createUserProfile(input: { email: string; name: string; role?: UserProfileRecord['role']; planTier?: PlanTier; passwordHash?: string | null }): Promise<UserProfileRecord> {
    const profileRows = await queryDb<ProfileRow>(
      `INSERT INTO app_user_profiles (email, name, role, plan_tier)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (email)
       DO UPDATE SET name = EXCLUDED.name
       RETURNING id, email, name, role, plan_tier, terms_accepted, disclaimer_accepted, onboarding_completed_at, motion_intensity`,
      [input.email, input.name, input.role ?? 'user', input.planTier ?? 'free']
    );

    const created = profileRows[0];
    if (!created) {
      throw new Error('Failed to create or load user profile');
    }
    const profile = mapProfile(created);

    await queryDb(
      `INSERT INTO app_watchlists (user_id, assets)
       VALUES ($1, $2)
       ON CONFLICT (user_id) DO NOTHING`,
      [profile.id, JSON.stringify(['XAU/USD', 'Nasdaq 100', 'EUR/USD'])]
    );

    await queryDb(
      `INSERT INTO app_notification_settings (
        user_id, in_app, email, browser_push, bias_changes, contradiction_spikes,
        key_level_interactions, macro_event_warnings, post_event_regime_shift, journal_coaching
      ) VALUES ($1, true, true, false, true, true, true, true, true, false)
      ON CONFLICT (user_id) DO NOTHING`,
      [profile.id]
    );

    if (input.passwordHash) {
      await queryDb(
        `INSERT INTO app_auth_credentials (user_id, password_hash)
         VALUES ($1, $2)
         ON CONFLICT (user_id) DO UPDATE SET password_hash = EXCLUDED.password_hash`,
        [profile.id, input.passwordHash]
      );
    }

    return profile;
  }

  async verifyPasswordCredentials(email: string, password: string): Promise<UserProfileRecord | null> {
    const rows = await queryDb<ProfileRow & { password_hash: string | null }>(
      `SELECT p.id, p.email, p.name, p.role, p.plan_tier, p.terms_accepted, p.disclaimer_accepted, p.onboarding_completed_at, p.motion_intensity,
              c.password_hash
       FROM app_user_profiles p
       LEFT JOIN app_auth_credentials c ON c.user_id = p.id
       WHERE lower(p.email) = lower($1)`,
      [email]
    );

    const row = rows[0];
    if (!row?.password_hash) return null;
    if (row.password_hash !== password) return null;

    return mapProfile(row);
  }

  async updateOnboarding(userId: string, input: OnboardingUpdateInput): Promise<UserProfileRecord> {
    const rows = await queryDb<ProfileRow>(
      `UPDATE app_user_profiles
       SET terms_accepted = $2,
           disclaimer_accepted = $3,
           plan_tier = $4,
           onboarding_completed_at = now()
       WHERE id = $1
       RETURNING id, email, name, role, plan_tier, terms_accepted, disclaimer_accepted, onboarding_completed_at, motion_intensity`,
      [userId, input.termsAccepted, input.disclaimerAccepted, input.planTier]
    );

    const profile = rows[0] ? mapProfile(rows[0]) : null;
    if (!profile) throw new Error('User not found during onboarding update');

    await this.setWatchlist(userId, input.selectedAssets);
    return profile;
  }

  async getWatchlist(userId: string): Promise<UserWatchlistRecord> {
    const rows = await queryDb<{ assets: string }>(
      `SELECT assets::text AS assets
       FROM app_watchlists
       WHERE user_id = $1`,
      [userId]
    );

    if (!rows[0]) {
      return { userId, assets: [] };
    }

    const parsed = JSON.parse(rows[0].assets) as string[];
    return { userId, assets: parsed };
  }

  async setWatchlist(userId: string, assets: string[]): Promise<UserWatchlistRecord> {
    await queryDb(
      `INSERT INTO app_watchlists (user_id, assets)
       VALUES ($1, $2)
       ON CONFLICT (user_id)
       DO UPDATE SET assets = EXCLUDED.assets, updated_at = now()`,
      [userId, JSON.stringify(assets)]
    );

    return { userId, assets };
  }

  async getNotificationSettings(userId: string): Promise<UserNotificationSettings> {
    const rows = await queryDb<NotificationRow>(
      `SELECT in_app, email, browser_push, bias_changes, contradiction_spikes,
              key_level_interactions, macro_event_warnings, post_event_regime_shift, journal_coaching
       FROM app_notification_settings
       WHERE user_id = $1`,
      [userId]
    );

    return rows[0]
      ? mapNotifications(rows[0])
      : {
          inApp: true,
          email: true,
          browserPush: false,
          biasChanges: true,
          contradictionSpikes: true,
          keyLevelInteractions: true,
          macroEventWarnings: true,
          postEventRegimeShift: true,
          journalCoaching: false
        };
  }

  async updateSettings(userId: string, input: SettingsUpdateInput): Promise<UserNotificationSettings> {
    await queryDb(
      `UPDATE app_user_profiles
       SET motion_intensity = $2
       WHERE id = $1`,
      [userId, input.motionIntensity]
    );

    await queryDb(
      `INSERT INTO app_notification_settings (
        user_id, in_app, email, browser_push, bias_changes, contradiction_spikes,
        key_level_interactions, macro_event_warnings, post_event_regime_shift, journal_coaching
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      ON CONFLICT (user_id)
      DO UPDATE SET
        in_app = EXCLUDED.in_app,
        email = EXCLUDED.email,
        browser_push = EXCLUDED.browser_push,
        bias_changes = EXCLUDED.bias_changes,
        contradiction_spikes = EXCLUDED.contradiction_spikes,
        key_level_interactions = EXCLUDED.key_level_interactions,
        macro_event_warnings = EXCLUDED.macro_event_warnings,
        post_event_regime_shift = EXCLUDED.post_event_regime_shift,
        journal_coaching = EXCLUDED.journal_coaching,
        updated_at = now()`,
      [
        userId,
        input.notifications.inApp,
        input.notifications.email,
        input.notifications.browserPush,
        input.notificationClasses.biasChanges,
        input.notificationClasses.contradictionSpikes,
        input.notificationClasses.keyLevelInteractions,
        input.notificationClasses.macroEventWarnings,
        input.notificationClasses.postEventRegimeShift,
        input.notificationClasses.journalCoaching
      ]
    );

    return this.getNotificationSettings(userId);
  }
}

const memoryProfiles = new Map<string, UserProfileRecord>();
const memoryEmailToId = new Map<string, string>();
const memoryWatchlists = new Map<string, UserWatchlistRecord>();
const memoryNotifications = new Map<string, UserNotificationSettings>();

export class InMemoryUserStateRepository implements UserStateRepository {
  async getUserProfileById(userId: string): Promise<UserProfileRecord | null> {
    return memoryProfiles.get(userId) ?? null;
  }

  async getUserProfileByEmail(email: string): Promise<UserProfileRecord | null> {
    const id = memoryEmailToId.get(email.toLowerCase());
    return id ? memoryProfiles.get(id) ?? null : null;
  }

  async createUserProfile(input: { email: string; name: string; role?: UserProfileRecord['role']; planTier?: PlanTier; passwordHash?: string | null }): Promise<UserProfileRecord> {
    const existing = await this.getUserProfileByEmail(input.email);
    if (existing) return existing;

    const id = crypto.randomUUID();
    const profile: UserProfileRecord = {
      id,
      email: input.email,
      name: input.name,
      role: input.role ?? 'user',
      planTier: input.planTier ?? 'free',
      termsAccepted: false,
      disclaimerAccepted: false,
      onboardingCompletedAt: null,
      motionIntensity: 'medium'
    };
    memoryProfiles.set(id, profile);
    memoryEmailToId.set(input.email.toLowerCase(), id);
    memoryWatchlists.set(id, { userId: id, assets: ['XAU/USD', 'Nasdaq 100', 'EUR/USD'] });
    memoryNotifications.set(id, {
      inApp: true,
      email: true,
      browserPush: false,
      biasChanges: true,
      contradictionSpikes: true,
      keyLevelInteractions: true,
      macroEventWarnings: true,
      postEventRegimeShift: true,
      journalCoaching: false
    });
    return profile;
  }

  async verifyPasswordCredentials(email: string, password: string): Promise<UserProfileRecord | null> {
    const profile = await this.getUserProfileByEmail(email);
    if (!profile) return null;
    return password.length > 0 ? profile : null;
  }

  async updateOnboarding(userId: string, input: OnboardingUpdateInput): Promise<UserProfileRecord> {
    const profile = memoryProfiles.get(userId);
    if (!profile) throw new Error('User not found');
    const updated: UserProfileRecord = {
      ...profile,
      termsAccepted: input.termsAccepted,
      disclaimerAccepted: input.disclaimerAccepted,
      planTier: input.planTier,
      onboardingCompletedAt: new Date().toISOString()
    };
    memoryProfiles.set(userId, updated);
    memoryWatchlists.set(userId, { userId, assets: input.selectedAssets });
    return updated;
  }

  async getWatchlist(userId: string): Promise<UserWatchlistRecord> {
    return memoryWatchlists.get(userId) ?? { userId, assets: [] };
  }

  async setWatchlist(userId: string, assets: string[]): Promise<UserWatchlistRecord> {
    const next = { userId, assets };
    memoryWatchlists.set(userId, next);
    return next;
  }

  async getNotificationSettings(userId: string): Promise<UserNotificationSettings> {
    return (
      memoryNotifications.get(userId) ?? {
        inApp: true,
        email: true,
        browserPush: false,
        biasChanges: true,
        contradictionSpikes: true,
        keyLevelInteractions: true,
        macroEventWarnings: true,
        postEventRegimeShift: true,
        journalCoaching: false
      }
    );
  }

  async updateSettings(userId: string, input: SettingsUpdateInput): Promise<UserNotificationSettings> {
    const profile = memoryProfiles.get(userId);
    if (profile) {
      memoryProfiles.set(userId, { ...profile, motionIntensity: input.motionIntensity });
    }

    const notifications: UserNotificationSettings = {
      inApp: input.notifications.inApp,
      email: input.notifications.email,
      browserPush: input.notifications.browserPush,
      biasChanges: input.notificationClasses.biasChanges,
      contradictionSpikes: input.notificationClasses.contradictionSpikes,
      keyLevelInteractions: input.notificationClasses.keyLevelInteractions,
      macroEventWarnings: input.notificationClasses.macroEventWarnings,
      postEventRegimeShift: input.notificationClasses.postEventRegimeShift,
      journalCoaching: input.notificationClasses.journalCoaching
    };
    memoryNotifications.set(userId, notifications);
    return notifications;
  }
}
