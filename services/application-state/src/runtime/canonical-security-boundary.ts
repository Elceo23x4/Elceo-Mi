import { getSecurityAuditEventRepository, getSecurityIdempotencyRepository, getSecurityRateLimitRepository } from '../persistence/security-runtime-repository';

export class CanonicalSecurityBoundaryService {
  getRepositories() {
    return {
      idempotencyRepository: getSecurityIdempotencyRepository(),
      rateLimitRepository: getSecurityRateLimitRepository(),
      auditEventRepository: getSecurityAuditEventRepository()
    };
  }
}
