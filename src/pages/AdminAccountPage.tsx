import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Activity,
  CheckCircle2,
  Clock,
  Eye,
  KeyRound,
  RefreshCw,
  Search,
  ShieldCheck,
  ShieldOff,
  UserCheck,
  UserCog,
  UserX,
  Users,
  XCircle,
} from 'lucide-react';

import { supabase } from '@/lib/supabase';
import { AdminLayout } from '@/components/layout/AdminLayout';

import {
  Card,
  CardBody,
  CardHeader,
  CardTitle,
} from '@/components/ui/Card';

import { Badge, EmptyState } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Spinner } from '@/components/ui/Spinner';

import type {
  Profile,
  UserRole,
  VerificationStatus,
} from '@/types';

type AccountFilter =
  | 'all'
  | 'pending'
  | 'verified'
  | 'rejected';

type AccountAction =
  | 'approve'
  | 'reject'
  | 'grant'
  | 'revoke';

interface AccountActionState {
  userId: string | null;
  action: AccountAction | null;
}

export function AdminAccountsPage() {

  const [users, setUsers] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const [error, setError] = useState<string | null>(null);
  const [actionMessage, setActionMessage] =
    useState<string | null>(null);

  const [search, setSearch] = useState('');
  const [filter, setFilter] =
    useState<AccountFilter>('all');

  const [selectedUser, setSelectedUser] =
    useState<Profile | null>(null);

  const [actionState, setActionState] =
    useState<AccountActionState>({
      userId: null,
      action: null,
    });

  /**
   * Load all profiles.
   *
   * This page intentionally uses the existing profiles table.
   * No new database fields are required for the frontend page.
   */
  const loadUsers = useCallback(
    async (showRefresh = false) => {
      if (showRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }

      setError(null);

      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .order('created_at', {
          ascending: false,
        });

      if (error) {
        setError(error.message);
        setUsers([]);
      } else {
        setUsers((data as Profile[]) || []);
      }

      setLoading(false);
      setRefreshing(false);
    },
    []
  );

  useEffect(() => {
    loadUsers();
  }, [loadUsers]);

  /**
   * Search + status filter.
   *
   * Email is intentionally NOT searched here because
   * email belongs to Supabase Auth and is not part of
   * the Profile interface.
   */
  const filteredUsers = useMemo(() => {
    const query = search.trim().toLowerCase();

    return users.filter((user) => {
      const matchesSearch =
        !query ||
        user.full_name
          ?.toLowerCase()
          .includes(query) ||
        user.badge_number
          ?.toLowerCase()
          .includes(query) ||
        user.organization
          ?.toLowerCase()
          .includes(query) ||
        user.phone
          ?.toLowerCase()
          .includes(query);

      const matchesFilter =
        filter === 'all' ||
        user.verification_status === filter;

      return matchesSearch && matchesFilter;
    });
  }, [users, search, filter]);

  const pendingUsers = users.filter(
    (user) =>
      user.verification_status === 'pending'
  );

  const verifiedUsers = users.filter(
    (user) =>
      user.verification_status === 'verified'
  );

  const rejectedUsers = users.filter(
    (user) =>
      user.verification_status === 'rejected'
  );

  const inspectorUsers = users.filter(
    (user) => user.role === 'inspector'
  );

  const adminUsers = users.filter(
    (user) => user.role === 'admin'
  );

  /**
   * Backend integration point.
   *
   * Currently this does NOT modify Supabase.
   * It only shows that the frontend action is connected.
   *
   * Later replace the body with:
   *
   * POST /api/admin/users/:id/approve
   * POST /api/admin/users/:id/reject
   * POST /api/admin/users/:id/grant-access
   * POST /api/admin/users/:id/revoke-access
   */
  const handleAction = async (
    user: Profile,
    action: AccountAction
  ) => {
    setError(null);
    setActionMessage(null);

    setActionState({
      userId: user.id,
      action,
    });

    try {
      /*
       * BACKEND INTEGRATION
       *
       * Example:
       *
       * const response = await fetch(
       *   `/api/admin/users/${user.id}/${action}`,
       *   {
       *     method: 'POST',
       *     headers: {
       *       'Content-Type': 'application/json',
       *     },
       *   }
       * );
       *
       * if (!response.ok) {
       *   const body = await response.json();
       *   throw new Error(
       *     body.message || 'Action failed.'
       *   );
       * }
       *
       * await loadUsers(true);
       */

      await new Promise((resolve) =>
        setTimeout(resolve, 300)
      );

      setActionMessage(
        `${getActionLabel(
          action
        )} is ready for backend integration for ${
          user.full_name || 'this account'
        }.`
      );
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'Unable to complete the action.'
      );
    } finally {
      setActionState({
        userId: null,
        action: null,
      });
    }
  };

  const getActionLabel = (
    action: AccountAction
  ) => {
    switch (action) {
      case 'approve':
        return 'Approve access';

      case 'reject':
        return 'Reject access';

      case 'grant':
        return 'Grant inspection access';

      case 'revoke':
        return 'Revoke inspection access';

      default:
        return 'Action';
    }
  };

  const isActionLoading = (
    userId: string,
    action: AccountAction
  ) =>
    actionState.userId === userId &&
    actionState.action === action;

  const verificationBadge = (
    status: VerificationStatus
  ) => {
    switch (status) {
      case 'verified':
        return (
          <Badge variant="success">
            <CheckCircle2 className="mr-1 h-3 w-3" />
            Verified
          </Badge>
        );

      case 'pending':
        return (
          <Badge variant="warning">
            <Clock className="mr-1 h-3 w-3" />
            Pending
          </Badge>
        );

      case 'rejected':
        return (
          <Badge variant="error">
            <XCircle className="mr-1 h-3 w-3" />
            Rejected
          </Badge>
        );

      default:
        return (
          <Badge variant="info">
            Unknown
          </Badge>
        );
    }
  };

  const roleBadge = (role: UserRole) => {
    if (role === 'admin') {
      return (
        <Badge variant="info">
          <ShieldCheck className="mr-1 h-3 w-3" />
          Admin
        </Badge>
      );
    }

    return (
      <Badge variant="info">
        Inspector
      </Badge>
    );
  };

  if (loading) {
    return (
      <AdminLayout>
        <div className="flex justify-center py-20">
          <Spinner size="lg" />
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="space-y-6">

        {/* Header */}
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <div className="flex items-center gap-2">
              <Link
                to="/admin"
                className="text-sm text-slate-500 hover:text-teal-600"
              >
                Admin
              </Link>

              <span className="text-slate-300">
                /
              </span>

              <span className="text-sm text-slate-700">
                Authorized accounts
              </span>
            </div>

            <h1 className="mt-2 text-2xl font-bold text-slate-900">
              Authorized accounts
            </h1>

            <p className="mt-1 text-sm text-slate-500">
              Manage inspectors, access requests,
              and inspection access.
            </p>
          </div>

          <Button
            variant="outline"
            onClick={() => loadUsers(true)}
            disabled={refreshing}
          >
            <RefreshCw
              className={`h-4 w-4 ${
                refreshing
                  ? 'animate-spin'
                  : ''
              }`}
            />

            Refresh
          </Button>
        </div>

        {/* Error */}
        {error && (
          <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
            {error}
          </div>
        )}

        {/* Action message */}
        {actionMessage && (
          <div className="rounded-lg border border-teal-200 bg-teal-50 p-4 text-sm text-teal-700">
            {actionMessage}
          </div>
        )}

        {/* Stats */}
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-5">

          <StatCard
            label="Total accounts"
            value={users.length}
            icon={<Users className="h-5 w-5 text-slate-600" />}
            bg="bg-slate-100"
          />

          <StatCard
            label="Inspectors"
            value={inspectorUsers.length}
            icon={<UserCog className="h-5 w-5 text-sky-600" />}
            bg="bg-sky-100"
          />

          <StatCard
            label="Pending"
            value={pendingUsers.length}
            icon={<Clock className="h-5 w-5 text-amber-600" />}
            bg="bg-amber-100"
          />

          <StatCard
            label="Verified"
            value={verifiedUsers.length}
            icon={<UserCheck className="h-5 w-5 text-emerald-600" />}
            bg="bg-emerald-100"
          />

          <StatCard
            label="Admins"
            value={adminUsers.length}
            icon={<ShieldCheck className="h-5 w-5 text-teal-600" />}
            bg="bg-teal-100"
          />

        </div>

        {/* Pending requests */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">

              <div className="flex items-center gap-2">
                <Clock className="h-5 w-5 text-amber-600" />

                <CardTitle>
                  Pending access requests (
                  {pendingUsers.length})
                </CardTitle>
              </div>

              <button
                type="button"
                onClick={() =>
                  setFilter('pending')
                }
                className="text-sm font-medium text-teal-600 hover:text-teal-700"
              >
                View all
              </button>

            </div>
          </CardHeader>

          <CardBody>
            {pendingUsers.length === 0 ? (
              <EmptyState
                title="No pending access requests"
                description="New inspector access requests will appear here."
              />
            ) : (
              <div className="space-y-3">

                {pendingUsers
                  .slice(0, 5)
                  .map((user) => (
                    <div
                      key={user.id}
                      className="flex flex-col gap-4 rounded-lg border border-slate-200 p-4 lg:flex-row lg:items-center"
                    >

                      <div className="flex min-w-0 flex-1 items-center gap-3">

                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-slate-100">
                          <UserCog className="h-5 w-5 text-slate-500" />
                        </div>

                        <div className="min-w-0">
                          <p className="truncate text-sm font-semibold text-slate-900">
                            {user.full_name ||
                              'Unnamed inspector'}
                          </p>

                          <p className="mt-0.5 truncate text-xs text-slate-500">
                            Authentication account
                          </p>

                          <p className="mt-0.5 text-xs text-slate-400">
                            {user.organization ||
                              'Organization not provided'}
                          </p>
                        </div>

                      </div>

                      <div className="flex items-center gap-2">

                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() =>
                            setSelectedUser(user)
                          }
                        >
                          <Eye className="h-4 w-4" />
                          View
                        </Button>

                        <Button
                          size="sm"
                          onClick={() =>
                            handleAction(
                              user,
                              'approve'
                            )
                          }
                          loading={isActionLoading(
                            user.id,
                            'approve'
                          )}
                        >
                          <CheckCircle2 className="h-4 w-4" />
                          Approve
                        </Button>

                        <Button
                          variant="danger"
                          size="sm"
                          onClick={() =>
                            handleAction(
                              user,
                              'reject'
                            )
                          }
                          loading={isActionLoading(
                            user.id,
                            'reject'
                          )}
                        >
                          <XCircle className="h-4 w-4" />
                          Reject
                        </Button>

                      </div>
                    </div>
                  ))}

              </div>
            )}
          </CardBody>
        </Card>

        {/* All accounts */}
        <Card>
          <CardHeader>
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">

              <CardTitle>
                All accounts
              </CardTitle>

              <div className="flex flex-col gap-2 sm:flex-row">

                <div className="relative">
                  <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />

                  <input
                    type="search"
                    value={search}
                    onChange={(e) =>
                      setSearch(e.target.value)
                    }
                    placeholder="Search accounts..."
                    className="h-10 w-full rounded-lg border border-slate-200 bg-white pl-9 pr-3 text-sm outline-none transition focus:border-teal-400 focus:ring-2 focus:ring-teal-100 sm:w-64"
                  />
                </div>

                <select
                  value={filter}
                  onChange={(e) =>
                    setFilter(
                      e.target
                        .value as AccountFilter
                    )
                  }
                  className="h-10 rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-700 outline-none focus:border-teal-400 focus:ring-2 focus:ring-teal-100"
                >
                  <option value="all">
                    All statuses
                  </option>

                  <option value="pending">
                    Pending
                  </option>

                  <option value="verified">
                    Verified
                  </option>

                  <option value="rejected">
                    Rejected
                  </option>
                </select>

              </div>
            </div>
          </CardHeader>

          <CardBody>
            {filteredUsers.length === 0 ? (
              <EmptyState
                icon={
                  <Users className="h-12 w-12" />
                }
                title="No accounts found"
                description={
                  search
                    ? 'Try a different search term.'
                    : 'No user accounts are currently available.'
                }
              />
            ) : (
              <div className="overflow-x-auto">

                <table className="w-full min-w-[900px]">

                  <thead>
                    <tr className="border-b border-slate-200 text-left">

                      <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500">
                        Account
                      </th>

                      <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500">
                        Role
                      </th>

                      <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500">
                        Verification
                      </th>

                      <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500">
                        Organization
                      </th>

                      <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500">
                        Created
                      </th>

                      <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-slate-500">
                        Actions
                      </th>

                    </tr>
                  </thead>

                  <tbody>
                    {filteredUsers.map((user) => {

                      return (
                        <tr
                          key={user.id}
                          className="border-b border-slate-100 last:border-0 hover:bg-slate-50"
                        >

                          <td className="px-4 py-4">
                            <div className="flex items-center gap-3">

                              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-slate-100">
                                {user.role ===
                                'admin' ? (
                                  <ShieldCheck className="h-4 w-4 text-teal-600" />
                                ) : (
                                  <UserCog className="h-4 w-4 text-slate-500" />
                                )}
                              </div>

                              <div className="min-w-0">

                                <p className="truncate text-sm font-medium text-slate-900">
                                  {user.full_name ||
                                    'Unnamed user'}
                                </p>

                                <p className="truncate text-xs text-slate-500">
                                  Authentication account
                                </p>

                                {user.badge_number && (
                                  <p className="text-xs text-slate-400">
                                    Badge:{' '}
                                    {user.badge_number}
                                  </p>
                                )}

                              </div>
                            </div>
                          </td>

                          <td className="px-4 py-4">
                            {roleBadge(user.role)}
                          </td>

                          <td className="px-4 py-4">
                            {verificationBadge(
                              user.verification_status
                            )}
                          </td>

                          <td className="px-4 py-4 text-sm text-slate-600">
                            {user.organization ||
                              '—'}
                          </td>

                          <td className="px-4 py-4 text-sm text-slate-500">
                            {new Date(
                              user.created_at
                            ).toLocaleDateString()}
                          </td>

                          <td className="px-4 py-4">
                            <div className="flex justify-end gap-2">

                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() =>
                                  setSelectedUser(
                                    user
                                  )
                                }
                              >
                                <Eye className="h-4 w-4" />
                                View
                              </Button>

                              {user.role ===
                                'inspector' &&
                                user.verification_status ===
                                  'verified' &&
                                (
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() =>
                                      handleAction(
                                        user,
                                        'revoke'
                                      )
                                    }
                                    loading={isActionLoading(
                                      user.id,
                                      'revoke'
                                    )}
                                  >
                                    <ShieldOff className="h-4 w-4" />
                                    Revoke
                                  </Button>
                                )}

                            </div>
                          </td>

                        </tr>
                      );
                    })}
                  </tbody>

                </table>

              </div>
            )}
          </CardBody>
        </Card>

        {/* Account activity */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Activity className="h-5 w-5 text-slate-600" />

              <CardTitle>
                Account activity
              </CardTitle>
            </div>
          </CardHeader>

          <CardBody>
            <EmptyState
              icon={
                <Activity className="h-12 w-12" />
              }
              title="Activity API not connected"
              description="Login activity, access changes, and administrative actions will appear here when the backend activity API is connected."
            />
          </CardBody>
        </Card>

      </div>

      {/* User details modal */}
      {selectedUser && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4"
          onMouseDown={(e) => {
            if (
              e.target === e.currentTarget
            ) {
              setSelectedUser(null);
            }
          }}
        >
          <div className="w-full max-w-lg rounded-xl bg-white shadow-xl">

            <div className="flex items-center justify-between border-b border-slate-200 p-5">

              <div>
                <h2 className="text-lg font-semibold text-slate-900">
                  Account details
                </h2>

                <p className="mt-1 text-xs text-slate-500">
                  Inspector authorization information
                </p>
              </div>

              <button
                type="button"
                onClick={() =>
                  setSelectedUser(null)
                }
                className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
                aria-label="Close"
              >
                <XCircle className="h-5 w-5" />
              </button>

            </div>

            <div className="space-y-4 p-5">

              <div className="flex items-center gap-3 rounded-lg bg-slate-50 p-4">

                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-white shadow-sm">

                  {selectedUser.role ===
                  'admin' ? (
                    <ShieldCheck className="h-6 w-6 text-teal-600" />
                  ) : (
                    <UserCog className="h-6 w-6 text-slate-500" />
                  )}

                </div>

                <div>
                  <p className="font-semibold text-slate-900">
                    {selectedUser.full_name ||
                      'Unnamed user'}
                  </p>

                  <p className="text-sm text-slate-500">
                    Authentication account
                  </p>
                </div>

              </div>

              <div className="grid grid-cols-2 gap-3">

                <div className="rounded-lg border border-slate-200 p-3">
                  <p className="text-xs text-slate-500">
                    Role
                  </p>

                  <div className="mt-2">
                    {roleBadge(
                      selectedUser.role
                    )}
                  </div>
                </div>

                <div className="rounded-lg border border-slate-200 p-3">
                  <p className="text-xs text-slate-500">
                    Verification
                  </p>

                  <div className="mt-2">
                    {verificationBadge(
                      selectedUser.verification_status
                    )}
                  </div>
                </div>

              </div>

              <div className="grid grid-cols-2 gap-3">

                <Detail
                  label="Badge number"
                  value={
                    selectedUser.badge_number ||
                    'Not provided'
                  }
                />

                <Detail
                  label="Organization"
                  value={
                    selectedUser.organization ||
                    'Not provided'
                  }
                />

                <Detail
                  label="Phone"
                  value={
                    selectedUser.phone ||
                    'Not provided'
                  }
                />

                <Detail
                  label="Created"
                  value={new Date(
                    selectedUser.created_at
                  ).toLocaleString()}
                />

              </div>

              {selectedUser.verification_notes && (
                <div className="rounded-lg border border-amber-200 bg-amber-50 p-3">

                  <p className="text-xs font-medium text-amber-800">
                    Verification notes
                  </p>

                  <p className="mt-1 text-sm text-amber-700">
                    {
                      selectedUser.verification_notes
                    }
                  </p>

                </div>
              )}

              <div className="flex flex-wrap justify-end gap-2 border-t border-slate-200 pt-4">

                {selectedUser.verification_status ===
                  'pending' && (
                  <>
                    <Button
                      variant="danger"
                      size="sm"
                      onClick={() =>
                        handleAction(
                          selectedUser,
                          'reject'
                        )
                      }
                      loading={isActionLoading(
                        selectedUser.id,
                        'reject'
                      )}
                    >
                      <UserX className="h-4 w-4" />
                      Reject
                    </Button>

                    <Button
                      size="sm"
                      onClick={() =>
                        handleAction(
                          selectedUser,
                          'approve'
                        )
                      }
                      loading={isActionLoading(
                        selectedUser.id,
                        'approve'
                      )}
                    >
                      <UserCheck className="h-4 w-4" />
                      Approve
                    </Button>
                  </>
                )}

                {selectedUser.role ===
                  'inspector' &&
                  selectedUser.verification_status ===
                    'verified' && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() =>
                      handleAction(
                        selectedUser,
                        'revoke'
                      )
                    }
                    loading={isActionLoading(
                      selectedUser.id,
                      'revoke'
                    )}
                  >
                    <KeyRound className="h-4 w-4" />
                    Revoke inspection access
                  </Button>
                )}

              </div>

            </div>
          </div>
        </div>
      )}
    </AdminLayout>
  );
}

function StatCard({
  label,
  value,
  icon,
  bg,
}: {
  label: string;
  value: number;
  icon: React.ReactNode;
  bg: string;
}) {
  return (
    <Card>
      <CardBody>
        <div className="flex items-center justify-between">

          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
              {label}
            </p>

            <p className="mt-2 text-3xl font-bold text-slate-900">
              {value}
            </p>
          </div>

          <div
            className={`flex h-11 w-11 items-center justify-center rounded-lg ${bg}`}
          >
            {icon}
          </div>

        </div>
      </CardBody>
    </Card>
  );
}

function Detail({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-lg border border-slate-200 p-3">

      <p className="text-xs text-slate-500">
        {label}
      </p>

      <p className="mt-1 text-sm font-medium text-slate-800">
        {value}
      </p>

    </div>
  );
}