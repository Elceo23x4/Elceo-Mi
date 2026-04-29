import { AdminControlPlaneQueryService } from '../admin/index';
export class CanonicalAdminBoundaryService {
  constructor(private readonly query = new AdminControlPlaneQueryService()) {}
  getAdminSystemSummary(subjectKind:'user'|'workspace'|'ops',subjectId:string){return this.query.getAdminSystemSummary(subjectKind,subjectId);}
  getAdminFreshnessSummary(subjectKind:'user'|'workspace'|'ops',subjectId:string){return this.query.getAdminFreshnessSummary(subjectKind,subjectId);}
  getAdminOpsSummary(){return this.query.getAdminOpsSummary();}
  getAdminProviderCapabilitySummary(){return this.query.getAdminProviderCapabilitySummary();}
  getAdminAuditTimeline(limit?:number){return this.query.getAdminAuditTimeline(limit);}
}
