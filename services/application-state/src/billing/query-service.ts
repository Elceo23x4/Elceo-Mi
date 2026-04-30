import { mapSubscriptionToCommercialState } from './state-mapper';
import type { BillingEventRepository, BillingSubscriptionRepository } from '../persistence';
export class BillingQueryService { constructor(private readonly subs:BillingSubscriptionRepository,private readonly events:BillingEventRepository){}
  getLatestBillingSubscription(subjectKind:'user',subjectId:string){return this.subs.getLatestSubscriptionForSubject(subjectKind,subjectId);} 
  async getBillingCommercialState(subjectKind:'user',subjectId:string,asOfIso=new Date().toISOString()){const s=await this.subs.getLatestSubscriptionForSubject(subjectKind,subjectId); return mapSubscriptionToCommercialState(subjectId,s,asOfIso);} 
  listBillingEventsForSubject(subjectKind:'user',subjectId:string,limit?:number){return this.events.listEventsForSubject(subjectKind,subjectId,limit);} 
  listBillingEventsForSubscription(subscriptionId:string,limit?:number){return this.events.listEventsForSubscription(subscriptionId,limit);} }
