import type {
  OpsJobLeaseRepository,
  OpsJobRunRepository,
  SnapshotFreshnessRepository,
  SnapshotRefreshRunRepository
} from '../persistence/contracts';
import { getOpsJobLeaseRepository, getOpsJobRunRepository } from '../persistence/ops-runtime-repository';
import { getSnapshotFreshnessRepository, getSnapshotRefreshRunRepository } from '../persistence/refresh-repository';
import { getAdminAuditTimeline } from './audit-timeline';
import { getAdminFreshnessSummary } from './freshness-summary';
import { getAdminOpsSummary } from './ops-summary';
import { getAdminProviderCapabilitySummary } from './provider-summary';
import { getAdminSystemSummary } from './system-summary';

export class AdminControlPlaneQueryService {
  constructor(
    private readonly refreshRunRepository: SnapshotRefreshRunRepository = getSnapshotRefreshRunRepository(),
    private readonly freshnessRepository: SnapshotFreshnessRepository = getSnapshotFreshnessRepository(),
    private readonly opsRunRepository: OpsJobRunRepository = getOpsJobRunRepository(),
    private readonly opsLeaseRepository: OpsJobLeaseRepository = getOpsJobLeaseRepository()
  ) {}

  getAdminSystemSummary(subjectKind: 'user' | 'workspace' | 'ops', subjectId: string) {
    return getAdminSystemSummary(
      this.refreshRunRepository,
      this.freshnessRepository,
      this.opsRunRepository,
      this.opsLeaseRepository,
      subjectKind,
      subjectId
    );
  }
  getAdminFreshnessSummary(subjectKind: 'user' | 'workspace' | 'ops', subjectId: string) {
    return getAdminFreshnessSummary(this.freshnessRepository, subjectKind, subjectId);
  }
  getAdminOpsSummary() {
    return getAdminOpsSummary(this.opsRunRepository, this.opsLeaseRepository);
  }
  getAdminProviderCapabilitySummary() {
    return Promise.resolve(getAdminProviderCapabilitySummary());
  }
  getAdminAuditTimeline(limit?: number) {
    return getAdminAuditTimeline(this.refreshRunRepository, this.opsRunRepository, limit);
  }
}
