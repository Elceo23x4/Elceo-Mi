export type SecurityAuditReplay = { supported: false; reason: string };
export const getSecurityAuditEventReplay = (): SecurityAuditReplay => ({ supported: false, reason: 'Repository lookup not implemented in C4-M6A.' });
