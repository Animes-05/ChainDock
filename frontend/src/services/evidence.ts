import { api } from './api';
import { EvidenceItem } from '../types';

export async function getEvidence(caseId?: string): Promise<EvidenceItem[]> {
  const url = caseId ? `/cases/${caseId}/evidence` : '/evidence';
  const res = await api.get<EvidenceItem[] | { evidence: EvidenceItem[] } | { data: EvidenceItem[] }>(url);
  if (Array.isArray(res.data)) {
    return res.data;
  }
  if (res.data && typeof res.data === 'object') {
    if ('evidence' in res.data && Array.isArray((res.data as { evidence: EvidenceItem[] }).evidence)) {
      return (res.data as { evidence: EvidenceItem[] }).evidence;
    }
    if ('data' in res.data && Array.isArray((res.data as { data: EvidenceItem[] }).data)) {
      return (res.data as { data: EvidenceItem[] }).data;
    }
  }
  return [];
}

export async function getEvidenceById(id: string): Promise<EvidenceItem | null> {
  const res = await api.get<EvidenceItem | { evidence: EvidenceItem } | { data: EvidenceItem }>(`/evidence/${id}`);
  if (res.data && typeof res.data === 'object') {
    if ('evidence' in res.data) {
      return (res.data as { evidence: EvidenceItem }).evidence;
    }
    if ('data' in res.data) {
      return (res.data as { data: EvidenceItem }).data;
    }
    return res.data as EvidenceItem;
  }
  return null;
}

export async function createEvidence(data: {
  case_id: string;
  item_number: string;
  name: string;
  category: string;
  description: string;
  location: string;
}): Promise<EvidenceItem> {
  const res = await api.post<EvidenceItem | { evidence: EvidenceItem } | { data: EvidenceItem }>(
    `/cases/${data.case_id}/evidence`,
    data
  );
  if (res.data && typeof res.data === 'object') {
    if ('evidence' in res.data) {
      return (res.data as { evidence: EvidenceItem }).evidence;
    }
    if ('data' in res.data) {
      return (res.data as { data: EvidenceItem }).data;
    }
    return res.data as EvidenceItem;
  }
  throw new Error('Failed to register evidence: Invalid backend response');
}

export async function transferCustody(
  evidenceId: string,
  data: {
    actor: string;
    new_custodian: string;
    location: string;
    notes: string;
  }
): Promise<EvidenceItem | null> {
  const res = await api.post<EvidenceItem | { evidence: EvidenceItem }>(
    `/evidence/${evidenceId}/transfer`,
    data
  );
  if (res.data && typeof res.data === 'object') {
    if ('evidence' in res.data) {
      return (res.data as { evidence: EvidenceItem }).evidence;
    }
    return res.data as EvidenceItem;
  }
  return null;
}

export const evidenceService = {
  getEvidence,
  getEvidenceById,
  createEvidence,
  transferCustody,
};
