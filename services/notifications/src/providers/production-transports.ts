import { createHash } from 'node:crypto';
import type { NotificationDeliveryEnvelope } from '../delivery/channel-contracts';
import type { NotificationOutboxRecord } from '../delivery/outbox-contracts';
import type { ChannelDeliveryTransport, NotificationTransportResult } from '../delivery/transport';
import { safeNotificationChecksum } from '../management/redaction';

type Fetch = typeof fetch;
const RESEND_URL = 'https://api.resend.com/emails';
const POSTMARK_URL = 'https://api.postmarkapp.com/email';
const ONESIGNAL_URL = 'https://api.onesignal.com/notifications';
const hash = (value: string) => createHash('sha256').update(value).digest('hex');
export const resendIdempotencyKey = (outboxId: string) => `elceo-resend-${hash(outboxId)}`;
export const oneSignalIdempotencyKey = (outboxId: string): string => {
  const bytes = Buffer.from(hash(`d59ea480-f3cc-4e80-9a23-elceo:${outboxId}`).slice(0, 32), 'hex');
  bytes[6] = (bytes[6]! & 0x0f) | 0x50; bytes[8] = (bytes[8]! & 0x3f) | 0x80;
  const h = bytes.toString('hex'); return `${h.slice(0,8)}-${h.slice(8,12)}-${h.slice(12,16)}-${h.slice(16,20)}-${h.slice(20)}`;
};

