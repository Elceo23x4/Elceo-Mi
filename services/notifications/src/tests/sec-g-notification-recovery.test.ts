import {
  MemoryNotificationDecisionRepository,
  MemoryNotificationInboxRepository,
  MemoryNotificationOutboxAttemptRepository,
  MemoryNotificationOutboxRepository,
  MemoryNotificationSubscriptionRepository,
  MemoryNotificationTargetRepository
} from '../persistence/memory-notification-repository.js';
import { resendIdempotencyKey, oneSignalIdempotencyKey } from '../providers/production-transports.js';
import type { NotificationOutboxRecord } from '../delivery/outbox-contracts.js';
import type { NotificationDeliveryTransport } from '../delivery/transport.js';
import { dispatchDueNotificationOutbox } from '../delivery/outbox-dispatcher.js';
import { stageNotificationDeliveryForDecision } from '../delivery/staging-service.js';
import { buildDecision, buildDecisionRecord } from './test-fixtures.js';

const assert=(v:boolean,m:string)=>{if(!v)throw new Error(m)};

function deliveryRepos() {
  return {
    decisionRepository: new MemoryNotificationDecisionRepository(),
    outboxRepository: new MemoryNotificationOutboxRepository(),
    outboxAttemptRepository: new MemoryNotificationOutboxAttemptRepository(),
    subscriptionRepository: new MemoryNotificationSubscriptionRepository(),
    targetRepository: new MemoryNotificationTargetRepository(),
    inboxRepository: new MemoryNotificationInboxRepository()
  };
}

async function stageEmail(tag: string) {
  const repos = deliveryRepos();
  const subjectId = `user-${tag}`;
  const targetId = `target-${tag}`;
  await repos.subscriptionRepository.saveSubscription({ subscriptionId:`sub-${tag}`, subjectKind:'user', subjectId, channel:'email', asset:'*', timeframe:'*', ruleKey:'*', enabled:true, minMaterialityScore:null, createdAt:'2026-01-15T10:00:00.000Z', updatedAt:'2026-01-15T10:00:00.000Z' });
  await repos.targetRepository.saveTarget({ targetId, subjectKind:'user', subjectId, channel:'email', targetKind:'email_address', status:'active', label:null, addressJson:`{"email":"${tag}@example.test"}`, createdAt:'2026-01-15T10:00:00.000Z', updatedAt:'2026-01-15T10:00:00.000Z', verifiedAt:'2026-01-15T10:00:00.000Z' });
  const decision = buildDecision({ decisionId:`decision-${tag}`, decisionKey:`decision|${tag}`, channels:['email'] });
  const record = buildDecisionRecord({ decisionId:decision.decisionId!, decisionKey:decision.decisionKey!, decisionJson:JSON.stringify(decision), channelsJson:JSON.stringify(decision.channels) });
  await stageNotificationDeliveryForDecision(record, decision, repos, '2026-01-15T10:05:00.000Z');
  const outbox = (await repos.outboxRepository.listOutboxForDecision(record.decisionId))[0];
  if (!outbox) throw new Error(`missing_sec_g_outbox:${tag}`);
  return { repos, outbox };
}

async function expectClaimLoss(operation: () => Promise<unknown>, message: string) {
  try {
    await operation();
  } catch (error) {
    assert(error instanceof Error && error.message.startsWith('notification_outbox_claim_lost:'), message);
    return;
  }
  throw new Error(message);
}

