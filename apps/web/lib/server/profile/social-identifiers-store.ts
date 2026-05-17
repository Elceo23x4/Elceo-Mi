import 'server-only';

import type { CommercialProfileSocialIdentifier } from '@elceo/types';

const store = new Map<string, CommercialProfileSocialIdentifier[]>();

export function getUserSocialIdentifiers(userId: string): CommercialProfileSocialIdentifier[] {
  return [...(store.get(userId) ?? [])];
}

export function setUserSocialIdentifiers(userId: string, identifiers: CommercialProfileSocialIdentifier[]): CommercialProfileSocialIdentifier[] {
  const next = identifiers.map((identifier) => ({ ...identifier }));
  store.set(userId, next);
  return [...next];
}

export function clearUserSocialIdentifiersStore(): void {
  store.clear();
}
