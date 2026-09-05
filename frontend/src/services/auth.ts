import { api } from './api';
import { User, Role } from '../types';

export const DEMO_USERS: Record<Role, User> = {
  INVESTIGATOR: {
    id: 'usr-inv-4029',
    email: 'rajesh.sharma@police.gov.in',
    name: 'Inspector Rajesh Sharma',
    role: 'INVESTIGATOR',
    badgeNumber: 'INSP-4029',
    jurisdictionNode: 'Jurisdiction Node Alpha (Special Crime Branch)',
    avatarUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80',
  },
  SUPERVISOR: {
    id: 'usr-sup-1044',
    email: 'meera.sen@police.gov.in',
    name: 'ACP Meera Sen',
    role: 'SUPERVISOR',
    badgeNumber: 'ACP-1044',
    jurisdictionNode: 'Jurisdiction Node Beta (Central Oversight & Prosecution)',
    avatarUrl: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=150&auto=format&fit=crop&q=80',
  },
  ADMIN: {
    id: 'usr-adm-0001',
    email: 'admin.arvind@ncrb.gov.in',
    name: 'Director Arvind Kumar',
    role: 'ADMIN',
    badgeNumber: 'ADM-001',
    jurisdictionNode: 'Sovereign Root Central Tribunal (NCRB Infrastructure)',
    avatarUrl: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&auto=format&fit=crop&q=80',
  },
};

export async function login(email: string, _password?: string): Promise<{ user: User; token: string }> {
  try {
    const res = await api.post<{ access_token: string; user: User }>('/auth/login', { email, password: _password });
    if (res.status === 200 && res.data.access_token) {
      sessionStorage.setItem('chaindock_token', res.data.access_token);
      sessionStorage.setItem('chaindock_user', JSON.stringify(res.data.user));
      return { user: res.data.user, token: res.data.access_token };
    }
  } catch {
    // Backend offline: fallback to matching demo profile
  }

  // Find user by email or fallback to Investigator
  const foundRole = (Object.keys(DEMO_USERS) as Role[]).find(
    (r) => DEMO_USERS[r].email.toLowerCase() === email.toLowerCase()
  );
  const selectedUser = foundRole ? DEMO_USERS[foundRole] : DEMO_USERS.INVESTIGATOR;
  const mockToken = `mock_jwt_${selectedUser.role.toLowerCase()}_${Date.now()}`;

  sessionStorage.setItem('chaindock_token', mockToken);
  sessionStorage.setItem('chaindock_user', JSON.stringify(selectedUser));

  return { user: selectedUser, token: mockToken };
}

export function getCurrentUser(): User | null {
  const stored = sessionStorage.getItem('chaindock_user');
  if (stored) {
    try {
      return JSON.parse(stored);
    } catch {
      return null;
    }
  }
  return null;
}

export function logout(): void {
  sessionStorage.removeItem('chaindock_token');
  sessionStorage.removeItem('chaindock_user');
}

export async function getUsers(): Promise<User[]> {
  return Object.values(DEMO_USERS);
}

export const authService = {
  login,
  logout,
  getCurrentUser,
  getUsers,
  DEMO_USERS,
};
