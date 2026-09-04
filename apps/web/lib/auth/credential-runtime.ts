import { CredentialAuthenticationService, PostgresCredentialRepository, RedisLoginThrottle } from '@elceo/application-state';
import { createTransactionalAuthEmailDelivery } from '@elceo/notifications';

const env=(globalThis as {process?:{env?:Record<string,string|undefined>}}).process?.env??{};
export const credentialsEnabled=env.AUTH_CREDENTIALS_ENABLED==='true';
if(env.APP_ENV==='production'&&credentialsEnabled){
  if(!env.REDIS_URL)throw new Error('REDIS_URL must be configured when production credentials authentication is enabled');
  const providerReady=env.NOTIFICATION_EMAIL_PROVIDER==='resend'?Boolean(env.RESEND_API_KEY):env.NOTIFICATION_EMAIL_PROVIDER==='postmark'?Boolean(env.POSTMARK_SERVER_TOKEN):false;
  if(!providerReady||!env.NOTIFICATION_EMAIL_FROM_ADDRESS)throw new Error('Transactional email must be configured when production credentials authentication is enabled');
}
export const credentialService=credentialsEnabled&&env.REDIS_URL?new CredentialAuthenticationService(new PostgresCredentialRepository(),new RedisLoginThrottle(env.REDIS_URL)):null;
export const resetDelivery=createTransactionalAuthEmailDelivery(env);
