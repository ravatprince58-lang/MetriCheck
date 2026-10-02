import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { AuthLayout } from '@/components/layout/AuthLayout';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { Alert } from '@/components/ui/Alert';

export function LoginPage() {
  const { signIn } = useAuth();
  const navigate = useNavigate();
  const [inspectorId, setInspectorId] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const result = await signIn(email, password, inspectorId);
    const { error, role } = result;
    setLoading(false);
    if (error) {
      setError(error);
    } else {
      navigate(role === 'admin' ? '/admin' : '/dashboard', { replace: true });
    }
  };

  return (
    <AuthLayout title="Sign in" subtitle="Welcome back. Sign in to access your inspection workspace.">
      {error && <div className="mb-4"><Alert variant="error">{error}</Alert></div>}

      <form onSubmit={handleSubmit} className="space-y-5">
        <Input
          label="Inspector ID"
          type="text"
          name="inspectorId"
          value={inspectorId}
          onChange={(e) => setInspectorId(e.target.value)}
          placeholder="Required for officer accounts"
          autoComplete="username"
        />
        <p className="-mt-3 text-xs text-slate-500">Approved demo/user accounts can leave Inspector ID blank.</p>
        <Input
          label="Email address / login"
          type="email"
          name="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="inspector@example.com"
          required
          autoComplete="email"
        />
        <Input
          label="Password"
          type="password"
          name="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Enter your password"
          required
          autoComplete="current-password"
        />
        <Button type="submit" fullWidth size="lg" loading={loading}>
          Sign in
        </Button>
      </form>

      <p className="mt-6 text-center text-sm text-slate-500">
        Don't have an account?{' '}
        <Link to="/register" className="font-medium text-teal-600 hover:text-teal-700">
          Register as inspector
        </Link>
      </p>
    </AuthLayout>
  );
}
