import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../stores/authStore';

/**
 * Route-level permission guard.
 *
 * Usage in App.tsx:
 *   <Route path="/billing" element={
 *     <ProtectedRoute permission="billing.view">
 *       <BillingPage />
 *     </ProtectedRoute>
 *   } />
 *
 * If the user lacks the permission, they are redirected to /unauthorized.
 * If the user is not authenticated, they are redirected to /login.
 */
interface ProtectedRouteProps {
  permission: string;
  children: React.ReactNode;
  /** Custom fallback route (default: /unauthorized) */
  fallback?: string;
}

export function ProtectedRoute({ permission, children, fallback = '/unauthorized' }: ProtectedRouteProps) {
  const { can, isAuthenticated, isLoading } = useAuth();
  const location = useLocation();

  // Wait for auth to resolve before making decisions
  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (!can(permission)) {
    return <Navigate to={fallback} replace />;
  }

  return <>{children}</>;
}
