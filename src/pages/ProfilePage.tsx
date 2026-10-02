import { useEffect, useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/lib/supabase';
import { AppLayout } from '@/components/layout/AppLayout';
import { Card, CardBody, CardHeader, CardTitle } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { Alert } from '@/components/ui/Alert';
import { Badge } from '@/components/ui/Badge';
import { Spinner } from '@/components/ui/Spinner';
import { Mail, ShieldCheck, ShieldAlert, Clock, Save } from 'lucide-react';

export function ProfilePage() {
  const { profile, user, isAdmin, role, refreshProfile } = useAuth();
  const [fullName, setFullName] = useState('');
  const [badgeNumber, setBadgeNumber] = useState('');
  const [organization, setOrganization] = useState('');
  const [phone, setPhone] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    if (!success) return;

    const timer = setTimeout(() => {
      setSuccess(null);
    }, 4000);

    return () => clearTimeout(timer);
  }, [success]);

  useEffect(() => {
    if (profile) {
      setFullName(profile.full_name || '');
      setBadgeNumber(profile.badge_number || '');
      setOrganization(profile.organization || '');
      setPhone(profile.phone || '');
    }
    setLoading(false);
  }, [profile]);

  const handleSave = async () => {
    if (!profile) return;

    setError(null);
    setSuccess(null);

    if (
      !fullName.trim() ||
      !badgeNumber.trim() ||
      !organization.trim() ||
      !phone.trim()
    ) {
      setError('Please complete all profile details before submitting.');
      return;
    }

    setSaving(true);

    // 1. Save profile details
    const { error: profileError } = await supabase
      .from('profiles')
      .update({
        full_name: fullName.trim(),
        badge_number: badgeNumber.trim(),
        organization: organization.trim(),
        phone: phone.trim(),
      })
      .eq('id', profile.id);

    if (profileError) {
      setSaving(false);
      setError('Could not save profile details. Please try again.');
      return;
    }

    // 2. Submit verification request
    const { error: verificationError } = await supabase.rpc(
      'submit_verification',
      {
        p_badge_number: badgeNumber.trim(),
        p_organization: organization.trim(),
        p_phone: phone.trim(),
      }
    );

    setSaving(false);

    if (verificationError) {
      setError('Profile was saved, but verification submission failed. Please try again.');
      await refreshProfile();
      return;
    }

    // 3. Refresh profile so status remains Pending
    await refreshProfile();

    setSuccess(
      'Profile submitted successfully. Your verification request is now pending administrator review.'
    );
  };

  if (loading) {
    return (
      <AppLayout>
        <div className="py-20"><Spinner size="lg" /></div>
      </AppLayout>
    );
  }

  const status = profile?.verification_status || 'pending';
  const accessStatus = profile?.access_status || 'pending';

  return (
    <AppLayout>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900">Profile</h1>
        <p className="mt-1 text-sm text-slate-500">Manage your inspector profile and account details.</p>
      </div>

      {error && <div className="mb-4"><Alert variant="error">{error}</Alert></div>}
      {success && ( <div className="mb-4"><Alert variant="success">{success}</Alert></div>)}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Profile summary */}
        <Card className="lg:col-span-1">
          <CardBody>
            <div className="flex flex-col items-center text-center">
              <div className="flex h-20 w-20 items-center justify-center rounded-full bg-teal-100 text-teal-700 text-2xl font-bold">
                {(fullName || user?.email || '?').charAt(0).toUpperCase()}
              </div>
              <h2 className="mt-4 text-lg font-bold text-slate-900">{fullName || 'Inspector'}</h2>
              <p className="text-sm text-slate-500">{user?.email}</p>
              <div className="mt-3 flex flex-col items-center gap-2">
                <div className="flex gap-2">
                  <Badge variant={role === 'admin' ? 'info' : 'default'}>
                    {role === 'admin' ? 'Administrator' : 'Inspector'}
                  </Badge>
                  <Badge variant={status === 'verified' ? 'success' : status === 'pending' ? 'warning' : 'error'}>
                    {status === 'verified' && <ShieldCheck className="h-3 w-3 mr-1 inline" />}
                    {status === 'pending' && <Clock className="h-3 w-3 mr-1 inline" />}
                    {status === 'rejected' && <ShieldAlert className="h-3 w-3 mr-1 inline" />}
                    {status.charAt(0).toUpperCase() + status.slice(1)}
                  </Badge>
                </div>
              </div>
              <p className="mt-3 text-xs text-slate-500">Inspection access: <span className="font-semibold capitalize">{accessStatus}</span></p>
              {badgeNumber && (
                <p className="mt-3 text-xs text-slate-500">Badge: {badgeNumber}</p>
              )}
              {organization && (
                <p className="text-xs text-slate-500">{organization}</p>
              )}
            </div>
          </CardBody>
        </Card>

        {/* Edit form */}
        <Card className="lg:col-span-2">
          <CardHeader><CardTitle>Edit profile</CardTitle></CardHeader>
          <CardBody>
            <div className="space-y-5">
              <div className="flex items-center gap-3 rounded-lg bg-slate-50 px-4 py-3">
                <Mail className="h-4 w-4 text-slate-400 flex-shrink-0" />
                <div className="flex-1">
                  <p className="text-xs text-slate-400">Email (cannot be changed)</p>
                  <p className="text-sm font-medium text-slate-700">{user?.email}</p>
                </div>
              </div>
              <div className="flex items-center gap-3 rounded-lg bg-slate-50 px-4 py-3">
                <ShieldCheck className="h-4 w-4 text-slate-400 flex-shrink-0" />
                <div className="flex-1">
                  <p className="text-xs text-slate-400">Role (assigned by admin)</p>
                  <p className="text-sm font-medium text-slate-700 capitalize">{role || 'inspector'}</p>
                </div>
              </div>

              <Input
                label="Full name"
                type="text"
                name="fullName"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="Jane Doe"
              />
              <Input
                label="Badge number"
                type="text"
                name="badgeNumber"
                value={badgeNumber}
                onChange={(e) => setBadgeNumber(e.target.value)}
                placeholder="e.g. SIH-INS-26034"
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

              <div className="flex justify-end pt-2">
                <Button onClick={handleSave} loading={saving}>
                  <Save className="h-4 w-4" />
                  Submit Profile
                </Button>
              </div>
            </div>
          </CardBody>
        </Card>
      </div>
    </AppLayout>
  );
}
