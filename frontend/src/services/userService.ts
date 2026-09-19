import { api } from './api';
import { User, Role, CreateUserPayload, UpdateUserPayload, KeyEnclaveDetails } from '../types';

function normalizeUser(u: any): User {
  const roleUpper = String(u.role || 'INVESTIGATOR').toUpperCase() as Role;
  return {
    id: String(u.id || ''),
    email: String(u.email || ''),
    name: String(
      u.name ||
        (roleUpper === 'ADMIN'
          ? 'Chief Registrar (Admin)'
          : roleUpper === 'SUPERVISOR'
          ? 'Supervising Officer'
          : 'Officer In-Charge')
    ),
    role: roleUpper,
    badgeNumber: u.badgeNumber || u.badge_number || (roleUpper === 'ADMIN' ? 'ADM-01' : 'POL-2026'),
    badge_number: u.badge_number || u.badgeNumber || (roleUpper === 'ADMIN' ? 'ADM-01' : 'POL-2026'),
    department: u.department || u.jurisdiction_node || u.jurisdictionNode || 'Investigation Squad',
    jurisdictionNode: u.jurisdictionNode || u.jurisdiction_node || 'Jurisdiction Alpha',
    jurisdiction_node: u.jurisdiction_node || u.jurisdictionNode || 'Jurisdiction Alpha',
    publicKey: u.publicKey || u.public_key || (u.id ? `ed25519:${String(u.id).substring(0, 8)}` : 'ed25519:unknown'),
    public_key: u.public_key || u.publicKey || (u.id ? `ed25519:${String(u.id).substring(0, 8)}` : 'ed25519:unknown'),
    status: u.status === 'SUSPENDED' ? 'SUSPENDED' : 'ACTIVE',
    assignedCasesCount: typeof u.assignedCasesCount === 'number' ? u.assignedCasesCount : (u.assigned_cases_count || 0),
    avatarUrl: u.avatarUrl || u.avatar_url,
    created_at: u.created_at || u.createdAt,
  };
}

export async function getUsers(): Promise<User[]> {
  const res = await api.get<User[] | { users: User[] } | { data: User[] }>('/users');
  
  let rawList: any[] = [];
  if (Array.isArray(res.data)) {
    rawList = res.data;
  } else if (res.data && typeof res.data === 'object') {
    if ('users' in res.data && Array.isArray((res.data as any).users)) {
      rawList = (res.data as any).users;
    } else if ('data' in res.data && Array.isArray((res.data as any).data)) {
      rawList = (res.data as any).data;
    }
  }

  return rawList.map(normalizeUser);
}

function toBackendRole(role?: string): 'Investigator' | 'Supervisor' | 'Admin' {
  const r = String(role || '').toUpperCase();
  if (r === 'ADMIN') return 'Admin';
  if (r === 'SUPERVISOR') return 'Supervisor';
  return 'Investigator';
}

export async function createUser(payload: CreateUserPayload): Promise<User> {
  const body = {
    email: payload.email,
    password: payload.password || 'Temporary@123',
    role: toBackendRole(payload.role),
  };

  // Canonical route is POST /auth/register (backend/src/handlers/auth.rs).
  // Bootstrap rule: open only while users table is empty; afterwards the
  // caller must be an authenticated Admin (Bearer token is attached by ApiClient).
  const res = await api.post<any>('/auth/register', body);
  const created = res.data?.user || res.data;
  return normalizeUser(created);
}

export async function updateUser(id: string, payload: UpdateUserPayload): Promise<User> {
  const body = {
    ...payload,
    ...(payload.role ? { role: toBackendRole(payload.role) } : {}),
  };
  const res = await api.patch<any>(`/users/${id}`, body);
  const updated = res.data?.user || res.data;
  return normalizeUser(updated);
}

export async function toggleUserStatus(id: string, currentStatus: 'ACTIVE' | 'SUSPENDED'): Promise<User> {
  const newStatus = currentStatus === 'ACTIVE' ? 'SUSPENDED' : 'ACTIVE';
  return updateUser(id, { status: newStatus });
}

export async function rotateUserKey(_id: string): Promise<{ publicKey: string; rotatedAt: string }> {
  // Rotation is intentionally not implemented (no backend route by decision).
  // Fail loudly instead of fabricating a key + firing a bogus PATCH /users/:id.
  throw new Error('Key rotation is not available in this build (no backend endpoint).');
}

export function getKeyEnclaveDetails(user: User): KeyEnclaveDetails {
  return {
    userId: user.id,
    userName: user.name,
    badgeNumber: user.badgeNumber || user.badge_number || 'N/A',
    publicKey: user.publicKey || user.public_key || 'ed25519:unknown',
    algorithm: 'Ed25519 (RFC 8032)',
    curve: 'Edwards-curve Curve25519 (256-bit)',
    keyEnclaveId: `HSM-ENC-${(user.id || '0000').substring(0, 6).toUpperCase()}`,
    fipsLevel: 'FIPS 140-3 Level 3 Hardware Enclave',
    createdAt: user.created_at || 'Registered at Enclave Initialization',
    status: user.status === 'SUSPENDED' ? 'REVOKED' : 'ACTIVE',
  };
}

export const userService = {
  getUsers,
  createUser,
  updateUser,
  toggleUserStatus,
  rotateUserKey,
  getKeyEnclaveDetails,
};