export async function runSecGNotificationRecoveryTests(){
 const repo=new MemoryNotificationOutboxRepository(),base:NotificationOutboxRecord={outboxId:'sec-g-outbox',outboxKey:'sec-g-key',decisionId:'d',decisionKey:'dk',asset:'BTC/USD',timeframe:'H1',ruleKey:'r',channel:'email',targetId:'t',subjectKind:'user',subjectId:'u',targetKey:'tk',deliveryAddressJson:'{}',status:'staged',availableAt:'2026-01-01T00:00:00.000Z',lastAttemptAt:null,deliveredAt:null,deadAt:null,attemptCount:0,lastErrorCode:null,lastErrorMessage:null,payloadJson:'{}',createdAt:'2026-01-01T00:00:00.000Z',updatedAt:'2026-01-01T00:00:00.000Z'};
 await repo.stageOutbox(base);const races=await Promise.all(Array.from({length:20},(_,i)=>repo.claimDueOutboxItems('2026-01-01T00:00:00.000Z','2026-01-01T00:00:01.000Z',1,`worker-${i}`)));assert(races.flat().length===1,'twenty claimers must yield one owner');const first=races.flat()[0]!;
 const successor=(await repo.claimDueOutboxItems('2026-01-01T00:00:02.000Z','2026-01-01T00:00:03.000Z',1,'successor'))[0]!;assert(successor.claimGeneration===2,'takeover generation advances');assert(!await repo.markClaimDelivered(first,'2026-01-01T00:00:02.000Z'),'stale delivered rejected');assert(!await repo.markClaimDead(first,'2026-01-01T00:00:02.000Z','x','x'),'stale dead rejected');assert(await repo.markClaimAmbiguous(successor,'2026-01-01T00:00:02.000Z','provider_ambiguous','manual_reconciliation'),'current owner records ambiguity');assert((await repo.listDueOutboxItems('2027-01-01T00:00:00.000Z',10)).length===0,'ambiguous Postmark work is never blindly resent');
 assert(resendIdempotencyKey(first.outboxId)===resendIdempotencyKey(successor.outboxId),'Resend identity survives reclaim');assert(oneSignalIdempotencyKey(first.outboxId)===oneSignalIdempotencyKey(successor.outboxId),'OneSignal identity survives reclaim');

 const successCase=await stageEmail('stale-success');
 let firstSuccessSends=0;
 const staleSuccessTransport:NotificationDeliveryTransport={async send(){firstSuccessSends++;const takeover=await successCase.repos.outboxRepository.claimDueOutboxItems('2026-01-15T10:06:31.000Z','2026-01-15T10:07:01.000Z',1,'successor-before-success-commit');assert(takeover.length===1&&takeover[0]?.claimGeneration===2,'successor must steal expired success claim before stale completion');return{success:true,outcome:'accepted',retryable:false,providerMessageId:'provider-success-1',errorCode:null,errorMessage:null,responseMeta:{providerKind:'memory'}};}};
 await expectClaimLoss(()=>dispatchDueNotificationOutbox('2026-01-15T10:06:00.000Z',10,successCase.repos,staleSuccessTransport),'stale successful sender must fail closed after losing claim');
 assert(firstSuccessSends===1,'stale success performs exactly one provider call');
 assert((await successCase.repos.outboxRepository.getOutboxById(successCase.outbox.outboxId))?.status==='dispatching','lost success claim cannot falsely mark delivered');
 assert((await successCase.repos.outboxAttemptRepository.listAttemptsForOutbox(successCase.outbox.outboxId)).length===1,'provider success attempt must survive stale claim rejection');
 let replaySuccessSends=0;
 const mustNotResendSuccess:NotificationDeliveryTransport={async send(){replaySuccessSends++;throw new Error('recovered_success_must_not_resend');}};
 const reconciledSuccess=await dispatchDueNotificationOutbox('2026-01-15T10:07:02.000Z',10,successCase.repos,mustNotResendSuccess);
 assert(reconciledSuccess.deliveredCount===1&&replaySuccessSends===0,'successor must reconcile durable provider success without another send');
 assert((await successCase.repos.outboxRepository.getOutboxById(successCase.outbox.outboxId))?.status==='delivered','reconciled success becomes delivered under current fence');

 const ambiguousCase=await stageEmail('stale-ambiguous');
 let firstAmbiguousSends=0;
 const staleAmbiguousTransport:NotificationDeliveryTransport={async send(){firstAmbiguousSends++;const takeover=await ambiguousCase.repos.outboxRepository.claimDueOutboxItems('2026-01-15T10:06:31.000Z','2026-01-15T10:07:01.000Z',1,'successor-before-ambiguous-commit');assert(takeover.length===1&&takeover[0]?.claimGeneration===2,'successor must steal expired ambiguous claim before stale completion');return{success:false,outcome:'provider_ambiguous',retryable:true,providerMessageId:null,errorCode:'provider_ambiguous',errorMessage:'provider result unknown',responseMeta:{providerKind:'memory'}};}};
 await expectClaimLoss(()=>dispatchDueNotificationOutbox('2026-01-15T10:06:00.000Z',10,ambiguousCase.repos,staleAmbiguousTransport),'stale ambiguous sender must fail closed after losing claim');
 assert(firstAmbiguousSends===1,'stale ambiguous attempt performs exactly one provider call');
 let replayAmbiguousSends=0;
 const mustNotResendAmbiguous:NotificationDeliveryTransport={async send(){replayAmbiguousSends++;throw new Error('recovered_ambiguous_must_not_resend');}};
 const reconciledAmbiguous=await dispatchDueNotificationOutbox('2026-01-15T10:07:02.000Z',10,ambiguousCase.repos,mustNotResendAmbiguous);
 assert(reconciledAmbiguous.ambiguousCount===1&&replayAmbiguousSends===0,'successor must reconcile durable ambiguity without another send');
 assert((await ambiguousCase.repos.outboxRepository.getOutboxById(ambiguousCase.outbox.outboxId))?.status==='ambiguous','reconciled ambiguity is terminal for automatic dispatch');
 assert((await ambiguousCase.repos.outboxAttemptRepository.listAttemptsForOutbox(ambiguousCase.outbox.outboxId)).length===1,'ambiguity reconciliation must not invent a second provider attempt');
}
