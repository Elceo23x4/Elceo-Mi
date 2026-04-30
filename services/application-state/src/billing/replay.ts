import { strictParseJson } from './serialization'; import type { BillingEventRepository, BillingSubscriptionRepository } from '../persistence';
export class BillingReplayService{constructor(private readonly subs:BillingSubscriptionRepository,private readonly events:BillingEventRepository){}
  getLatestBillingSubscriptionReplay(subjectKind:'user',subjectId:string){return this.subs.getLatestSubscriptionForSubject(subjectKind,subjectId);} 
  async listRecentBillingEventReplays(subjectKind:'user',subjectId:string,limit?:number){const rows=await this.events.listEventsForSubject(subjectKind,subjectId,limit); return rows.map(r=>({...r,parsedEvent:strictParseJson(r.eventJson)})); }}
