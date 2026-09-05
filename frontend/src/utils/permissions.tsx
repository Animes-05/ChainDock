import { Role } from '../types';

export const PERMISSIONS = {
  CAN_VIEW_CASES: ['INVESTIGATOR', 'SUPERVISOR', 'ADMIN'] as Role[],
  CAN_CREATE_CASE: ['INVESTIGATOR', 'SUPERVISOR', 'ADMIN'] as Role[],
  CAN_VIEW_DOCUMENTS: ['INVESTIGATOR', 'SUPERVISOR', 'ADMIN'] as Role[],
  CAN_UPLOAD_DOCUMENT: ['INVESTIGATOR', 'SUPERVISOR', 'ADMIN'] as Role[],
  CAN_DOWNLOAD_DOCUMENT: ['INVESTIGATOR', 'SUPERVISOR', 'ADMIN'] as Role[],
  CAN_FINALIZE_DOCUMENT: ['SUPERVISOR', 'ADMIN'] as Role[],
  CAN_SIGN_DOCUMENT: ['SUPERVISOR', 'ADMIN'] as Role[],
  CAN_VERIFY_DOCUMENT: ['INVESTIGATOR', 'SUPERVISOR', 'ADMIN'] as Role[],
  CAN_VIEW_EVIDENCE: ['INVESTIGATOR', 'SUPERVISOR', 'ADMIN'] as Role[],
  CAN_TRANSFER_CUSTODY: ['INVESTIGATOR', 'SUPERVISOR', 'ADMIN'] as Role[],
  CAN_VIEW_AUDIT: ['SUPERVISOR', 'ADMIN'] as Role[],
  CAN_RUN_CHAIN_VERIFICATION: ['SUPERVISOR', 'ADMIN'] as Role[],
  CAN_MANAGE_USERS: ['ADMIN'] as Role[],
  CAN_VIEW_SECURITY_CENTER: ['SUPERVISOR', 'ADMIN'] as Role[],
};

export function hasPermission(role: Role | undefined, allowedRoles: Role[]): boolean {
  if (!role) return false;
  return allowedRoles.includes(role);
}

export function canFinalize(role?: Role): boolean {
  return hasPermission(role, PERMISSIONS.CAN_FINALIZE_DOCUMENT);
}

export function canSign(role?: Role): boolean {
  return hasPermission(role, PERMISSIONS.CAN_SIGN_DOCUMENT);
}

export function canVerifyChain(role?: Role): boolean {
  return hasPermission(role, PERMISSIONS.CAN_RUN_CHAIN_VERIFICATION);
}

export function canManageUsers(role?: Role): boolean {
  return hasPermission(role, PERMISSIONS.CAN_MANAGE_USERS);
}
