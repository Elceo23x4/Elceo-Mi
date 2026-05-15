import type { UserNotificationPreferenceSnapshot, UserNotificationEventTrigger, UserNotificationDeliveryDraft, UserNotificationOutboxItem, UserNotificationDeliveryLog, UserNotificationCoverageReport } from '@elceo/types';
import { isNonEmptyString, isObjectRecord, isIsoDateString, isEnumValue, type SchemaValidationResult } from './validation-utils';

const CHANNELS=['email','whatsapp'] as const; const TOPICS=['macro_summary','evidence_score_change','market_reasoning_update','risk_contradiction_alert','scheduled_digest'] as const;
const DELIVERY=['draft','queued_fixture_only','suppressed','deferred','failed','delivered'] as const;
const DIGEST=['daily','weekly','market_session'] as const;

const hasUnsafe=(v:string)=>/(api[_-]?key|secret|token|session|buy|sell|hold|profit)/i.test(v);
const validTime=(v:string)=>/^([01]\d|2[0-3]):[0-5]\d$/.test(v);

export function validateUserNotificationPreferenceSnapshot(input:unknown,path=''):SchemaValidationResult<UserNotificationPreferenceSnapshot>{
  const e:string[]=[]; if(!isObjectRecord(input)) return {ok:false,errors:[`${path}snapshot must be object`]};
  if(!isNonEmptyString(input.userId)) e.push(`${path}userId required`); if(!Array.isArray(input.channels)) e.push(`${path}channels array required`);
  if(!Array.isArray(input.topics)) e.push(`${path}topics array required`); if(!Array.isArray(input.assetPreferences)) e.push(`${path}assetPreferences array required`);
  if(!isEnumValue(input.digestFrequency,DIGEST)) e.push(`${path}digestFrequency invalid`); if(!isIsoDateString(input.updatedAt)) e.push(`${path}updatedAt invalid`);
  if(!isObjectRecord(input.quietHours)||!validTime(String(input.quietHours.startLocalTime??''))||!validTime(String(input.quietHours.endLocalTime??''))) e.push(`${path}quietHours invalid`);
  const txt=JSON.stringify(input); if(hasUnsafe(txt)) e.push(`${path}unsafe language/secret-like field`);
  return e.length?{ok:false,errors:e}:{ok:true,value:input as UserNotificationPreferenceSnapshot};
}
export const validateUserNotificationEventTrigger=(input:unknown,path=''):SchemaValidationResult<UserNotificationEventTrigger>=>{const e:string[]=[]; if(!isObjectRecord(input)) return {ok:false,errors:[`${path}event must be object`]}; if(!isNonEmptyString(input.userId)||!isNonEmptyString(input.eventId)) e.push(`${path}userId/eventId required`); if(!isEnumValue(input.channel,CHANNELS)||!isEnumValue(input.topic,TOPICS)||!isEnumValue(input.eventKind,TOPICS)) e.push(`${path}channel/topic/event invalid`); if(!isIsoDateString(input.createdAt)) e.push(`${path}createdAt invalid`); return e.length?{ok:false,errors:e}:{ok:true,value:input as UserNotificationEventTrigger};};
export const validateUserNotificationDeliveryDraft=(input:unknown,path=''):SchemaValidationResult<UserNotificationDeliveryDraft>=>{const e:string[]=[]; if(!isObjectRecord(input)) return {ok:false,errors:[`${path}draft must be object`]}; if(!isEnumValue(input.channel,CHANNELS)||!isEnumValue(input.topic,TOPICS)||!isEnumValue(input.eventKind,TOPICS)||!isEnumValue(input.deliveryStatus,DELIVERY)) e.push(`${path}enum invalid`); if(!isIsoDateString(input.createdAt)||!isNonEmptyString(input.userId)||!isNonEmptyString(input.title)||!isNonEmptyString(input.safeSummary)) e.push(`${path}required fields invalid`); if(hasUnsafe(JSON.stringify(input))) e.push(`${path}unsafe language/secret-like field`); return e.length?{ok:false,errors:e}:{ok:true,value:input as UserNotificationDeliveryDraft};};
export const validateUserNotificationOutboxItem=(input:unknown,path=''):SchemaValidationResult<UserNotificationOutboxItem>=>isObjectRecord(input)&&isNonEmptyString(input.outboxId)?{ok:true,value:input as UserNotificationOutboxItem}:{ok:false,errors:[`${path}outbox invalid`]};
export const validateUserNotificationDeliveryLog=(input:unknown,path=''):SchemaValidationResult<UserNotificationDeliveryLog>=>isObjectRecord(input)&&isNonEmptyString(input.deliveryId)&&isIsoDateString(input.attemptedAt)?{ok:true,value:input as UserNotificationDeliveryLog}:{ok:false,errors:[`${path}delivery log invalid`]};
export const validateUserNotificationCoverageReport=(input:unknown,path=''):SchemaValidationResult<UserNotificationCoverageReport>=>isObjectRecord(input)&&isNonEmptyString(input.userId)?{ok:true,value:input as UserNotificationCoverageReport}:{ok:false,errors:[`${path}coverage report invalid`]};
