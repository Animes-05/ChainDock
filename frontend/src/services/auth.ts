import { api } from './api';
import { User } from '../types';

interface LoginResponse {
  access_token?: string;
  token?: string;
  user: User;
}

export async function login(email: string, password?: string): Promise<{ user: User; token: string }> {
  const res = await api.post<LoginResponse>('/auth/login', { email, password });
  const token = res.data?.access_token || res.data?.token;

  if (token && res.data?.user) {
    sessionStorage.setItem('chaindock_token', token);
    sessionStorage.setItem('chaindock_user', JSON.stringify(res.data.user));
    return { user: res.data.user, token };
  }

  throw new Error('Authentication failed: Invalid response from backend.');
}

export function getCurrentUser(): User | null {
  const stored = sessionStorage.getItem('chaindock_user') || localStorage.getItem('chaindock_user');
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
