import { api } from './api';
import { EvidenceItem } from '../types';

export function normalizeEvidence(e: any, fallback?: Partial<EvidenceItem>): EvidenceItem {
  let eventsList = Array.isArray(e?.custody_events)
    ? e.custody_events
    : Array.isArray(e?.custodyEvents)
    ? e.custodyEvents
    : Array.isArray(fallback?.custody_events)
    ? fallback.custody_events
    : [];

  return {
    id: String(e?.id || fallback?.id || ''),
    case_id: String(e?.case_id || e?.caseId || fallback?.case_id || ''),
    case_number: String(e?.case_number || e?.caseNumber || fallback?.case_number || 'CASE-2026'),
    item_number: String(e?.item_number || e?.itemNumber || fallback?.item_number || `EVI-${e?.id || 'ITEM'}`),
    name: String(e?.name || fallback?.name || 'Unnamed Evidence Exhibit'),
    category: String(e?.category || fallback?.category || 'PHYSICAL_EQUIPMENT'),
    description: String(e?.description || fallback?.description || ''),
    custodian: String(e?.custodian || fallback?.custodian || 'Evidence Custody Vault'),
    custodian_badge: String(e?.custodian_badge || e?.custodianBadge || fallback?.custodian_badge || 'POL-VAULT'),
    location: String(e?.location || fallback?.location || 'Central Evidence Locker'),
    sealed_at: String(e?.sealed_at || e?.sealedAt || fallback?.sealed_at || new Date().toISOString()),
    chain_hash: String(e?.chain_hash || e?.chainHash || fallback?.chain_hash || 'genesis_seal_0x1044'),
    status: (e?.status as EvidenceItem['status']) || fallback?.status || 'SECURE_VAULT',
    custody_events: eventsList,
  };
}

export async function getEvidence(caseId?: string): Promise<EvidenceItem[]> {
  const url = caseId ? `/cases/${caseId}/evidence` : '/evidence';
  const res = await api.get<EvidenceItem[] | { evidence: EvidenceItem[] } | { data: EvidenceItem[] } | { items: EvidenceItem[] } | { results: EvidenceItem[] }>(url);
  let rawList: any[] = [];
  if (Array.isArray(res.data)) {
    rawList = res.data;
  } else if (res.data && typeof res.data === 'object') {
    const d = res.data as Record<string, unknown>;
    if (Array.isArray(d.evidence)) {
      rawList = d.evidence;
    } else if (Array.isArray(d.data)) {
      rawList = d.data;
    } else if (Array.isArray(d.items)) {
      rawList = d.items;
    } else if (Array.isArray(d.results)) {
      rawList = d.results;
    }
  }
  return rawList.map((item) => normalizeEvidence(item));
}

export async function getEvidenceById(id: string): Promise<EvidenceItem | null> {
  const res = await api.get<EvidenceItem | { evidence: EvidenceItem } | { data: EvidenceItem }>(`/evidence/${id}`);
  if (res.data && typeof res.data === 'object') {
    const raw = 'evidence' in res.data ? (res.data as any).evidence : 'data' in res.data ? (res.data as any).data : res.data;
    return normalizeEvidence(raw);
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
  const payload = {
    ...data,
    caseId: data.case_id,
    itemNumber: data.item_number,
  };

  let res;
  try {
    res = await api.post<EvidenceItem | { evidence: EvidenceItem } | { data: EvidenceItem }>(
      `/cases/${data.case_id}/evidence`,
      payload
    );
  } catch (err: any) {
    if (err?.status === 404) {
      res = await api.post<EvidenceItem | { evidence: EvidenceItem } | { data: EvidenceItem }>(
        '/evidence',
        payload
      );
    } else {
      throw err;
    }
  }

  if (res.data && typeof res.data === 'object') {
    const raw = 'evidence' in res.data ? (res.data as any).evidence : 'data' in res.data ? (res.data as any).data : res.data;
    return normalizeEvidence(raw, data as Partial<EvidenceItem>);
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
  const payload = {
    ...data,
    newCustodian: data.new_custodian,
  };

  const res = await api.post<EvidenceItem | { evidence: EvidenceItem }>(
    `/evidence/${evidenceId}/transfer`,
    payload
  );
  if (res.data && typeof res.data === 'object') {
    const raw = 'evidence' in res.data ? (res.data as any).evidence : res.data;
    return normalizeEvidence(raw);
  }
  return null;
}

export const evidenceService = {
  getEvidence,
  getEvidenceById,
  createEvidence,
  transferCustody,
  normalizeEvidence,
};
