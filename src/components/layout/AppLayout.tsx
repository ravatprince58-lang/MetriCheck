import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { Button } from '@/components/ui/Button';
import {
  LayoutDashboard,
  FilePlus2,
  History,
  User as UserIcon,
  ShieldCheck,
  LogOut,
  ClipboardCheck,
  Menu,
  X,
  Settings,
  LayoutDashboard as LayoutIcon,
} from 'lucide-react';
import { useState, type ReactNode } from 'react';

const navItems = [
  { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/inspections/new', label: 'New Inspection', icon: FilePlus2 },
  { to: '/inspections', label: 'History', icon: History },
  { to: '/verification', label: 'Verification', icon: ShieldCheck },
  { to: '/profile', label: 'Profile', icon: UserIcon },
];

const adminNavItems = [
  { to: '/admin', label: 'Admin Dashboard', icon: LayoutIcon },
  { to: '/admin/accounts', label: 'Accounts', icon: UserIcon },
  { to: '/admin/rules', label: 'Rule Management', icon: Settings },
];

export function AppLayout({ children }: { children: ReactNode }) {
  const { profile, isAdmin, signOut } = useAuth();
  const navigate = useNavigate();
  const [mobileOpen, setMobileOpen] = useState(false);

  const handleSignOut = async () => {
    await signOut();
    navigate('/login');
  };

  const sidebar = (
    <div className="flex h-full flex-col">
      <div className="flex items-center gap-2.5 px-6 py-5 border-b border-slate-200">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-teal-600 text-white">
          <ClipboardCheck className="h-5 w-5" />
        </div>
        <div>
          <p className="text-sm font-bold text-slate-900 leading-tight">MetriCheck</p>
          <p className="text-xs text-slate-500 leading-tight">Inspector</p>
        </div>
      </div>

      <nav className="flex-1 space-y-1 px-3 py-4 overflow-y-auto">
        {navItems.map((item) => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === '/inspections'}
              onClick={() => setMobileOpen(false)}
              className={({ isActive }) =>
                `flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${isActive
                  ? 'bg-teal-50 text-teal-700'
                  : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                }`
              }
            >
              <Icon className="h-4.5 w-4.5 flex-shrink-0" />
              {item.label}
            </NavLink>
          );
        })}
        {isAdmin && (
          <>
            <div className="px-3 pt-5 pb-2 text-[10px] font-semibold uppercase tracking-wider text-slate-400">Administration</div>
            {adminNavItems.map((item) => {
              const Icon = item.icon;
              return (
                <NavLink
                  key={item.to}
                  to={item.to}
                  onClick={() => setMobileOpen(false)}
                  className={({ isActive }) =>
                    `flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${isActive
                      ? 'bg-teal-50 text-teal-700'
                      : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                    }`
                  }
                >
                  <Icon className="h-4.5 w-4.5 flex-shrink-0" />
                  {item.label}
                </NavLink>
              );
            })}
          </>
        )}
      </nav>

      <div className="border-t border-slate-200 px-3 py-4">
        <div className="mb-3 px-3">
          <p className="text-sm font-medium text-slate-900 truncate">{profile?.full_name || 'Inspector'}</p>
          <p className="text-xs text-slate-500 truncate">
            {isAdmin ? 'Administrator' : (profile?.badge_number || 'No badge')}
          </p>
          {isAdmin && (
            <span className="mt-1 inline-flex items-center gap-1 rounded-full bg-teal-100 px-2 py-0.5 text-xs font-medium text-teal-700">
              <ShieldCheck className="h-3 w-3" /> Admin
            </span>
          )}
        </div>
        <Button variant="ghost" size="sm" onClick={handleSignOut} fullWidth>
          <LogOut className="h-4 w-4" />
          Sign out
        </Button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Desktop sidebar */}
      <aside className="fixed inset-y-0 left-0 w-64 border-r border-slate-200 bg-white hidden lg:block">
        {sidebar}
      </aside>

      {/* Mobile header */}
      <header className="lg:hidden sticky top-0 z-30 bg-white border-b border-slate-200 px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-teal-600 text-white">
            <ClipboardCheck className="h-4.5 w-4.5" />
          </div>
          <span className="text-sm font-bold text-slate-900">MetriCheck</span>
        </div>
        <button onClick={() => setMobileOpen(true)} className="text-slate-600 hover:text-slate-900">
          <Menu className="h-6 w-6" />
        </button>
      </header>

      {/* Mobile sidebar drawer */}
      {mobileOpen && (
        <div className="lg:hidden fixed inset-0 z-50">
          <div className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm" onClick={() => setMobileOpen(false)} />
          <div className="absolute inset-y-0 left-0 w-64 bg-white shadow-xl">
            <button onClick={() => setMobileOpen(false)} className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 z-10">
              <X className="h-5 w-5" />
            </button>
            {sidebar}
          </div>
        </div>
      )}

      {/* Main content */}
      <main className="lg:pl-64">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-6 lg:py-8">
          {children}
        </div>
      </main>
    </div>
  );
}
