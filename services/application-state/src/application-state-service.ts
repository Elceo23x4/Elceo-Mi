import { assertPlanMutationAllowed, buildEntitlementState, enforceTrackedAssetLimit, resolvePlanTierFromSubscription } from './entitlement';
import { InMemoryUserStateRepository, PostgresUserStateRepository, type UserStateRepository } from './repositories/user-state-repository';
import { InMemoryAlertRepository, PostgresAlertRepository, type AlertRepository } from './repositories/alert-repository';
import { InMemoryTradeJournalRepository, PostgresTradeJournalRepository, type TradeJournalRepository } from './repositories/trade-journal-repository';
import type { ApplicationUserState, OnboardingUpdateInput, SettingsUpdateInput } from './types';
import type { AppRole, PlanTier } from '@elceo/config';
import { logEvent } from '@elceo/config';
import type {
  AuditLogEntry,
  BillingSubscriptionState,
  InAppAlert,
  TradeJournalCreateInput,
  TradeJournalEntry,
  TradeJournalListItem
} from '@elceo/types';

function runtimeEnv(): Record<string, string | undefined> {
  return (globalThis as { process?: { env?: Record<string, string | undefined> } }).process?.env ?? {};
}

let userRepository: UserStateRepository | null = null;
let alertRepository: AlertRepository | null = null;
let tradeJournalRepository: TradeJournalRepository | null = null;

function useMemory(env: Record<string, string | undefined>): boolean {
  return env.APP_STATE_REPOSITORY === 'memory';
}

export function getUserStateRepository(): UserStateRepository {
  if (!userRepository) {
    userRepository = useMemory(runtimeEnv()) ? new InMemoryUserStateRepository() : new PostgresUserStateRepository();
  }
  return userRepository;
}

export function getAlertRepository(): AlertRepository {
  if (!alertRepository) {
    alertRepository = useMemory(runtimeEnv()) ? new InMemoryAlertRepository() : new PostgresAlertRepository();
  }
  return alertRepository;
}

export function setUserStateRepository(next: UserStateRepository): void {
  userRepository = next;
}

export function setAlertRepository(next: AlertRepository): void {
  alertRepository = next;
}

export function getTradeJournalRepository(): TradeJournalRepository {
  if (!tradeJournalRepository) {
    tradeJournalRepository = useMemory(runtimeEnv()) ? new InMemoryTradeJournalRepository() : new PostgresTradeJournalRepository();
  }
  return tradeJournalRepository;
}

export function setTradeJournalRepository(next: TradeJournalRepository): void {
  tradeJournalRepository = next;
}

export class ApplicationStateService {
  constructor(
    private readonly userStateRepository: UserStateRepository = getUserStateRepository(),
    private readonly alertRepo: AlertRepository = getAlertRepository(),
    private readonly tradeJournalRepo: TradeJournalRepository = getTradeJournalRepository()
  ) {}

  async ensureUserFromIdentity(identity: { email: string; name: string; role?: AppRole }): Promise<ApplicationUserState> {
    const profile =
      (await this.userStateRepository.getUserProfileByEmail(identity.email)) ??
      (await this.userStateRepository.createUserProfile({
        email: identity.email,
        name: identity.name,
        role: identity.role ?? 'user'
      }));

    return this.getApplicationStateByUserId(profile.id);
  }

  async getApplicationStateByUserId(userId: string): Promise<ApplicationUserState> {
    const profile = await this.userStateRepository.getUserProfileById(userId);
    if (!profile) {
      throw new Error('Authenticated user has no application profile');
    }

    const subscription = await this.userStateRepository.getSubscriptionState(userId);
    const effectivePlan = resolvePlanTierFromSubscription(subscription);

    if (profile.planTier !== effectivePlan) {
      await this.userStateRepository.updatePlanTier(userId, effectivePlan);
      profile.planTier = effectivePlan;
    }

    const entitlement = buildEntitlementState(effectivePlan, subscription);

    const watchlistRaw = await this.userStateRepository.getWatchlist(userId);
    const watchlist = {
      ...watchlistRaw,
      assets: enforceTrackedAssetLimit(effectivePlan, watchlistRaw.assets)
    };

    if (watchlist.assets.length !== watchlistRaw.assets.length) {
      await this.userStateRepository.setWatchlist(userId, watchlist.assets);
    }

    const notifications = await this.userStateRepository.getNotificationSettings(userId);
    const alerts = await this.alertRepo.listInAppAlerts(userId, 20);

    return {
      profile,
      watchlist,
      notifications,
      alerts,
      entitlement,
      subscription
    };
  }

