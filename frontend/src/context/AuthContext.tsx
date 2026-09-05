import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { User, Role } from '../types';
import { getCurrentUser, login as authLogin, logout as authLogout, DEMO_USERS } from '../services/auth';

interface AuthContextType {
  user: User | null;
  role: Role | undefined;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password?: string) => Promise<void>;
  loginAsRole: (role: Role) => Promise<void>;
  switchRole: (role: Role) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const existing = getCurrentUser();
    if (existing) {
      setUser(existing);
    } else {
      // Default to Investigator for easy evaluation
      const defaultUser = DEMO_USERS.INVESTIGATOR;
      setUser(defaultUser);
      sessionStorage.setItem('chaindock_user', JSON.stringify(defaultUser));
      sessionStorage.setItem('chaindock_token', `mock_jwt_${defaultUser.role.toLowerCase()}`);
    }
    setIsLoading(false);
  }, []);

  const login = async (email: string, password?: string) => {
    setIsLoading(true);
    try {
      const res = await authLogin(email, password);
      setUser(res.user);
    } finally {
      setIsLoading(false);
    }
  };

  const loginAsRole = async (targetRole: Role) => {
    setIsLoading(true);
    try {
      const targetUser = DEMO_USERS[targetRole];
      await login(targetUser.email);
    } finally {
      setIsLoading(false);
    }
  };

  const logout = () => {
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
        loginAsRole,
        switchRole: loginAsRole,
        logout,
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
