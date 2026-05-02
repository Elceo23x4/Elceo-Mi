export type SecurityAuditReplay = { supported: false; reason: string };

export const getSecurityAuditEventReplay = (): SecurityAuditReplay => ({
  supported: false,
  reason: 'Repository lookup by auditEventId is not implemented in C4-M6A2.'
});