const address = (envelope: NotificationDeliveryEnvelope, field: 'email' | 'subscriptionId'): string | null => {
  try { const v = JSON.parse(envelope.addressJson) as Record<string,string>; return v[field]?.trim() || v.value?.trim() || null; } catch { return null; }
};
const fail = (providerKind: string, status: number, checksum: string): NotificationTransportResult => {
  const meta = { providerKind, httpStatus: status, responseChecksum: checksum };
  if (status === 401 || status === 403) return { success:false,outcome:'permanent_failure',retryable:false,providerMessageId:null,errorCode:'provider_auth_failed',errorMessage:'provider_auth_failed',responseMeta:meta };
  if (status === 429) return { success:false,outcome:'rate_limited',retryable:true,providerMessageId:null,errorCode:'rate_limited',errorMessage:'rate_limited',responseMeta:meta };
  if (status >= 500) return { success:false,outcome:'provider_unavailable',retryable:true,providerMessageId:null,errorCode:'provider_network_error',errorMessage:'provider_unavailable',responseMeta:meta };
  return { success:false,outcome:'permanent_failure',retryable:false,providerMessageId:null,errorCode:'provider_rejected',errorMessage:'provider_rejected',responseMeta:meta };
};
abstract class JsonTransport implements ChannelDeliveryTransport {
  constructor(protected readonly providerKind: string, protected readonly timeoutMs: number, protected readonly fetcher: Fetch = fetch) {}
  protected async request(url:string, init:RequestInit): Promise<Response> { const signal=AbortSignal.timeout(this.timeoutMs); return this.fetcher(url,{...init,signal}); }
  abstract send(o:NotificationOutboxRecord,e:NotificationDeliveryEnvelope):Promise<NotificationTransportResult>;
}
export class ResendEmailDeliveryTransport extends JsonTransport {
  constructor(private key:string,private from:string,private name:string|null,private replyTo:string|null,timeout=10_000,fetcher:Fetch=fetch){super('resend',timeout,fetcher)}
  async send(o:NotificationOutboxRecord,e:NotificationDeliveryEnvelope):Promise<NotificationTransportResult>{
    const to=address(e,'email'); if(!to)return fail(this.providerKind,400,hash('missing email'));
    try { const r=await this.request(RESEND_URL,{method:'POST',headers:{'content-type':'application/json',authorization:`Bearer ${this.key}`,'Idempotency-Key':resendIdempotencyKey(o.outboxId)},body:JSON.stringify({from:this.name?`${this.name} <${this.from}>`:this.from,to:[to],reply_to:this.replyTo??undefined,subject:'subject'in e.payload?e.payload.subject:'ELCEO Notification',text:e.payload.body})}); const t=await r.text(); const c=safeNotificationChecksum(t); if(!r.ok)return fail(this.providerKind,r.status,c); let id:string|undefined;try{id=(JSON.parse(t) as {id?:string}).id}catch { /* malformed provider JSON is mapped below */ } return id?{success:true,outcome:'accepted',retryable:false,providerMessageId:id,errorCode:null,errorMessage:null,responseMeta:{providerKind:this.providerKind,httpStatus:r.status,idempotencyKeyChecksum:hash(resendIdempotencyKey(o.outboxId))}}:fail(this.providerKind,409,c);
    } catch(error){const timeout=error instanceof Error&&(error.name==='TimeoutError'||error.name==='AbortError');return{success:false,outcome:timeout?'provider_timeout':'provider_unavailable',retryable:true,providerMessageId:null,errorCode:timeout?'provider_timeout':'provider_network_error',errorMessage:timeout?'provider_timeout':'provider_network_error',responseMeta:{providerKind:this.providerKind}}}
  }
}
export class PostmarkEmailDeliveryTransport extends JsonTransport {
  constructor(private token:string,private from:string,private name:string|null,private replyTo:string|null,private stream='outbound',timeout=10_000,fetcher:Fetch=fetch){super('postmark',timeout,fetcher)}
  async send(_o:NotificationOutboxRecord,e:NotificationDeliveryEnvelope):Promise<NotificationTransportResult>{const to=address(e,'email');if(!to)return fail(this.providerKind,400,hash('missing email'));try{const r=await this.request(POSTMARK_URL,{method:'POST',headers:{'content-type':'application/json','X-Postmark-Server-Token':this.token},body:JSON.stringify({From:this.name?`${this.name} <${this.from}>`:this.from,To:to,ReplyTo:this.replyTo??undefined,Subject:'subject'in e.payload?e.payload.subject:'ELCEO Notification',TextBody:e.payload.body,MessageStream:this.stream})});const t=await r.text();if(!r.ok)return fail(this.providerKind,r.status,safeNotificationChecksum(t));let id:string|undefined;try{id=(JSON.parse(t)as{MessageID?:string}).MessageID}catch { /* malformed provider JSON is mapped below */ }return id?{success:true,outcome:'accepted',retryable:false,providerMessageId:id,errorCode:null,errorMessage:null,responseMeta:{providerKind:this.providerKind,httpStatus:r.status}}:fail(this.providerKind,400,safeNotificationChecksum(t))}catch{return{success:false,outcome:'provider_ambiguous',retryable:false,providerMessageId:null,errorCode:'provider_ambiguous',errorMessage:'provider_ambiguous_manual_reconciliation',responseMeta:{providerKind:this.providerKind}}}}
}
export class OneSignalWebPushDeliveryTransport extends JsonTransport {
  constructor(private appId:string,private apiKey:string,timeout=10_000,fetcher:Fetch=fetch){super('onesignal_web_push',timeout,fetcher)}
  async send(o:NotificationOutboxRecord,e:NotificationDeliveryEnvelope):Promise<NotificationTransportResult>{const id=address(e,'subscriptionId');if(!id)return fail(this.providerKind,400,hash('missing subscription'));try{const r=await this.request(ONESIGNAL_URL,{method:'POST',headers:{'content-type':'application/json',authorization:`Key ${this.apiKey}`},body:JSON.stringify({app_id:this.appId,target_channel:'push',include_subscription_ids:[id],headings:{en:'title'in e.payload?e.payload.title:'ELCEO'},contents:{en:e.payload.body},idempotency_key:oneSignalIdempotencyKey(o.outboxId)})});const t=await r.text();if(!r.ok)return fail(this.providerKind,r.status,safeNotificationChecksum(t));let messageId:string|undefined;try{messageId=(JSON.parse(t)as{id?:string}).id}catch { /* malformed provider JSON is mapped below */ }return messageId?{success:true,outcome:'accepted',retryable:false,providerMessageId:messageId,errorCode:null,errorMessage:null,responseMeta:{providerKind:this.providerKind,httpStatus:r.status,idempotencyKeyChecksum:hash(oneSignalIdempotencyKey(o.outboxId))}}:fail(this.providerKind,400,safeNotificationChecksum(t))}catch(error){const timeout=error instanceof Error&&(error.name==='TimeoutError'||error.name==='AbortError');return{success:false,outcome:timeout?'provider_timeout':'provider_unavailable',retryable:true,providerMessageId:null,errorCode:timeout?'provider_timeout':'provider_network_error',errorMessage:timeout?'provider_timeout':'provider_network_error',responseMeta:{providerKind:this.providerKind}}}}
}
