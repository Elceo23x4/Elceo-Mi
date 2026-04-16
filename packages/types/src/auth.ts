import type { AppRole } from '@elceo/config';
import type { PlanTier } from '@elceo/config';

export type UserSessionIdentity = {
  userId: string;
  email: string;
  name?: string;
  role: AppRole;
  planTier: PlanTier;
};

export type AuthProviderType = 'google' | 'credentials';
