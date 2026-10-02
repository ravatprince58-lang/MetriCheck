import { useEffect, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { AdminLayout } from '@/components/layout/AdminLayout';
import {
  Card,
  CardBody,
  CardHeader,
  CardTitle,
} from '@/components/ui/Card';
import {
  Badge,
  EmptyState,
  ErrorState,
} from '@/components/ui/Badge';
import { Spinner } from '@/components/ui/Spinner';
import { Button } from '@/components/ui/Button';

import {
  getAccessRequests,
  updateAccessRequestStatus,
  type AccessRequest,
} from '@/services/accessRequestService';

import {
  Users,
  ClipboardList,
  ShieldCheck,
  Clock,
  CheckCircle2,
  FileText,
  Activity,
  ChevronRight,
  Settings,
} from 'lucide-react';

import type {
  Profile,
  Inspection,
  ComplianceCheck,
  AuditLog,
  ConsumerGrievance,
} from '@/types';

export function AdminDashboardPage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [pendingInspectors, setPendingInspectors] =
    useState<Profile[]>([]);

  const [allInspectors, setAllInspectors] =
    useState<Profile[]>([]);

  const [recentInspections, setRecentInspections] =
    useState<Inspection[]>([]);

  const [complianceStats, setComplianceStats] =
    useState({
      total: 0,
      verified: 0,
      pending: 0,
    });

  const [auditLogs, setAuditLogs] =
    useState<AuditLog[]>([]);

  const [accessRequests, setAccessRequests] =
    useState<AccessRequest[]>([]);

  const [grievances, setGrievances] =
    useState<ConsumerGrievance[]>([]);

  const [actionId, setActionId] =
    useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);

    /*
     * Access requests are now handled by localStorage.
     *
     * Everything else continues to use Supabase.
     */
    const [
      inspRes,
      pendingRes,
      allInsRes,
      checkRes,
      auditRes,
      grievanceRes,
    ] = await Promise.all([
      supabase
        .from('inspections')
        .select('*')
        .order('created_at', {
          ascending: false,
        })
        .limit(10),

      supabase
        .from('profiles')
        .select('*')
        .eq('verification_status', 'pending')
        .order('created_at', {
          ascending: false,
        }),

      supabase
        .from('profiles')
        .select('*')
        .order('created_at', {
          ascending: false,
        }),

      supabase
        .from('compliance_checks')
        .select('verified_status'),

      supabase
        .from('audit_logs')
        .select('*')
        .order('created_at', {
          ascending: false,
        })
        .limit(15),

      supabase
        .from('consumer_grievances')
        .select('*')
        .order('created_at', {
          ascending: false,
        })
        .limit(20),
    ]);

    const firstError = [
      inspRes,
      pendingRes,
      allInsRes,
      checkRes,
      auditRes,
      grievanceRes,
    ].find((result) => result.error)?.error;

    if (firstError) {
      setError(firstError.message);
      setLoading(false);
      return;
    }

    setRecentInspections(
      (inspRes.data as Inspection[]) || []
    );

    setPendingInspectors(
      (pendingRes.data as Profile[]) || []
    );

    setAllInspectors(
      (allInsRes.data as Profile[]) || []
    );

    const checks =
      (checkRes.data as ComplianceCheck[]) || [];

    setComplianceStats({
      total: checks.length,
      verified: checks.filter(
        (c) => c.verified_status !== null
      ).length,
      pending: checks.filter(
        (c) => c.verified_status === null
      ).length,
    });

    setAuditLogs(
      (auditRes.data as AuditLog[]) || []
    );

    /*
     * Load access requests from localStorage.
     *
     * Only pending requests are displayed here.
     */
    setAccessRequests(
      getAccessRequests().filter(
        (request) => request.status === 'pending'
      )
    );

    setGrievances(
      (grievanceRes.data as ConsumerGrievance[]) || []
    );

    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const verifiedInspectors =
    allInspectors.filter(
      (i) => i.verification_status === 'verified'
    );

  const statCards = [
    {
      label: 'Total inspectors',
      value: allInspectors.length,
      icon: Users,
      color: 'text-slate-600',
      bg: 'bg-slate-100',
    },
    {
      label: 'Pending verifications',
      value: pendingInspectors.length,
      icon: Clock,
      color: 'text-amber-600',
      bg: 'bg-amber-100',
    },
    {
      label: 'Verified inspectors',
      value: verifiedInspectors.length,
      icon: CheckCircle2,
      color: 'text-emerald-600',
      bg: 'bg-emerald-100',
    },
    {
      label: 'Compliance checks',
      value: complianceStats.total,
      icon: ShieldCheck,
      color: 'text-teal-600',
      bg: 'bg-teal-100',
    },
  ];

  const actionLabel = (action: string) => {
    const map: Record<string, string> = {
      inspection_created: 'Created inspection',
      inspection_completed: 'Completed inspection',
      ocr_processed: 'Processed OCR',
      compliance_checked: 'Ran compliance check',
      compliance_verified: 'Verified compliance',
      profile_updated: 'Updated profile',
      verification_submitted:
        'Submitted verification',
      verification_reviewed:
        'Reviewed verification',
      access_request_approved:
        'Approved access request',
      access_request_rejected:
        'Rejected access request',
      inspection_access_changed:
        'Changed inspection access',
    };

    return (
      map[action] ||
      action.replace(/_/g, ' ')
    );
  };

  /*
   * Approve or reject a local access request.
   */
  const reviewAccessRequest = (
    requestId: string,
    action: 'approved' | 'rejected'
  ) => {
    setActionId(requestId);
    setError(null);

    const updated =
      updateAccessRequestStatus(
        requestId,
        action
      );

    if (!updated) {
      setError(
        'Could not update access request.'
      );
    }

    /*
     * Refresh the pending list from localStorage.
     */
    setAccessRequests(
      getAccessRequests().filter(
        (request) => request.status === 'pending'
      )
    );

    setActionId(null);
  };

  /*
   * Inspector access still uses the existing
   * Supabase RPC because this is separate from
   * the access request storage.
   */
  const setAccess = async (
    userId: string,
    status:
      | 'approved'
      | 'suspended'
      | 'rejected'
  ) => {
    setActionId(userId);
    setError(null);

    const { error } =
      await supabase.rpc(
        'set_inspection_access',
        {
          p_target_user_id: userId,
          p_access_status: status,
          p_notes: '',
        }
      );

    if (error) {
      setError(
        error.message ||
          'Could not change inspection access.'
      );
    }

    await load();
    setActionId(null);
  };

  if (loading) {
    return (
      <AdminLayout>
        <div className="py-20">
          <Spinner size="lg" />
        </div>
      </AdminLayout>
    );
  }

  if (error) {
    return (
      <AdminLayout>
        <ErrorState
          message={error}
          onRetry={load}
        />
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">
            Admin dashboard
          </h1>

          <p className="mt-1 text-sm text-slate-500">
            System overview, inspector management,
            and audit trail.
          </p>
        </div>

        <Link to="/admin/rules">
          <Button variant="outline">
            <Settings className="h-4 w-4" />
            Manage rules
          </Button>
        </Link>
      </div>

      {/* Stats */}
      <div className="mb-8 grid grid-cols-2 gap-4 lg:grid-cols-4">
        {statCards.map((stat) => {
          const Icon = stat.icon;

          return (
            <Card key={stat.label}>
              <CardBody>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
                      {stat.label}
                    </p>

                    <p className="mt-2 text-3xl font-bold text-slate-900">
                      {stat.value}
                    </p>
                  </div>

                  <div
                    className={`flex h-11 w-11 items-center justify-center rounded-lg ${stat.bg}`}
                  >
                    <Icon
                      className={`h-5 w-5 ${stat.color}`}
                    />
                  </div>
                </div>
              </CardBody>
            </Card>
          );
        })}
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">

        {/* Pending verifications */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Clock className="h-5 w-5 text-amber-600" />

                <CardTitle>
                  Pending verifications (
                  {pendingInspectors.length})
                </CardTitle>
              </div>

              <Link
                to="/verification"
                className="text-sm font-medium text-teal-600 hover:text-teal-700"
              >
                Review all
              </Link>
            </div>
          </CardHeader>

          <CardBody>
            {pendingInspectors.length === 0 ? (
              <EmptyState
                title="No pending verifications"
                description="All inspector verification requests have been reviewed."
              />
            ) : (
              <div className="space-y-3">
                {pendingInspectors.map(
                  (inspector) => (
                    <Link
                      key={inspector.id}
                      to="/verification"
                      className="flex items-center justify-between rounded-lg border border-slate-200 p-3 transition-colors hover:border-teal-300 hover:bg-teal-50/30"
                    >
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium text-slate-900">
                          {inspector.full_name ||
                            'Unknown'}
                        </p>

                        <p className="mt-0.5 text-xs text-slate-500">
                          Badge:{' '}
                          {inspector.badge_number ||
                            'N/A'}{' '}
                          ·{' '}
                          {inspector.organization ||
                            'No org'}
                        </p>
                      </div>

                      <Badge variant="warning">
                        Pending
                      </Badge>

                      <ChevronRight className="ml-2 h-4 w-4 text-slate-300" />
                    </Link>
                  )
                )}
              </div>
            )}
          </CardBody>
        </Card>

        {/* Recent inspections */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ClipboardList className="h-5 w-5 text-slate-600" />

                <CardTitle>
                  Recent inspections (
                  {recentInspections.length})
                </CardTitle>
              </div>

              <Link
                to="/inspections"
                className="text-sm font-medium text-teal-600 hover:text-teal-700"
              >
                View all
              </Link>
            </div>
          </CardHeader>

          <CardBody>
            {recentInspections.length === 0 ? (
              <EmptyState
                title="No inspections"
                description="No inspections have been created yet."
              />
            ) : (
              <div className="space-y-3">
                {recentInspections.map(
                  (insp) => (
                    <Link
                      key={insp.id}
                      to={`/inspections/${insp.id}/report`}
                      className="flex items-center justify-between rounded-lg border border-slate-200 p-3 transition-colors hover:border-teal-300 hover:bg-teal-50/30"
                    >
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium text-slate-900">
                          {insp.product_name ||
                            'Untitled'}
                        </p>

                        <p className="mt-0.5 text-xs text-slate-500">
                          {insp.product_category ||
                            'Uncategorized'}{' '}
                          ·{' '}
                          {new Date(
                            insp.created_at
                          ).toLocaleDateString()}
                        </p>
                      </div>

                      <Badge
                        variant={
                          insp.status ===
                          'completed'
                            ? 'success'
                            : insp.status ===
                              'in_progress'
                            ? 'warning'
                            : 'info'
                        }
                      >
                        {insp.status.replace(
                          '_',
                          ' '
                        )}
                      </Badge>
                    </Link>
                  )
                )}
              </div>
            )}
          </CardBody>
        </Card>
      </div>

      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-2">

        {/* Access Requests */}
        <Card>
          <CardHeader>
            <CardTitle>
              Pending access requests (
              {accessRequests.length})
            </CardTitle>
          </CardHeader>

          <CardBody>
            {accessRequests.length === 0 ? (
              <EmptyState
                title="No pending access requests"
                description="New demo/user access requests will appear here."
              />
            ) : (
              <div className="space-y-3">
                {accessRequests.map(
                  (request) => (
                    <div
                      key={request.id}
                      className="rounded-lg border border-slate-200 p-4"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="font-medium text-slate-900">
                            {request.name}
                          </p>

                          <p className="mt-1 text-xs text-slate-500">
                            {request.email} ·{' '}
                            {request.organization}
                          </p>

                          <p className="mt-1 text-xs text-slate-500">
                            Product:{' '}
                            {request.productName}{' '}
                            · Brand:{' '}
                            {request.brandName}
                          </p>

                          {request.phone && (
                            <p className="mt-1 text-xs text-slate-500">
                              Phone:{' '}
                              {request.phone}
                            </p>
                          )}

                          <p className="mt-1 text-xs text-slate-400">
                            Submitted:{' '}
                            {new Date(
                              request.createdAt
                            ).toLocaleString()}
                          </p>
                        </div>

                        <Badge variant="warning">
                          Pending
                        </Badge>
                      </div>

                      <div className="mt-3 flex gap-2">
                        <Button
                          size="sm"
                          onClick={() =>
                            reviewAccessRequest(
                              request.id,
                              'approved'
                            )
                          }
                          loading={
                            actionId ===
                            request.id
                          }
                        >
                          Approve
                        </Button>

                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() =>
                            reviewAccessRequest(
                              request.id,
                              'rejected'
                            )
                          }
                          disabled={
                            actionId ===
                            request.id
                          }
                        >
                          Reject
                        </Button>
                      </div>
                    </div>
                  )
                )}
              </div>
            )}
          </CardBody>
        </Card>

        {/* Users */}
        <Card>
          <CardHeader>
            <CardTitle>
              Users & inspection access (
              {allInspectors.length})
            </CardTitle>
          </CardHeader>

          <CardBody>
            {allInspectors.length === 0 ? (
              <EmptyState
                title="No users"
                description="Registered users will appear here."
              />
            ) : (
              <div className="space-y-3">
                {allInspectors.map(
                  (user) => (
                    <div
                      key={user.id}
                      className="rounded-lg border border-slate-200 p-3"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-slate-900">
                            {user.full_name ||
                              'Unnamed user'}
                          </p>

                          <p className="mt-1 text-xs text-slate-500">
                            {user.account_type ===
                            'demo'
                              ? 'Demo/User'
                              : 'Inspector'}{' '}
                            · ID:{' '}
                            {user.badge_number ||
                              '—'}
                          </p>

                          <p className="mt-1 text-xs text-slate-500">
                            Access:{' '}
                            {user.access_status}{' '}
                            · Verification:{' '}
                            {
                              user.verification_status
                            }
                          </p>
                        </div>

                        <Badge
                          variant={
                            user.access_status ===
                            'approved'
                              ? 'success'
                              : user.access_status ===
                                'suspended'
                              ? 'warning'
                              : user.access_status ===
                                'rejected'
                              ? 'error'
                              : 'default'
                          }
                        >
                          {user.access_status}
                        </Badge>
                      </div>

                      {user.role !== 'admin' && (
                        <div className="mt-3 flex flex-wrap gap-2">

                          {user.access_status !==
                            'approved' && (
                            <Button
                              size="sm"
                              onClick={() =>
                                setAccess(
                                  user.id,
                                  'approved'
                                )
                              }
                              loading={
                                actionId ===
                                user.id
                              }
                            >
                              Grant access
                            </Button>
                          )}

                          {user.access_status ===
                            'approved' && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() =>
                                setAccess(
                                  user.id,
                                  'suspended'
                                )
                              }
                              disabled={
                                actionId ===
                                user.id
                              }
                            >
                              Suspend
                            </Button>
                          )}

                          {user.access_status !==
                            'rejected' && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() =>
                                setAccess(
                                  user.id,
                                  'rejected'
                                )
                              }
                              disabled={
                                actionId ===
                                user.id
                              }
                            >
                              Revoke
                            </Button>
                          )}

                        </div>
                      )}
                    </div>
                  )
                )}
              </div>
            )}
          </CardBody>
        </Card>
      </div>

      {/* Consumer grievances */}
      <Card className="mt-6">
        <CardHeader>
          <CardTitle>
            Consumer grievances ({grievances.length})
          </CardTitle>
        </CardHeader>

        <CardBody>
          {grievances.length === 0 ? (
            <EmptyState
              title="No grievances"
              description="Consumer complaints submitted from the public grievance form will appear here."
            />
          ) : (
            <div className="space-y-3">
              {grievances.map(
                (grievance) => (
                  <div
                    key={grievance.id}
                    className="rounded-lg border border-slate-200 p-4"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="font-medium text-slate-900">
                          {grievance.product_name}
                        </p>

                        <p className="mt-1 text-xs text-slate-500">
                          {grievance.name} ·{' '}
                          {grievance.email}
                        </p>

                        <p className="mt-1 text-xs text-slate-500">
                          {grievance.category ||
                            'Uncategorized'}{' '}
                          ·{' '}
                          {new Date(
                            grievance.created_at
                          ).toLocaleString()}
                        </p>
                      </div>

                      <Badge
                        variant={
                          grievance.status ===
                            'resolved' ||
                          grievance.status ===
                            'closed'
                            ? 'success'
                            : 'warning'
                        }
                      >
                        {grievance.status.replace(
                          '_',
                          ' '
                        )}
                      </Badge>
                    </div>

                    <p className="mt-3 whitespace-pre-wrap text-sm text-slate-600">
                      {grievance.complaint}
                    </p>
                  </div>
                )
              )}
            </div>
          )}
        </CardBody>
      </Card>

      {/* Audit trail */}
      <Card className="mt-6">
        <CardHeader>
          <div className="flex items-center gap-2">
            <Activity className="h-5 w-5 text-slate-600" />

            <CardTitle>
              Recent activity
            </CardTitle>
          </div>
        </CardHeader>

        <CardBody>
          {auditLogs.length === 0 ? (
            <EmptyState
              icon={
                <Activity className="h-12 w-12" />
              }
              title="No activity recorded"
              description="Actions across the system will appear here."
            />
          ) : (
            <div className="space-y-2">
              {auditLogs.map(
                (log) => (
                  <div
                    key={log.id}
                    className="flex items-start gap-3 rounded-lg border border-slate-100 p-3"
                  >
                    <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg bg-slate-100">
                      <FileText className="h-4 w-4 text-slate-500" />
                    </div>

                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-slate-700">
                        {actionLabel(
                          log.action
                        )}
                      </p>

                      <p className="mt-0.5 text-xs text-slate-400">
                        {new Date(
                          log.created_at
                        ).toLocaleString()}
                      </p>
                    </div>
                  </div>
                )
              )}
            </div>
          )}
        </CardBody>
      </Card>
    </AdminLayout>
  );
}

export default AdminDashboardPage;