import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ClipboardCheck, ArrowLeft } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { createAccessRequest } from '@/services/accessRequestService';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { Alert } from '@/components/ui/Alert';

interface DemoRequestForm {
  name: string;
  email: string;
  password: string;
  confirmPassword: string;
  organization: string;
  phone: string;
  productName: string;
  brandName: string;
}

export function RequestDemoPage() {
  const [form, setForm] = useState<DemoRequestForm>({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
    organization: '',
    phone: '',
    productName: '',
    brandName: '',
  });

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const update = (
    key: keyof DemoRequestForm,
    value: string
  ) => {
    setForm((prev) => ({
      ...prev,
      [key]: value,
    }));
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();

    setSaving(true);
    setError(null);
    setSuccess(false);

    if (form.password.length < 6) {
      setError(
        'Password must be at least 6 characters long.'
      );
      setSaving(false);
      return;
    }

    if (form.password !== form.confirmPassword) {
      setError('Passwords do not match.');
      setSaving(false);
      return;
    }

    const name = form.name.trim();
    const email = form.email.trim().toLowerCase();
    const organization = form.organization.trim();
    const phone = form.phone.trim();
    const productName = form.productName.trim();
    const brandName = form.brandName.trim();

    if (!name) {
      setError('Please enter your full name.');
      setSaving(false);
      return;
    }

    if (!email) {
      setError('Please enter your email address.');
      setSaving(false);
      return;
    }

    if (!organization) {
      setError('Please enter your company or organization.');
      setSaving(false);
      return;
    }

    if (!productName) {
      setError('Please enter the product name.');
      setSaving(false);
      return;
    }

    if (!brandName) {
      setError('Please enter the brand name.');
      setSaving(false);
      return;
    }

    /*
     * Create the real Supabase Auth account.
     *
     * The password is handled only by Supabase Auth.
     * It is NOT stored in localStorage or the access request.
     */
    const { data: signUpData, error: signUpError } =
      await supabase.auth.signUp({
        email,
        password: form.password,
        options: {
          data: {
            full_name: name,
            account_type: 'demo',
          },
        },
      });

    /*
     * If the account creation fails for a reason other than
     * an already-existing account, stop the request.
     */
    if (
      signUpError &&
      !/already registered|already exists|user already/i.test(
        signUpError.message
      )
    ) {
      setError(signUpError.message);
      setSaving(false);
      return;
    }

    /*
     * Save the access request locally.
     *
     * No access_requests Supabase table is used.
     */
    try {
      createAccessRequest({
        name,
        email,
        organization,
        phone,
        productName,
        brandName,
      });
    } catch {
      setError(
        'Could not save your access request. Please try again.'
      );
      setSaving(false);
      return;
    }

    /*
     * Keep this variable referenced so TypeScript does not
     * complain about the returned Auth data being unused.
     */
    void signUpData;

    setSaving(false);
    setSuccess(true);

    setForm({
      name: '',
      email: '',
      password: '',
      confirmPassword: '',
      organization: '',
      phone: '',
      productName: '',
      brandName: '',
    });
  };

  return (
    <div className="min-h-screen bg-slate-50 px-4 py-10">
      <div className="mx-auto max-w-xl">

        <Link
          to="/"
          className="mb-6 inline-flex items-center gap-2 text-sm text-slate-500"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to home
        </Link>

        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">

          <div className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-teal-600 text-white">
              <ClipboardCheck className="h-5 w-5" />
            </div>

            <h1 className="text-2xl font-bold">
              Request inspection access
            </h1>
          </div>

          <p className="mt-2 text-sm text-slate-500">
            Create your real account and submit your access
            request. An administrator must approve inspection
            access before you can inspect products.
          </p>

          {success ? (
            <div className="mt-6">
              <Alert
                variant="success"
                title="Access request received"
              >
                Your request is pending administrator review.
                Your password was handled by Supabase Auth and
                was not stored in the access request.
              </Alert>

              <Link
                to="/login"
                className="mt-5 inline-block text-sm font-semibold text-teal-700"
              >
                Go to sign in
              </Link>
            </div>
          ) : (
            <form
              onSubmit={submit}
              className="mt-6 space-y-4"
            >
              {error && (
                <Alert variant="error">
                  {error}
                </Alert>
              )}

              <Input
                label="Full name"
                value={form.name}
                onChange={(e) =>
                  update('name', e.target.value)
                }
                required
              />

              <Input
                label="Email"
                type="email"
                value={form.email}
                onChange={(e) =>
                  update('email', e.target.value)
                }
                required
                autoComplete="email"
              />

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <Input
                  label="Password"
                  type="password"
                  value={form.password}
                  onChange={(e) =>
                    update('password', e.target.value)
                  }
                  required
                  autoComplete="new-password"
                  hint="Minimum 6 characters"
                />

                <Input
                  label="Confirm password"
                  type="password"
                  value={form.confirmPassword}
                  onChange={(e) =>
                    update(
                      'confirmPassword',
                      e.target.value
                    )
                  }
                  required
                  autoComplete="new-password"
                />
              </div>

              <Input
                label="Company / Organization"
                value={form.organization}
                onChange={(e) =>
                  update('organization', e.target.value)
                }
                required
              />

              <Input
                label="Phone"
                value={form.phone}
                onChange={(e) =>
                  update('phone', e.target.value)
                }
              />

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <Input
                  label="Product name"
                  value={form.productName}
                  onChange={(e) =>
                    update('productName', e.target.value)
                  }
                  required
                />

                <Input
                  label="Brand name"
                  value={form.brandName}
                  onChange={(e) =>
                    update('brandName', e.target.value)
                  }
                  required
                />
              </div>

              <Button
                type="submit"
                fullWidth
                loading={saving}
              >
                Submit access request
              </Button>
            </form>
          )}

        </div>
      </div>
    </div>
  );
}

export default RequestDemoPage;