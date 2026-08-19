import { useAuth } from '../stores/authStore';

/**
 * Conditional render based on a single permission.
 *
 * Usage:
 *   <Can permission="patients.view">
 *     <PatientList />
 *   </Can>
 *
 *   <Can permission="billing.export" fallback={<span>Upgrade required</span>}>
 *     <ExportButton />
 *   </Can>
 */
interface CanProps {
  permission: string;
  fallback?: React.ReactNode;
  children: React.ReactNode;
}

export function Can({ permission, fallback = null, children }: CanProps) {
  const { can } = useAuth();
  return can(permission) ? <>{children}</> : <>{fallback}</>;
}

/**
 * Conditional render based on any of multiple permissions.
 *
 * Usage:
 *   <CanAny permissions={['billing.view', 'billing.export']}>
 *     <BillingSection />
 *   </CanAny>
 */
interface CanAnyProps {
  permissions: string[];
  fallback?: React.ReactNode;
  children: React.ReactNode;
}

export function CanAny({ permissions, fallback = null, children }: CanAnyProps) {
  const { canAny } = useAuth();
  return canAny(permissions) ? <>{children}</> : <>{fallback}</>;
}
