import { randomUUID } from 'node:crypto';
import { getNotificationDeliveryProviderConfig } from './providers/config';
import { PostmarkEmailDeliveryTransport, ResendEmailDeliveryTransport } from './providers/production-transports';
import type { NotificationDeliveryEnvelope } from './delivery/channel-contracts';
import type { NotificationOutboxRecord } from './delivery/outbox-contracts';

export interface TransactionalAuthEmailDelivery { sendPasswordReset(input:{email:string;resetUrl:string}):Promise<boolean> }

export class MemoryTransactionalAuthEmailDelivery implements TransactionalAuthEmailDelivery {
  readonly sent:Array<{email:string;resetUrl:string}>=[];
  async sendPasswordReset(input:{email:string;resetUrl:string}){this.sent.push(input);return true;}
}

export function createTransactionalAuthEmailDelivery(env:Record<string,string|undefined>):TransactionalAuthEmailDelivery {
  const config=getNotificationDeliveryProviderConfig(env);
  const transport=config.emailProvider==='resend'&&config.resendApiKey&&config.emailFromAddress
    ? new ResendEmailDeliveryTransport(config.resendApiKey,config.emailFromAddress,config.emailFromName,config.emailReplyTo,config.requestTimeoutMs)
    : config.emailProvider==='postmark'&&config.postmarkServerToken&&config.emailFromAddress
      ? new PostmarkEmailDeliveryTransport(config.postmarkServerToken,config.emailFromAddress,config.emailFromName,config.emailReplyTo,config.postmarkMessageStream,config.requestTimeoutMs)
      : null;
  return {async sendPasswordReset(input){
    if(!transport)return false;
    const id=randomUUID();
    const envelope:NotificationDeliveryEnvelope={channel:'email',targetId:'transactional-auth',targetKind:'email_address',addressJson:JSON.stringify({email:input.email}),payload:{subject:'Reset your ELCEO password',body:`Use this link within 15 minutes to reset your password:\n\n${input.resetUrl}\n\nIf you did not request this, ignore this message.`,decisionId:id,ruleKey:'security.password_reset',asset:'XAU/USD',timeframe:'H1',createdAt:new Date().toISOString()}};
    const outbox={outboxId:id,channel:'email'} as NotificationOutboxRecord;
    return (await transport.send(outbox,envelope)).success;
  }};
}
