import type { BillingAdminSubjectSnapshot } from '@elceo/types';
import { BillingAdminQueryService } from './query-service';
export const getBillingAdminSubjectSnapshotReplay=(svc:BillingAdminQueryService,subjectKind:'user',subjectId:string):Promise<BillingAdminSubjectSnapshot>=>svc.getBillingAdminSubjectSnapshot(subjectKind,subjectId);
