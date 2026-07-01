import type { CommercialProfileSocialIdentifier } from '@elceo/types';
import { getDefaultUserSocialIdentifiersRepository, resetUserSocialIdentifiersRepositoryForTests } from '../persistence/user-social-identifiers-repository';
export type { UserSocialIdentifiersSnapshot, UserSocialIdentifiersRepository } from '../persistence/user-social-identifiers-repository';

export async function getUserSocialIdentifiersSnapshot(userId: string) { return getDefaultUserSocialIdentifiersRepository().get(userId); }
export async function upsertUserSocialIdentifiersSnapshot(userId: string, identifiers: CommercialProfileSocialIdentifier[]) { return getDefaultUserSocialIdentifiersRepository().upsert(userId, identifiers); }
export async function getUserSocialIdentifiersPersistenceReadiness() { return getDefaultUserSocialIdentifiersRepository().getPersistenceReadiness(); }
export function clearUserSocialIdentifiersMemoryStore(): void { const repo = getDefaultUserSocialIdentifiersRepository(); repo.clear?.(); resetUserSocialIdentifiersRepositoryForTests(); }
