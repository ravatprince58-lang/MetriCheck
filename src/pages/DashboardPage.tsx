import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';
import { AppLayout } from '@/components/layout/AppLayout';
import { Card, CardBody, CardHeader, CardTitle } from '@/components/ui/Card';
import { Badge, EmptyState } from '@/components/ui/Badge';
import { Spinner } from '@/components/ui/Spinner';
import { Button } from '@/components/ui/Button';
import { FilePlus2, ClipboardList, CheckCircle2, Clock, ShieldCheck, ShieldAlert, FileText } from 'lucide-react';
import type { Inspection } from '@/types';

export function DashboardPage() {
  const { profile, isAdmin } = useAuth();
  const [inspections, setInspections] = useState<Inspection[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [verificationSubmitted, setVerificationSubmitted] = useState(false);

  useEffect(() => {
    async function checkVerificationSubmission() {
      if (!profile || isAdmin) return;

      const { data, error } = await supabase
        .from('verification_records')
        .select('id')
        .eq('inspector_id', profile.id)
        .eq('action', 'submitted')
        .limit(1);

      if (error) {
        console.error(
          'Error checking verification submission:',
          error.message
        );
        return;
      }

      setVerificationSubmitted((data?.length ?? 0) > 0);
    }

    checkVerificationSubmission();
  }, [profile, isAdmin]);

  useEffect(() => {
    async function load() {
      const { data, error } = await supabase
        .from('inspections')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(5);
      if (error) {
        setError(error.message);
      } else {
        setInspections(data as Inspection[]);
      }
      setLoading(false);
    }
    load();
  }, []);

  const stats = {
    total: inspections.length,
    completed: inspections.filter((i) => i.status === 'completed').length,
    inProgress: inspections.filter((i) => i.status === 'in_progress').length,
    drafts: inspections.filter((i) => i.status === 'draft').length,
  };

  const statCards = [
    { label: 'Total inspections', value: stats.total, icon: ClipboardList, color: 'text-slate-600', bg: 'bg-slate-100' },
    { label: 'Completed', value: stats.completed, icon: CheckCircle2, color: 'text-emerald-600', bg: 'bg-emerald-100' },
    { label: 'In progress', value: stats.inProgress, icon: Clock, color: 'text-amber-600', bg: 'bg-amber-100' },
    { label: 'Drafts', value: stats.drafts, icon: FileText, color: 'text-sky-600', bg: 'bg-sky-100' },
  ];

  const statusBadge = (status: string) => {
    const map: Record<string, 'success' | 'warning' | 'info'> = {
      completed: 'success',
      in_progress: 'warning',
      draft: 'info',
    };
    const label = status === 'in_progress' ? 'In Progress' : status.charAt(0).toUpperCase() + status.slice(1);
    return <Badge variant={map[status] || 'info'}>{label}</Badge>;
  };

  return (
    <AppLayout>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-slate-900">Dashboard</h1>
        <p className="mt-1 text-sm text-slate-500">
          Welcome back, {profile?.full_name || 'Inspector'}{isAdmin ? ' (Administrator)' : ''}. Here's your inspection overview.
        </p>
      </div>

      {/* Admin banner */}
      {isAdmin && (
        <div className="mb-6 rounded-xl border border-teal-200 bg-teal-50 p-4 flex items-center gap-3">
          <ShieldCheck className="h-5 w-5 text-teal-600 flex-shrink-0" />
          <div className="flex-1">
            <p className="text-sm font-medium text-teal-800">Administrator access</p>
            <p className="text-xs text-teal-700 mt-0.5">You can view all inspections across all inspectors and review verification requests.</p>
          </div>
        </div>
      )}

      {/* Verification banner */}
      {!isAdmin && profile && !verificationSubmitted && (
          <div className="mb-6 rounded-xl border border-amber-200 bg-amber-50 p-4 flex items-center gap-3">
            <ShieldAlert className="h-5 w-5 text-amber-600 flex-shrink-0" />

            <div className="flex-1">
              <p className="text-sm font-medium text-amber-800">
                Complete your inspector profile
              </p>

              <p className="text-xs text-amber-700 mt-0.5">
                Complete all profile details and submit your profile for verification.
              </p>
            </div>

            <Link to="/profile">
              <Button variant="outline" size="sm">
                Verify now
              </Button>
            </Link>
          </div>
        )}
      {profile?.verification_status === 'verified' && (
        <div className="mb-6 rounded-xl border border-emerald-200 bg-emerald-50 p-4 flex items-center gap-3">
          <ShieldCheck className="h-5 w-5 text-emerald-600 flex-shrink-0" />
          <div className="flex-1">
            <p className="text-sm font-medium text-emerald-800">Your inspector account is verified</p>
            <p className="text-xs text-emerald-700 mt-0.5">Badge: {profile.badge_number || 'N/A'}</p>
          </div>
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {statCards.map((stat) => {
          const Icon = stat.icon;
          return (
            <Card key={stat.label}>
              <CardBody>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">{stat.label}</p>
                    <p className="mt-2 text-3xl font-bold text-slate-900">{stat.value}</p>
                  </div>
                  <div className={`flex h-11 w-11 items-center justify-center rounded-lg ${stat.bg}`}>
                    <Icon className={`h-5 w-5 ${stat.color}`} />
                  </div>
                </div>
              </CardBody>
            </Card>
          );
        })}
      </div>

      {/* Quick action */}
      <div className="mb-8">
        <Link to="/inspections/new">
          <Button size="lg">
            <FilePlus2 className="h-5 w-5" />
            Start new inspection
          </Button>
        </Link>
      </div>

      {/* Recent inspections */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Recent inspections</CardTitle>
            <Link to="/inspections" className="text-sm font-medium text-teal-600 hover:text-teal-700">
              View all
            </Link>
          </div>
        </CardHeader>
        <CardBody>
          {loading ? (
            <div className="py-12"><Spinner /></div>
          ) : error ? (
            <p className="text-sm text-red-600 py-8 text-center">{error}</p>
          ) : inspections.length === 0 ? (
            <EmptyState
              icon={<ClipboardList className="h-12 w-12" />}
              title="No inspections yet"
              description="Start your first inspection to see it appear here."
              action={{ label: 'New inspection', to: '/inspections/new' }}
            />
          ) : (
            <div className="space-y-3">
              {inspections.map((inspection) => (
                <Link
                  key={inspection.id}
                  to={`/inspections/${inspection.id}/report`}
                  className="flex items-center justify-between rounded-lg border border-slate-200 p-4 hover:border-teal-300 hover:bg-teal-50/30 transition-colors"
                >
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-slate-900 truncate">
                      {inspection.product_name || 'Untitled product'}
                    </p>
                    <p className="text-xs text-slate-500 mt-0.5">
                      {inspection.product_category || 'Uncategorized'} · {new Date(inspection.created_at).toLocaleDateString()}
                    </p>
                  </div>
                  {statusBadge(inspection.status)}
                </Link>
              ))}
            </div>
          )}
        </CardBody>
      </Card>
    </AppLayout>
  );
}
