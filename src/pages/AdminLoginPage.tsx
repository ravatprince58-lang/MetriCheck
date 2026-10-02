import { useState } from 'react';
import { useLocation, useNavigate, Link } from 'react-router-dom';
import { ShieldCheck } from 'lucide-react';
import { useAdminAuth } from '@/context/AdminAuthContext';
import { AuthLayout } from '@/components/layout/AuthLayout';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { Alert } from '@/components/ui/Alert';

export function AdminLoginPage() {
  const { signInAdmin } = useAdminAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const from =
    (location.state as { from?: { pathname?: string } } | null)?.from?.pathname ||
    '/admin';

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);
    setLoading(true);

    const result = await signInAdmin(email, password);

    setLoading(false);

    if (result.error) {
      setError(result.error);
      return;
    }

    navigate(from.startsWith('/admin') ? from : '/admin', { replace: true });
  };

  return (
    <AuthLayout
      title="Admin sign in"
      subtitle="Sign in to the separate MetriCheck administration panel."
    >
      <div className="mb-6 flex items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 p-4">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-slate-900 text-white">
          <ShieldCheck className="h-5 w-5" />
        </div>
        <div>
          <p className="text-sm font-semibold text-slate-900">Administration access</p>
          <p className="text-xs text-slate-500">This login is independent of the inspector profile role.</p>
        </div>
      </div>

      {error && (
        <div className="mb-4">
          <Alert variant="error">{error}</Alert>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-5">
        <Input
          label="Admin email"
          type="email"
          name="adminEmail"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          placeholder="admin@metricheck.local"
          required
          autoComplete="username"
        />

        <Input
          label="Admin password"
          type="password"
          name="adminPassword"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          placeholder="Enter admin password"
          required
          autoComplete="current-password"
        />

        <Button type="submit" fullWidth size="lg" loading={loading}>
          Open Admin Panel
        </Button>
      </form>

      <p className="mt-6 text-center text-sm text-slate-500">
        Inspector account?{' '}
        <Link to="/login" className="font-medium text-teal-600 hover:text-teal-700">
          Inspector sign in
        </Link>
      </p>
    </AuthLayout>
  );
}
