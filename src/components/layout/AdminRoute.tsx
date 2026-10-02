import { type ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAdminAuth } from '@/context/AdminAuthContext';
import { FullPageSpinner } from '@/components/ui/Spinner';

export function AdminRoute({ children }: { children: ReactNode }) {
  const { isAdminAuthenticated } = useAdminAuth();
  const location = useLocation();

  if (!isAdminAuthenticated) {
    return (
      <Navigate
        to="/admin/login"
        replace
        state={{ from: { pathname: location.pathname } }}
      />
    );
  }

  return <>{children}</>;
}

export function AdminAuthLoading() {
  return <FullPageSpinner message="Loading administration panel..." />;
}
