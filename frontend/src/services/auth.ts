import { api } from './api';
import { User, Role } from '../types';

interface LoginResponse {
  access_token?: string;
  token?: string;
  accessToken?: string;
  jwt?: string;
  user?: User;
  data?: any;
  [key: string]: any;
}

export function normalizeAuthUser(rawUser: any, fallbackEmail?: string): User {
  if (!rawUser || typeof rawUser !== 'object') {
    return {
      id: 'usr-1',
      email: fallbackEmail || '',
      name: fallbackEmail ? fallbackEmail.split('@')[0] : 'Authorized Officer',
      role: 'INVESTIGATOR',
    };
  }

  const roleUpper = String(rawUser.role || 'INVESTIGATOR').toUpperCase() as Role;
  const email = String(rawUser.email || fallbackEmail || '');
  const derivedName =
    rawUser.name ||
    (email
      ? email.split('@')[0].replace(/[._-]/g, ' ')
      : roleUpper === 'ADMIN'
      ? 'Chief Registrar (Admin)'
      : roleUpper === 'SUPERVISOR'
      ? 'Supervising Officer'
      : 'Investigating Officer');

  return {
    id: String(rawUser.id || rawUser.userId || rawUser.user_id || ''),
    email,
    name: derivedName,
    role: roleUpper,
    badgeNumber: rawUser.badgeNumber || rawUser.badge_number || (roleUpper === 'ADMIN' ? 'ADM-01' : 'POL-2026'),
    badge_number: rawUser.badge_number || rawUser.badgeNumber || (roleUpper === 'ADMIN' ? 'ADM-01' : 'POL-2026'),
    jurisdictionNode: rawUser.jurisdictionNode || rawUser.jurisdiction_node || 'Node Alpha',
    jurisdiction_node: rawUser.jurisdiction_node || rawUser.jurisdictionNode || 'Node Alpha',
    status: rawUser.status === 'SUSPENDED' ? 'SUSPENDED' : 'ACTIVE',
  };
}

export async function login(email: string, password?: string): Promise<{ user: User; token: string }> {
  const cleanEmail = email.trim();
  const res = await api.post<LoginResponse>('/auth/login', { email: cleanEmail, password });
  
  const token =
    res.data?.access_token ||
    res.data?.token ||
    res.data?.accessToken ||
    res.data?.jwt;

  // Support both { token, user: { ... } } and { token, id, role, ... } or { data: { token, user } }
  const rawUserData =
    res.data?.user ||
    res.data?.data?.user ||
    (res.data && typeof res.data === 'object' && ('email' in res.data || 'role' in res.data) ? res.data : null);

  if (token) {
    const user = normalizeAuthUser(rawUserData || {}, cleanEmail);
    sessionStorage.setItem('chaindock_token', token);
    sessionStorage.setItem('chaindock_user', JSON.stringify(user));
    localStorage.setItem('chaindock_token', token);
    localStorage.setItem('chaindock_user', JSON.stringify(user));
    return { user, token };
  }

  if (rawUserData) {
    const user = normalizeAuthUser(rawUserData, cleanEmail);
    sessionStorage.setItem('chaindock_token', 'session-active');
    sessionStorage.setItem('chaindock_user', JSON.stringify(user));
    localStorage.setItem('chaindock_token', 'session-active');
    localStorage.setItem('chaindock_user', JSON.stringify(user));
    return { user, token: 'session-active' };
  }

  throw new Error('Authentication failed: Invalid response from backend.');
}

export function getCurrentUser(): User | null {
  const stored = sessionStorage.getItem('chaindock_user') || localStorage.getItem('chaindock_user');
  if (stored) {
    try {
      const u = JSON.parse(stored);
      if (u) {
        return normalizeAuthUser(u);
      }
      return null;
    } catch {
      return null;
    }
  }
  return null;
}

export function logout(): void {
  sessionStorage.removeItem('chaindock_token');
  sessionStorage.removeItem('chaindock_user');
  localStorage.removeItem('chaindock_token');
  localStorage.removeItem('chaindock_user');
}

export async function getUsers(): Promise<User[]> {
  const res = await api.get<User[] | { users: User[] }>('/users');
  if (Array.isArray(res.data)) {
    return res.data;
  }
  if (res.data && typeof res.data === 'object' && 'users' in res.data && Array.isArray((res.data as { users: User[] }).users)) {
    return (res.data as { users: User[] }).users;
  }
  return [];
}

export const authService = {
  login,
  logout,
  getCurrentUser,
  getUsers,
};
