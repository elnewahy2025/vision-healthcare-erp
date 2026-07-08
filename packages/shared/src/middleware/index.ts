export interface RequestContext {
  tenantId: string;
  userId: string;
  roles: string[];
  permissions: string[];
  locale: 'ar' | 'en';
  branchId?: string;
  requestId: string;
}

export function hasPermission(
  context: RequestContext,
  requiredPermission: string,
): boolean {
  return context.permissions.includes(requiredPermission) || context.roles.includes('super_admin');
}

export function hasAnyPermission(
  context: RequestContext,
  requiredPermissions: string[],
): boolean {
  return requiredPermissions.some((p) => hasPermission(context, p));
}