  async saveOnboardingState(userId: string, input: OnboardingUpdateInput): Promise<ApplicationUserState> {
    if (!input.termsAccepted || !input.disclaimerAccepted) {
      throw new Error('Compliance acceptance is required before onboarding completion');
    }

    const currentSubscription = await this.userStateRepository.getSubscriptionState(userId);
    assertPlanMutationAllowed(currentSubscription, input.planTier);

    const constrainedAssets = enforceTrackedAssetLimit(input.planTier, input.selectedAssets);
    await this.userStateRepository.updateOnboarding(userId, {
      ...input,
      selectedAssets: constrainedAssets
    });

    return this.getApplicationStateByUserId(userId);
  }

  async saveWatchlist(userId: string, assets: string[]): Promise<ApplicationUserState> {
    const current = await this.userStateRepository.getUserProfileById(userId);
    if (!current) throw new Error('User not found');

    const constrainedAssets = enforceTrackedAssetLimit(current.planTier, assets);
    await this.userStateRepository.setWatchlist(userId, constrainedAssets);
    logEvent('app-state.watchlist', 'info', 'watchlist saved', { userId, requestedCount: assets.length, persistedCount: constrainedAssets.length });
    return this.getApplicationStateByUserId(userId);
  }

  async saveSettings(userId: string, input: SettingsUpdateInput): Promise<ApplicationUserState> {
    await this.userStateRepository.updateSettings(userId, input);
    return this.getApplicationStateByUserId(userId);
  }

  async persistAlerts(alerts: InAppAlert[]): Promise<void> {
    if (!alerts.length) return;
    await this.alertRepo.createInAppAlerts(alerts);
  }

  async markAlertRead(userId: string, alertId: string): Promise<void> {
    await this.alertRepo.markAlertRead(userId, alertId);
  }

  async hasRecentAlert(userId: string, fingerprint: string, cooldownMinutes: number): Promise<boolean> {
    return this.alertRepo.hasRecentAlert(userId, fingerprint, cooldownMinutes);
  }

  async appendAuditLog(entry: AuditLogEntry): Promise<void> {
    await this.alertRepo.appendAuditLog(entry);
  }

  async listAuditLogs(limit = 60): Promise<AuditLogEntry[]> {
    return this.alertRepo.listAuditLogs(limit);
  }

  async createTradeJournalEntry(userId: string, input: TradeJournalCreateInput): Promise<TradeJournalEntry> {
    return this.tradeJournalRepo.createEntry(userId, input);
  }

  async listTradeJournalEntries(userId: string, limit = 60): Promise<TradeJournalListItem[]> {
    return this.tradeJournalRepo.listEntries(userId, limit);
  }

  async getTradeJournalEntries(userId: string, limit = 250): Promise<TradeJournalEntry[]> {
    return this.tradeJournalRepo.getEntries(userId, limit);
  }

  async applySubscriptionState(
    userId: string,
    subscription: Omit<BillingSubscriptionState, 'userId' | 'updatedAtUtc'>
  ): Promise<ApplicationUserState> {
    const saved = await this.userStateRepository.upsertSubscriptionState(userId, subscription);
    logEvent('app-state.subscription', 'info', 'subscription state updated', { userId, status: saved.status, planTier: saved.planTier });
    const effectivePlan: PlanTier = resolvePlanTierFromSubscription(saved);
    await this.userStateRepository.updatePlanTier(userId, effectivePlan);
    return this.getApplicationStateByUserId(userId);
  }
}
