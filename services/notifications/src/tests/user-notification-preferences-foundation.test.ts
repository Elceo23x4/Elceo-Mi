import assert from 'node:assert/strict';
import { buildNotificationDeliveryDraft, buildNotificationDeliveryLog, buildNotificationOutboxItem, evaluateNotificationRateLimit, evaluateUserNotificationEventTrigger, getEmailNotificationProviderReadiness, getUserNotificationCoverageReport, getUserNotificationDefaultPreferences, getWhatsAppNotificationProviderReadiness, updateUserNotificationPreferences } from '../user-preferences/foundation.js';

export function runUserNotificationPreferencesFoundationTests(){
 const base=getUserNotificationDefaultPreferences('u1');
 assert.equal(base.globalEnabled,false); assert.equal(base.channels.length,2);
 const enabled=updateUserNotificationPreferences(base,{globalEnabled:true,channels:base.channels.map((c)=>({...c,enabled:true})),topics:base.topics.map((t)=>({...t,enabled:true}))});
 const allowed=evaluateUserNotificationEventTrigger({snapshot:enabled,event:{userId:'u1',eventId:'e1',eventKind:'macro_summary',topic:'macro_summary',channel:'email',assetId:'BTC',createdAt:new Date().toISOString()},nowLocalTime:'12:00'});
 assert.equal(allowed.allowed,true);
 const blocked=evaluateUserNotificationEventTrigger({snapshot:enabled,event:{userId:'u1',eventId:'e2',eventKind:'evidence_score_change',topic:'evidence_score_change',channel:'email',assetId:'BTC',scoreBefore:50,scoreAfter:52,createdAt:new Date().toISOString()},nowLocalTime:'12:00'});
 assert.equal(blocked.allowed,false);
 const rl=evaluateNotificationRateLimit({alreadySentTopicHour:9,alreadySentChannelDay:0,isDuplicateEvent:false,maxTopicPerHour:3}); assert.equal(rl.allowed,false);
 const draft=buildNotificationDeliveryDraft({userId:'u1',eventId:'e3',eventKind:'risk_contradiction_alert',topic:'risk_contradiction_alert',channel:'whatsapp',createdAt:new Date().toISOString()});
 assert.ok(!/buy|sell|hold|profit/i.test(draft.safeSummary));
 const outbox=buildNotificationOutboxItem(draft); const log=buildNotificationDeliveryLog(outbox,'queued_fixture_only');
 assert.equal((log as any).providerPayload,undefined);
 assert.equal(getEmailNotificationProviderReadiness().liveSendsEnabled,false); assert.equal(getWhatsAppNotificationProviderReadiness().liveSendsEnabled,false);
 const cov=getUserNotificationCoverageReport(enabled); assert.ok(Array.isArray(cov.enabledChannels));
}
