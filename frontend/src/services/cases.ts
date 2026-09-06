import { api } from './api';
import { Case, Priority, CaseStatus } from '../types';

export async function getCases(): Promise<Case[]> {
  const res = await api.get<Case[] | { cases: Case[] } | { data: Case[] }>('/cases');
  if (Array.isArray(res.data)) {
    return res.data;
  }
  if (res.data && typeof res.data === 'object') {
    if ('cases' in res.data && Array.isArray((res.data as { cases: Case[] }).cases)) {
      return (res.data as { cases: Case[] }).cases;
    }
    if ('data' in res.data && Array.isArray((res.data as { data: Case[] }).data)) {
      return (res.data as { data: Case[] }).data;
    }
  }
  return [];
}

export async function getCaseById(id: string): Promise<Case | null> {
  const res = await api.get<Case | { case: Case } | { data: Case }>(`/cases/${id}`);
  if (res.data && typeof res.data === 'object') {
    if ('case' in res.data) {
      return (res.data as { case: Case }).case;
    }
    if ('data' in res.data) {
      return (res.data as { data: Case }).data;
    }
    return res.data as Case;
  }
  return null;
}

export async function createCase(data: {
  title: string;
  case_number: string;
  description: string;
  priority: Priority;
  jurisdiction: string;
  lead_officer: string;
}): Promise<Case> {
  const res = await api.post<Case | { case: Case } | { data: Case }>('/cases', data);
  if (res.data && typeof res.data === 'object') {
    if ('case' in res.data) {
      return (res.data as { case: Case }).case;
    }
    if ('data' in res.data) {
      return (res.data as { data: Case }).data;
    }
    return res.data as Case;
  }
  throw new Error('Failed to create case: Invalid response from backend');
}

export async function updateCaseStatus(caseId: string, status: CaseStatus): Promise<Case | null> {
  const res = await api.patch<Case | { case: Case }>(`/cases/${caseId}/status`, { status });
  if (res.data && typeof res.data === 'object') {
    if ('case' in res.data) {
      return (res.data as { case: Case }).case;
    }
    return res.data as Case;
  }
  return null;
}

export const casesService = {
  getCases,
  getCaseById,
  createCase,
  updateCaseStatus,
};
