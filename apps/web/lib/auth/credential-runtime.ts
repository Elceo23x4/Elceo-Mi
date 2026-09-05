import { CredentialAuthenticationService, PostgresCredentialRepository, RedisLoginThrottle, RedisPasswordResetThrottle } from '@elceo/application-state';
import { createTransactionalAuthEmailDelivery } from '@elceo/notifications';
import { resolveCredentialsActivation } from './credentials-activation';

const env = (globalThis as { process?: { env?: Record<string, string | undefined> } }).process?.env ?? {};
export const credentialsActivation = resolveCredentialsActivation(env);
export const credentialsEnabled = credentialsActivation.enabled;
export const credentialService = credentialsEnabled && env.REDIS_URL
  ? new CredentialAuthenticationService(new PostgresCredentialRepository(), new RedisLoginThrottle(env.REDIS_URL), new RedisPasswordResetThrottle(env.REDIS_URL))
  : null;
export const resetDelivery = createTransactionalAuthEmailDelivery(env);
