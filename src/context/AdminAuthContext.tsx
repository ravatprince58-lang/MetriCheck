import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from 'react';

interface AdminAuthContextValue {
  isAdminAuthenticated: boolean;
  adminEmail: string | null;
  signInAdmin: (email: string, password: string) => Promise<{ error: string | null }>;
  signOutAdmin: () => void;
}

const AdminAuthContext = createContext<AdminAuthContextValue | undefined>(undefined);

const STORAGE_KEY = 'metricheck_admin_authenticated';
const EMAIL_KEY = 'metricheck_admin_email';

function getConfiguredAdminEmail() {
  return (import.meta.env.VITE_ADMIN_EMAIL || 'admin@metricheck.local').trim().toLowerCase();
}

function getConfiguredAdminPassword() {
  return import.meta.env.VITE_ADMIN_PASSWORD || 'Admin@12345';
}

export function AdminAuthProvider({ children }: { children: ReactNode }) {
  const [isAdminAuthenticated, setIsAdminAuthenticated] = useState(() =>
    typeof window !== 'undefined' && sessionStorage.getItem(STORAGE_KEY) === 'true'
  );
  const [adminEmail, setAdminEmail] = useState<string | null>(() =>
    typeof window !== 'undefined' ? sessionStorage.getItem(EMAIL_KEY) : null
  );

  const signInAdmin = useCallback(async (email: string, password: string) => {
    const normalizedEmail = email.trim().toLowerCase();

    if (!normalizedEmail || !password) {
      return { error: 'Email and password are required.' };
    }

    if (
      normalizedEmail !== getConfiguredAdminEmail() ||
      password !== getConfiguredAdminPassword()
    ) {
      return { error: 'Invalid admin email or password.' };
    }

    sessionStorage.setItem(STORAGE_KEY, 'true');
    sessionStorage.setItem(EMAIL_KEY, normalizedEmail);
    setIsAdminAuthenticated(true);
    setAdminEmail(normalizedEmail);

    return { error: null };
  }, []);

  const signOutAdmin = useCallback(() => {
    sessionStorage.removeItem(STORAGE_KEY);
    sessionStorage.removeItem(EMAIL_KEY);
    setIsAdminAuthenticated(false);
    setAdminEmail(null);
  }, []);

  const value = useMemo(
    () => ({
      isAdminAuthenticated,
      adminEmail,
      signInAdmin,
      signOutAdmin,
    }),
    [isAdminAuthenticated, adminEmail, signInAdmin, signOutAdmin]
  );

  return (
    <AdminAuthContext.Provider value={value}>
      {children}
    </AdminAuthContext.Provider>
  );
}

export function useAdminAuth() {
  const context = useContext(AdminAuthContext);

  if (!context) {
    throw new Error('useAdminAuth must be used within AdminAuthProvider');
  }

  return context;
}
