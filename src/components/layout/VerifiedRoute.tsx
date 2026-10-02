import { type ReactNode } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { FullPageSpinner } from '@/components/ui/Spinner';

export function VerifiedRoute({ children }: { children: ReactNode }) {
  const { session, profile, loading, isVerifiedInspector } = useAuth();
  if (loading) return <FullPageSpinner message="Checking inspection access..." />;
  if (!session) return <Navigate to="/login" replace />;
  if (!profile) return <FullPageSpinner message="Loading your account profile..." />;

  if (profile.access_status === 'rejected') {
    return <Navigate to="/?access=denied&reason=rejected" replace />;
  }
  if (profile.access_status === 'suspended') {
    return <Navigate to="/?access=denied&reason=suspended" replace />;
  }
  if (!isVerifiedInspector) return <Navigate to="/verification" replace />;

  return <>{children}</>;
}
