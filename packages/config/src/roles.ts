export type AppRole = 'user' | 'super_admin' | 'analyst_admin' | 'support_admin';

export const adminRoles: AppRole[] = ['super_admin', 'analyst_admin', 'support_admin'];

export function isAdminRole(role: AppRole): boolean {
  return adminRoles.includes(role);
}
