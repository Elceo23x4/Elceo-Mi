import type { CommercialProfileSocialIdentifier } from '@elceo/types';
import { getUserSocialIdentifiersSnapshot, upsertUserSocialIdentifiersSnapshot, clearUserSocialIdentifiersMemoryStore } from '@elceo/application-state';

export async function getUserSocialIdentifiers(userId: string) { return getUserSocialIdentifiersSnapshot(userId); }
export async function setUserSocialIdentifiers(userId: string, identifiers: CommercialProfileSocialIdentifier[]) { return upsertUserSocialIdentifiersSnapshot(userId, identifiers); }
export function clearUserSocialIdentifiersStore(): void { clearUserSocialIdentifiersMemoryStore(); }
