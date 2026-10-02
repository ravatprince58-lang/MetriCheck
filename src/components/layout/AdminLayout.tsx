import { NavLink, useNavigate } from 'react-router-dom';
import { useAdminAuth } from '@/context/AdminAuthContext';
import { Button } from '@/components/ui/Button';
import {
  LayoutDashboard,
  Users,
  Settings,
  LogOut,
  ClipboardCheck,
  Menu,
  X,
  ArrowLeft,
} from 'lucide-react';
import { useState, type ReactNode } from 'react';

const adminNavItems = [
  { to: '/admin', label: 'Dashboard', icon: LayoutDashboard, end: true },
  { to: '/admin/accounts', label: 'Accounts', icon: Users },
  { to: '/admin/rules', label: 'Compliance Rules', icon: Settings },
];

export function AdminLayout({ children }: { children: ReactNode }) {
  const { adminEmail, signOutAdmin } = useAdminAuth();
  const navigate = useNavigate();
  const [mobileOpen, setMobileOpen] = useState(false);

  const handleSignOut = async () => {
    signOutAdmin();
    navigate('/admin/login', { replace: true });
  };

  const goToInspector = () => {
    setMobileOpen(false);
    navigate('/dashboard');
  };

  const sidebar = (
    <div className="flex h-full flex-col">
      <div className="flex items-center gap-3 border-b border-slate-200 px-5 py-5">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-900 text-white">
          <ClipboardCheck className="h-5 w-5" />
        </div>
        <div className="min-w-0">
          <p className="text-sm font-bold text-slate-900">MetriCheck</p>
          <p className="text-xs text-slate-500">Administration Panel</p>
        </div>
      </div>

      <div className="border-b border-slate-200 bg-slate-50 px-5 py-3">
        <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">Admin area</p>
        <p className="mt-1 text-xs text-slate-600 truncate">{adminEmail || 'Administrator'}</p>
      </div>

      <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-4">
        {adminNavItems.map((item) => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              onClick={() => setMobileOpen(false)}
              className={({ isActive }) =>
                `flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
                  isActive
                    ? 'bg-slate-900 text-white'
                    : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                }`
              }
            >
              <Icon className="h-4 w-4 flex-shrink-0" />
              {item.label}
            </NavLink>
          );
        })}
      </nav>

      <div className="border-t border-slate-200 px-3 py-4 space-y-2">
        <Button variant="ghost" size="sm" onClick={goToInspector} fullWidth>
          <ArrowLeft className="h-4 w-4" />
          Inspector dashboard
        </Button>
        <Button variant="ghost" size="sm" onClick={handleSignOut} fullWidth>
          <LogOut className="h-4 w-4" />
          Sign out
        </Button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-50">
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 border-r border-slate-200 bg-white lg:block">
        {sidebar}
      </aside>

      <header className="sticky top-0 z-30 flex items-center justify-between border-b border-slate-200 bg-white px-4 py-3 lg:hidden">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-900 text-white">
            <ClipboardCheck className="h-4 w-4" />
          </div>
          <div>
            <p className="text-sm font-bold text-slate-900">MetriCheck</p>
            <p className="text-[10px] text-slate-500">Admin</p>
          </div>
        </div>
        <button
          type="button"
          onClick={() => setMobileOpen(true)}
          className="text-slate-600 hover:text-slate-900"
          aria-label="Open admin navigation"
        >
          <Menu className="h-6 w-6" />
        </button>
      </header>

      {mobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div
            className="absolute inset-0 bg-slate-900/50"
            onClick={() => setMobileOpen(false)}
          />
          <div className="absolute inset-y-0 left-0 w-72 bg-white shadow-xl">
            <button
              type="button"
              onClick={() => setMobileOpen(false)}
              className="absolute right-4 top-4 z-10 text-slate-400 hover:text-slate-600"
              aria-label="Close admin navigation"
            >
              <X className="h-5 w-5" />
            </button>
            {sidebar}
          </div>
        </div>
      )}

      <main className="lg:pl-64">
        <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
          {children}
        </div>
      </main>
    </div>
  );
}
