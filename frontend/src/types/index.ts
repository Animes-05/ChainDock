export type Role = 'INVESTIGATOR' | 'SUPERVISOR' | 'ADMIN';
export type UserRole = Role;

export type CaseStatus = 'DRAFT' | 'ACTIVE' | 'UNDER_REVIEW' | 'COURT_PROCEEDINGS' | 'CLOSED' | 'ARCHIVED';

export type Priority = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

export type IntegrityStatus = 'VERIFIED' | 'TAMPERED' | 'INVALID' | 'PENDING' | 'UNAVAILABLE';

export type SignatureStatus = 'VALID' | 'INVALID' | 'UNSIGNED';

export interface User {
  id: string;
  email: string;
  name: string;
  role: Role;
  badgeNumber?: string;
  badge_number?: string;
  department?: string;
  jurisdictionNode?: string;
  jurisdiction_node?: string;
  publicKey?: string;
  public_key?: string;
  status?: 'ACTIVE' | 'SUSPENDED';
  assignedCasesCount?: number;
  avatarUrl?: string;
  created_at?: string;
}

export interface CreateUserPayload {
  name: string;
  email: string;
  role: Role;
  badge_number?: string;
  department?: string;
  jurisdiction_node?: string;
  password?: string;
}

export interface UpdateUserPayload {
  name?: string;
  email?: string;
  role?: Role;
  badge_number?: string;
  department?: string;
  jurisdiction_node?: string;
  status?: 'ACTIVE' | 'SUSPENDED';
}

export interface KeyEnclaveDetails {
  userId: string;
  userName: string;
  badgeNumber: string;
  publicKey: string;
  algorithm: string;
  curve: string;
  keyEnclaveId: string;
  fipsLevel: string;
  createdAt: string;
  status: 'ACTIVE' | 'REVOKED';
}

export interface Case {
  id: string;
  case_number: string;
  title: string;
  description: string;
  status: CaseStatus;
  priority: Priority;
  jurisdiction: string;
  lead_officer: string;
  lead_officer_id?: string;
  lead_officer_badge?: string;
  supervisor: string;
  created_by: string;
  created_at: string;
  updated_at: string;
  document_count: number;
  evidence_count: number;
  merkle_status: string;
  merkle_last_checked: string;
}

export interface DocumentVersion {
  version: number;
  timestamp: string;
  sha256: string;
  uploaded_by: string;
  notes?: string;
}

export interface Document {
  id: string;
  case_id: string;
  case_number?: string;
  title: string;
  document_type: string;
  description: string;
  version: number;
  sha256: string;
  original_sha256: string;
  is_tampered: boolean;
  tamper_offset?: string;
  integrity_status: IntegrityStatus;
  signature_status: SignatureStatus;
  signer_name?: string;
  signer_key?: string;
  signed_at?: string;
  uploaded_by: string;
  file_size: string;
  file_type: string;
  classification: string;
  legal_docket_ref?: string;
  created_at: string;
  versions: DocumentVersion[];
}

export interface CustodyEvent {
  id: string;
  timestamp: string;
  actor: string;
  role: Role;
  action: string;
  prev_custodian: string;
  new_custodian: string;
  location: string;
  notes: string;
  tx_hash: string;
}

export interface EvidenceItem {
  id: string;
  case_id: string;
  case_number: string;
  item_number: string;
  name: string;
  category: string;
  description: string;
  custodian: string;
  custodian_badge: string;
  location: string;
  sealed_at: string;
  chain_hash: string;
  status: 'SECURE_VAULT' | 'IN_TRANSIT' | 'COURT_EXHIBIT' | 'ANALYSIS';
  custody_events: CustodyEvent[];
}

export interface AuditEvent {
  id: string;
  block_number: number;
  timestamp: string;
  actor: string;
  role: Role;
  action: string;
  target_reference: string;
  prev_hash: string;
  entry_hash: string;
  status: 'VALID' | 'TAMPERED';
}

export interface AuditVerificationResult {
  valid: boolean;
  total_entries: number;
  checked_entries: number;
  failed_entry_id?: string;
  failed_block_number?: number;
  reason?: string;
  latency_ms: number;
  witness_nodes_online: number;
  witness_nodes_total: number;
}
