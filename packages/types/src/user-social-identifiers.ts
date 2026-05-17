import type { CommercialPaymentReadinessCheck, CommercialProfileSocialIdentifier } from './commercial-entitlements';

export type UpdateUserSocialIdentifiersRequest = {
  linkedinAddress?: string;
  telegramId?: string;
  xUsername?: string;
};

export type UserSocialIdentifierSnapshot = {
  userId: string;
  socialIdentifiers: CommercialProfileSocialIdentifier[];
  paymentReadiness: CommercialPaymentReadinessCheck;
};

export type UpdateUserSocialIdentifiersResult = UserSocialIdentifierSnapshot;
