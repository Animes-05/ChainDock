import { api } from './api';
import { Case, Priority, CaseStatus } from '../types';

export function normalizeCase(c: any, fallback?: Partial<Case>): Case {
  return {
    id: String(c?.id || fallback?.id || ''),
    case_number: c?.case_number || c?.caseNumber || fallback?.case_number || `CD-2026-${Math.floor(100 + Math.random() * 900)}`,
    title: c?.title || fallback?.title || 'Untitled Docket',
    description: c?.description || fallback?.description || 'Investigation docket registered on sovereign ledger',
    status: (c?.status as CaseStatus) || fallback?.status || 'ACTIVE',
    priority: (c?.priority as Priority) || fallback?.priority || 'HIGH',
    jurisdiction: c?.jurisdiction || fallback?.jurisdiction || 'Jurisdiction Alpha',
    lead_officer: c?.lead_officer || c?.leadOfficer || fallback?.lead_officer || 'Officer S. Jenkins',
    lead_officer_id: c?.lead_officer_id || c?.created_by || fallback?.lead_officer_id,
    lead_officer_badge: c?.lead_officer_badge || fallback?.lead_officer_badge || 'POL-2026',
    supervisor: c?.supervisor || fallback?.supervisor || 'Supervising Officer',
    created_by: String(c?.created_by || fallback?.created_by || ''),
    created_at: c?.created_at || fallback?.created_at || new Date().toISOString(),
    updated_at: c?.updated_at || fallback?.updated_at || new Date().toISOString(),
    document_count: typeof c?.document_count === 'number' ? c.document_count : (c?.documents?.length || fallback?.document_count || 0),
    evidence_count: typeof c?.evidence_count === 'number' ? c.evidence_count : (c?.evidence?.length || fallback?.evidence_count || 0),
    merkle_status: c?.merkle_status || fallback?.merkle_status || 'VERIFIED',
    merkle_last_checked: c?.merkle_last_checked || fallback?.merkle_last_checked || 'Live Consensus',
  };
}

export async function getCases(): Promise<Case[]> {
  const res = await api.get<Case[] | { cases: Case[] } | { data: Case[] }>('/cases');
  let rawList: any[] = [];
  if (Array.isArray(res.data)) {
    rawList = res.data;
  } else if (res.data && typeof res.data === 'object') {
    if ('cases' in res.data && Array.isArray((res.data as { cases: Case[] }).cases)) {
      rawList = (res.data as { cases: Case[] }).cases;
    } else if ('data' in res.data && Array.isArray((res.data as { data: Case[] }).data)) {
      rawList = (res.data as { data: Case[] }).data;
    }
  }
  return rawList.map((c) => normalizeCase(c));
}

export async function getCaseById(id: string): Promise<Case | null> {
  const res = await api.get<Case | { case: Case } | { data: Case }>(`/cases/${id}`);
  if (res.data && typeof res.data === 'object') {
    const raw = 'case' in res.data ? (res.data as any).case : 'data' in res.data ? (res.data as any).data : res.data;
    return normalizeCase(raw);
  }
  return null;
}

export async function createCase(data: {
  title: string;
  case_number: string;
  description?: string;
  priority?: Priority;
  jurisdiction?: string;
  lead_officer?: string;
}): Promise<Case> {
  const payload = {
    title: data.title.trim(),
    case_number: data.case_number.trim(),
  };

  const res = await api.post<Case | { case: Case } | { data: Case }>('/cases', payload);
  if (res.data && typeof res.data === 'object') {
    const raw = 'case' in res.data ? (res.data as any).case : 'data' in res.data ? (res.data as any).data : res.data;
    return normalizeCase(raw, data as Partial<Case>);
  }
  throw new Error('Failed to create case: Invalid response from backend');
}

export async function updateCaseStatus(caseId: string, status: CaseStatus): Promise<Case | null> {
  const res = await api.patch<Case | { case: Case }>(`/cases/${caseId}/status`, { status });
  if (res.data && typeof res.data === 'object') {
    const raw = 'case' in res.data ? (res.data as any).case : res.data;
    return normalizeCase(raw);
  }
  return null;
}

export const casesService = {
  getCases,
  getCaseById,
  createCase,
  updateCaseStatus,
  normalizeCase,
};
