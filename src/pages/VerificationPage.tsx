import { useEffect, useState, useCallback } from 'react';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/lib/supabase';
import { AppLayout } from '@/components/layout/AppLayout';
import { Card, CardBody, CardHeader, CardTitle } from '@/components/ui/Card';
import { Input, Textarea } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { Alert } from '@/components/ui/Alert';
import { Badge } from '@/components/ui/Badge';
import { Spinner } from '@/components/ui/Spinner';
import { EmptyState } from '@/components/ui/Badge';
import { ShieldCheck, ShieldAlert, Clock, XCircle, CheckCircle2, Users, Trash2 } from 'lucide-react';
import type { VerificationStatus, VerificationRecord, Profile } from '@/types';

export function VerificationPage() {
  const { profile, isAdmin, refreshProfile } = useAuth();
  const [badgeNumber, setBadgeNumber] = useState('');
  const [organization, setOrganization] = useState('');
  const [phone, setPhone] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Admin review state
  const [pendingInspectors, setPendingInspectors] = useState<Profile[]>([]);
  const [adminLoading, setAdminLoading] = useState(false);
  const [reviewNotes, setReviewNotes] = useState<Record<string, string>>({});

  // Verification history
  const [history, setHistory] = useState<VerificationRecord[]>([]);
  useEffect(() => {
    if (!profile || isAdmin) return;

    const checkVerificationStatus = async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('verification_status, verified_at, verification_notes')
        .eq('id', profile.id)
        .single();

      if (error) {
        console.error('Verification status check failed:', error);
        return;
      }

      if (
        data &&
        (
          data.verification_status !== profile.verification_status ||
          data.verified_at !== profile.verified_at ||
          data.verification_notes !== profile.verification_notes
        )
      ) {
        await refreshProfile();
      }
    };

    const interval = setInterval(checkVerificationStatus, 3000);

    return () => clearInterval(interval);
  }, [
    profile?.id,
    profile?.verification_status,
    profile?.verified_at,
    profile?.verification_notes,
    isAdmin,
    refreshProfile,
  ]);

  useEffect(() => {
    if (profile) {
      setBadgeNumber(profile.badge_number || '');
      setOrganization(profile.organization || '');
      setPhone(profile.phone || '');
    }
    setLoading(false);
  }, [profile]);

  const loadHistory = useCallback(async () => {
    if (!profile) return;
    const { data } = await supabase
      .from('verification_records')
      .select('*')
      .eq('inspector_id', profile.id)
      .order('created_at', { ascending: false })
      .limit(10);
    if (data) setHistory(data as VerificationRecord[]);
  }, [profile]);

  const loadPendingInspectors = useCallback(async () => {
    if (!isAdmin) return;
    setAdminLoading(true);
    const { data } = await supabase
      .from('profiles')
      .select('*')
      .eq('verification_status', 'pending')
      .order('created_at', { ascending: false });
    if (data) setPendingInspectors(data as Profile[]);
    setAdminLoading(false);
  }, [isAdmin]);

  useEffect(() => {
    loadHistory();
    if (isAdmin) loadPendingInspectors();
  }, [loadHistory, loadPendingInspectors, isAdmin]);

  const handleSaveProfile = async () => {
    if (!profile) return;
    setError(null);
    setSuccess(null);
    setSaving(true);
    const { error } = await supabase
      .from('profiles')
      .update({ badge_number: badgeNumber, organization, phone })
      .eq('id', profile.id);
    setSaving(false);
    if (error) {
      setError('Could not save profile details. Please try again.');
    } else {
      setSuccess('Profile details saved.');
      await refreshProfile();
    }
  };

  const handleSubmitVerification = async () => {
    if (!profile) return;
    setError(null);
    setSuccess(null);

    if (!badgeNumber.trim() || !organization.trim()) {
      setError('Badge number and organization are required to submit for verification.');
      return;
    }

    setSubmitting(true);
    const { error } = await supabase.rpc('submit_verification', {
      p_badge_number: badgeNumber,
      p_organization: organization,
      p_phone: phone,
    });
    setSubmitting(false);
    if (error) {
      setError('Could not submit verification request. Please try again.');
    } else {
      setSuccess('Verification request submitted. An administrator will review your credentials.');
      await refreshProfile();
      await loadHistory();
    }
  };

  const handleDeleteHistory = async (record: VerificationRecord) => {
    if (!window.confirm('Delete this verification history record? This cannot be undone.')) return;
    setError(null);

    const { error } = await supabase.rpc('delete_verification_history_record', {
      p_record_id: record.id,
    });

    if (error) {
      console.error('Verification history delete failed:', error);
      setError(error.message || 'Could not delete verification history record.');
      return;
    }

    await loadHistory();
    setSuccess('Verification history record deleted.');
  };

  const handleDeleteAllHistory = async () => {
    if (!profile || history.length === 0) return;
    if (!window.confirm('Delete all verification history records? This cannot be undone.')) return;
    setError(null);

    const { error } = await supabase.rpc('delete_my_verification_history');
    if (error) {
      console.error('Verification history delete-all failed:', error);
      setError(error.message || 'Could not delete verification history.');
      return;
    }

    setHistory([]);
    setSuccess('All verification history has been deleted.');
  };

  const handleReview = async (inspectorId: string, action: 'approved' | 'rejected') => {
    const notes = reviewNotes[inspectorId] || '';
    setSubmitting(true);
    const { error } = await supabase.rpc('review_verification', {
      p_inspector_id: inspectorId,
      p_action: action,
      p_notes: notes,
    });
    setSubmitting(false);
    if (error) {
      setError('Could not review verification request. Please try again.');
    } else {
      setSuccess(`Verification ${action} successfully.`);
      setReviewNotes((prev) => {
        const next = { ...prev };
        delete next[inspectorId];
        return next;
      });
      await loadPendingInspectors();
    }
  };

  if (loading) {
    return (
      <AppLayout>
        <div className="py-20"><Spinner size="lg" /></div>
      </AppLayout>
    );
  }

  const status: VerificationStatus = profile?.verification_status || 'pending';

  const statusBanner = () => {
    switch (status) {
      case 'verified':
        return (
          <div className="mb-6 rounded-xl border border-emerald-200 bg-emerald-50 p-5 flex items-start gap-4">
            <ShieldCheck className="h-6 w-6 text-emerald-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-semibold text-emerald-800">Inspector verified</p>
              <p className="text-sm text-emerald-700 mt-1">
                Your credentials have been verified. You are authorized to conduct inspections.
              </p>
              {profile?.verified_at && (
                <p className="text-xs text-emerald-600 mt-1">
                  Verified on {new Date(profile.verified_at).toLocaleDateString()}
                </p>
              )}
            </div>
          </div>
        );
      case 'pending':
        return (
          <div className="mb-6 rounded-xl border border-amber-200 bg-amber-50 p-5 flex items-start gap-4">
            <Clock className="h-6 w-6 text-amber-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-semibold text-amber-800">Verification pending</p>
              <p className="text-sm text-amber-700 mt-1">
                Your verification request has been submitted and is awaiting administrator review.
              </p>
            </div>
          </div>
        );
      case 'rejected':
        return (
          <div className="mb-6 rounded-xl border border-red-200 bg-red-50 p-5 flex items-start gap-4">
            <XCircle className="h-6 w-6 text-red-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-semibold text-red-800">Verification rejected</p>
              <p className="text-sm text-red-700 mt-1">
                Your verification request was not approved. Please review the notes below and resubmit.
              </p>
              {profile?.verification_notes && (
                <div className="mt-2 rounded-lg bg-white border border-red-200 p-3">
                  <p className="text-xs font-medium text-red-700">Reviewer notes:</p>
                  <p className="text-xs text-red-600 mt-1">{profile.verification_notes}</p>
                </div>
              )}
            </div>
          </div>
        );
    }
  };

  const actionIcon = (action: string) => {
    switch (action) {
      case 'approved': return <CheckCircle2 className="h-4 w-4 text-emerald-500" />;
      case 'rejected': return <XCircle className="h-4 w-4 text-red-500" />;
      case 'submitted': return <Clock className="h-4 w-4 text-amber-500" />;
      default: return <Clock className="h-4 w-4 text-slate-400" />;
    }
  };

  return (
    <AppLayout>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900">Inspector credential verification</h1>
        <p className="mt-1 text-sm text-slate-500">Submit your professional credentials for admin review. This is separate from individual inspection verification, which is done per-inspection during the compliance workflow.</p>
      </div>

      {error && <div className="mb-4"><Alert variant="error">{error}</Alert></div>}
      {success && (<div className="mb-4"><Alert variant="success">{success}</Alert></div>)}

      {/* Admin review section */}
      {isAdmin && (
        <Card className="mb-6 border-teal-200">
          <CardHeader>
            <div className="flex items-center gap-2">
              <Users className="h-5 w-5 text-teal-600" />
              <CardTitle>Admin: Pending verifications ({pendingInspectors.length})</CardTitle>
            </div>
          </CardHeader>
          <CardBody>
            {adminLoading ? (
              <div className="py-8"><Spinner /></div>
            ) : pendingInspectors.length === 0 ? (
              <EmptyState title="No pending verifications" description="All inspector verification requests have been reviewed." />
            ) : (
              <div className="space-y-4">
                {pendingInspectors.map((inspector) => (
                  <div key={inspector.id} className="rounded-lg border border-slate-200 p-4">
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <p className="text-sm font-medium text-slate-900">{inspector.full_name || 'Unknown'}</p>
                        <p className="text-xs text-slate-500 mt-0.5">
                          Badge: {inspector.badge_number || 'N/A'} · Org: {inspector.organization || 'N/A'}
                        </p>
                        {inspector.phone && (
                          <p className="text-xs text-slate-500">Phone: {inspector.phone}</p>
                        )}
                      </div>
                      <Badge variant="warning">Pending</Badge>
                    </div>
                    <Textarea
                      placeholder="Review notes (optional for approval, required for rejection)..."
                      rows={2}
                      value={reviewNotes[inspector.id] || ''}
                      onChange={(e) => setReviewNotes((prev) => ({ ...prev, [inspector.id]: e.target.value }))}
                      className="text-sm"
                    />
                    <div className="flex gap-2 mt-3">
                      <Button size="sm" onClick={() => handleReview(inspector.id, 'approved')} loading={submitting}>
                        <CheckCircle2 className="h-4 w-4" />
                        Approve
                      </Button>
                      <Button size="sm" variant="danger" onClick={() => handleReview(inspector.id, 'rejected')} loading={submitting}>
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
      )}

      {statusBanner()}

      {/* Credential form */}
      <Card className="max-w-2xl">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Credential details</CardTitle>
            <Badge variant={status === 'verified' ? 'success' : status === 'pending' ? 'warning' : 'error'}>
              {status.charAt(0).toUpperCase() + status.slice(1)}
            </Badge>
          </div>
        </CardHeader>
        <CardBody>
          <div className="space-y-5">
            <Input
              label="Badge number"
              type="text"
              name="badgeNumber"
              value={badgeNumber}
              onChange={(e) => setBadgeNumber(e.target.value)}
              placeholder="e.g. SIH-INS-26034"
              hint="Your official inspector identification number"
            />
            <Input
              label="Organization"
              type="text"
              name="organization"
              value={organization}
              onChange={(e) => setOrganization(e.target.value)}
              placeholder="e.g. Bureau of Indian Standards"
            />
            <Input
              label="Phone number"
              type="tel"
              name="phone"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="e.g. +91 98765 43210"
            />

            <div className="flex gap-3 pt-2">
              <Button variant="outline" onClick={handleSaveProfile} loading={saving}>
                Save details
              </Button>
              {status !== 'verified' && (
                <Button onClick={handleSubmitVerification} loading={submitting}>
                  <ShieldAlert className="h-4 w-4" />
                  {status === 'pending' ? 'Resubmit for verification' : 'Submit for verification'}
                </Button>
              )}
            </div>
          </div>
        </CardBody>
      </Card>

      {/* Verification history */}
      {history.length > 0 && (
        <Card className="max-w-2xl mt-6">
          <CardHeader>
            <div className="flex items-center justify-between gap-3">
              <CardTitle>Verification history</CardTitle>
              <Button
                size="sm"
                variant="danger"
                onClick={handleDeleteAllHistory}
                disabled={history.length === 0}
              >
                <Trash2 className="h-4 w-4" />
                Delete all
              </Button>
            </div>
          </CardHeader>
          <CardBody>
            <div className="space-y-3">
              {history.map((record) => (
                <div key={record.id} className="flex items-start gap-3 rounded-lg border border-slate-100 p-3">
                  {actionIcon(record.action)}
                  <div className="flex-1">
                    <p className="text-sm font-medium text-slate-700 capitalize">
                      {record.action.replace('_', ' ')}
                    </p>
                    <p className="text-xs text-slate-400">
                      {new Date(record.created_at).toLocaleString()}
                    </p>
                    {record.notes && (
                      <p className="text-xs text-slate-500 mt-1">{record.notes}</p>
                    )}
                  </div>
                  <button onClick={() => handleDeleteHistory(record)} title="Delete history record" className="p-2 text-slate-400 hover:text-red-600 rounded-md">
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              ))}
            </div>
          </CardBody>
        </Card>
      )}

      {/* How verification works */}
      <Card className="max-w-2xl mt-6">
        <CardHeader><CardTitle>How verification works</CardTitle></CardHeader>
        <CardBody>
          <div className="space-y-3 text-sm text-slate-600">
            <div className="flex gap-3">
              <div className="flex h-6 w-6 items-center justify-center rounded-full bg-teal-100 text-teal-700 text-xs font-bold flex-shrink-0">1</div>
              <p>Fill in your badge number, organization, and contact details.</p>
            </div>
            <div className="flex gap-3">
              <div className="flex h-6 w-6 items-center justify-center rounded-full bg-teal-100 text-teal-700 text-xs font-bold flex-shrink-0">2</div>
              <p>Submit your credentials for review by an administrator.</p>
            </div>
            <div className="flex gap-3">
              <div className="flex h-6 w-6 items-center justify-center rounded-full bg-teal-100 text-teal-700 text-xs font-bold flex-shrink-0">3</div>
              <p>Once verified, your inspector badge will appear on all reports you generate.</p>
            </div>
          </div>
        </CardBody>
      </Card>
    </AppLayout>
  );
}
