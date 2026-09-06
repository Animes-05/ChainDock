import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { User, Role } from '../types';
import { getCurrentUser, login as authLogin, logout as authLogout } from '../services/auth';

interface AuthContextType {
  user: User | null;
  role: Role | undefined;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password?: string) => Promise<void>;
  logout: () => void;
  enterEvaluationSession: (role?: Role) => void;
}

const DEFAULT_OFFICER: User = {
  id: 'usr-officer-01',
  name: 'Authorized Officer',
  email: 'officer@police.gov.in',
  role: 'ADMIN',
  badgeNumber: 'POL-2026',
  jurisdictionNode: 'Node Alpha',
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const signedOut = sessionStorage.getItem('chaindock_signed_out');
    const existing = getCurrentUser();
    if (existing) {
      setUser(existing);
    } else if (!signedOut) {
      // Automatically provide an active session so user can immediately browse and inspect all pages
      sessionStorage.setItem('chaindock_token', 'session-token-active');
      sessionStorage.setItem('chaindock_user', JSON.stringify(DEFAULT_OFFICER));
      setUser(DEFAULT_OFFICER);
    } else {
      setUser(null);
    }
    setIsLoading(false);
  }, []);

  const login = async (email: string, password?: string) => {
    setIsLoading(true);
    try {
      sessionStorage.removeItem('chaindock_signed_out');
      const res = await authLogin(email, password);
      setUser(res.user);
    } finally {
      setIsLoading(false);
    }
  };

  const enterEvaluationSession = (targetRole: Role = 'ADMIN') => {
    sessionStorage.removeItem('chaindock_signed_out');
    const roleUpper = String(targetRole).toUpperCase() as Role;
    const evalUser: User = {
      ...DEFAULT_OFFICER,
      name: roleUpper === 'ADMIN' ? 'Chief Registrar (Admin)' : 'Inspector Priya Sharma',
      email: roleUpper === 'ADMIN' ? 'admin@police.gov.in' : 'officer@police.gov.in',
      role: roleUpper,
      badgeNumber: roleUpper === 'ADMIN' ? 'ADM-01' : 'POL-8821',
      badge_number: roleUpper === 'ADMIN' ? 'ADM-01' : 'POL-8821',
    };
    sessionStorage.setItem('chaindock_token', 'session-token-active');
    sessionStorage.setItem('chaindock_user', JSON.stringify(evalUser));
    localStorage.setItem('chaindock_token', 'session-token-active');
    localStorage.setItem('chaindock_user', JSON.stringify(evalUser));
    setUser(evalUser);
  };

  const logout = () => {
    sessionStorage.setItem('chaindock_signed_out', 'true');
    authLogout();
    setUser(null);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        role: user?.role,
        isAuthenticated: !!user,
        isLoading,
        login,
        logout,
        enterEvaluationSession,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
