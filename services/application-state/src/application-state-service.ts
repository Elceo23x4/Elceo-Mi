import { buildEntitlementState, enforceTrackedAssetLimit } from './entitlement';
import { InMemoryUserStateRepository, PostgresUserStateRepository, type UserStateRepository } from './repositories/user-state-repository';
import type { ApplicationUserState, OnboardingUpdateInput, SettingsUpdateInput } from './types';
import type { AppRole } from '@elceo/config';

function runtimeEnv(): Record<string, string | undefined> {
  return (globalThis as { process?: { env?: Record<string, string | undefined> } }).process?.env ?? {};
}

let repository: UserStateRepository | null = null;

function chooseRepository(env: Record<string, string | undefined>): UserStateRepository {
  const useMemory = env.APP_STATE_REPOSITORY === 'memory';
  return useMemory ? new InMemoryUserStateRepository() : new PostgresUserStateRepository();
}

export function getUserStateRepository(): UserStateRepository {
  if (!repository) {
    repository = chooseRepository(runtimeEnv());
  }
  return repository;
}

export function setUserStateRepository(next: UserStateRepository): void {
  repository = next;
}

export class ApplicationStateService {
  constructor(private readonly userStateRepository: UserStateRepository = getUserStateRepository()) {}

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

    const watchlistRaw = await this.userStateRepository.getWatchlist(userId);
    const watchlist = {
      ...watchlistRaw,
      assets: enforceTrackedAssetLimit(profile.planTier, watchlistRaw.assets)
    };

    if (watchlist.assets.length !== watchlistRaw.assets.length) {
      await this.userStateRepository.setWatchlist(userId, watchlist.assets);
    }

    const notifications = await this.userStateRepository.getNotificationSettings(userId);

    return {
      profile,
      watchlist,
      notifications,
      entitlement: buildEntitlementState(profile.planTier)
    };
  }

  async saveOnboardingState(userId: string, input: OnboardingUpdateInput): Promise<ApplicationUserState> {
    if (!input.termsAccepted || !input.disclaimerAccepted) {
      throw new Error('Compliance acceptance is required before onboarding completion');
    }

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
    return this.getApplicationStateByUserId(userId);
  }

  async saveSettings(userId: string, input: SettingsUpdateInput): Promise<ApplicationUserState> {
    await this.userStateRepository.updateSettings(userId, input);
    return this.getApplicationStateByUserId(userId);
  }
}
