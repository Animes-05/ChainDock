import { api } from './api';
import { Case, Priority, CaseStatus } from '../types';

export const INITIAL_CASES: Case[] = [
  {
    id: 'cd-case-0412',
    case_number: 'FIR-2026-DL-0412',
    title: 'Multi-State Consortium Financial Embezzlement & Cyber Laundering',
    description: 'Evidentiary docket documenting ₹142 Cr fraudulent diversion across 14 layered shell accounts, falsified RTGS mandates, encrypted server memory dumps, and Section 65B electronic certificates.',
    status: 'ACTIVE',
    priority: 'HIGH',
    jurisdiction: 'Special Cyber Crime Cell, New Delhi',
    lead_officer: 'Insp. Rajesh Sharma',
    lead_officer_id: 'usr-inv-4029',
    lead_officer_badge: 'INSP-4029',
    supervisor: 'ACP Meera Sen',
    created_by: 'usr-inv-4029',
    created_at: '2026-08-20T08:30:00Z',
    updated_at: '2026-09-05T11:00:00Z',
    document_count: 24,
    evidence_count: 8,
    merkle_status: 'HASH_OK · 9m',
    merkle_last_checked: '9m ago',
  },
  {
    id: 'cd-case-0188',
    case_number: 'FIR-2026-MH-0188',
    title: 'Organized Extortion & Cross-District Kidnapping Syndicate',
    description: 'Intercepted encrypted VoIP call logs, seized hauler GPS transponder telemetry, ransom courier financial records, and key witness depositions recorded under Section 161 CrPC.',
    status: 'COURT_PROCEEDINGS',
    priority: 'CRITICAL',
    jurisdiction: 'Sessions Court Division III, Mumbai',
    lead_officer: 'Insp. Vikram Rao',
    lead_officer_id: 'usr-inv-5102',
    lead_officer_badge: 'INSP-5102',
    supervisor: 'ACP Meera Sen',
    created_by: 'usr-inv-5102',
    created_at: '2026-07-14T14:15:00Z',
    updated_at: '2026-09-04T16:30:00Z',
    document_count: 42,
    evidence_count: 12,
    merkle_status: 'HASH_OK · 45m',
    merkle_last_checked: '45m ago',
  },
  {
    id: 'cd-case-0751',
    case_number: 'FIR-2026-KA-0751',
    title: 'Critical Grid Infrastructure Cyber Intrusion & SCADA Espionage',
    description: 'Central State Power Grid data center intrusion. Bitstream raw forensic disk images, firewall bypass access logs, malware reverse engineering binaries, and CFSL cyber forensic certificates.',
    status: 'UNDER_REVIEW',
    priority: 'HIGH',
    jurisdiction: 'Cyber Crime Investigation Bureau, Bengaluru',
    lead_officer: 'Dr. Anand Verma (Forensics)',
    lead_officer_id: 'usr-inv-6601',
    lead_officer_badge: 'CFSL-812',
    supervisor: 'Director Arvind Kumar',
    created_by: 'usr-inv-6601',
    created_at: '2026-08-05T10:00:00Z',
    updated_at: '2026-09-03T09:20:00Z',
    document_count: 31,
    evidence_count: 14,
    merkle_status: 'HASH_OK · 2h',
    merkle_last_checked: '2h ago',
  },
  {
    id: 'cd-case-0329',
    case_number: 'FIR-2026-WB-0329',
    title: 'Cross-Border Narcotics Trafficking & Arms Consignment Seizure',
    description: 'National Highway intercept operation. Seizure panchnama, ballistic spectroscopy reports of confiscated unregistered firearms, chemical purity assay from CFSL, and magistrate remand applications.',
    status: 'ACTIVE',
    priority: 'MEDIUM',
    jurisdiction: 'Special Task Force (STF), Kolkata',
    lead_officer: 'Insp. Rajesh Sharma',
    lead_officer_id: 'usr-inv-4029',
    lead_officer_badge: 'INSP-4029',
    supervisor: 'ACP Meera Sen',
    created_by: 'usr-inv-4029',
    created_at: '2026-08-28T04:20:00Z',
    updated_at: '2026-09-05T08:14:00Z',
    document_count: 18,
    evidence_count: 9,
    merkle_status: 'HASH_OK · 14m',
    merkle_last_checked: '14m ago',
  },
];

let localCases: Case[] = [...INITIAL_CASES];

export async function getCases(): Promise<Case[]> {
  try {
    const res = await api.get<Case[]>('/cases');
    if (res.status === 200 && Array.isArray(res.data) && res.data.length > 0) {
      return res.data;
    }
  } catch {
    // Backend offline: use local state
  }
  return localCases;
}

export async function getCaseById(id: string): Promise<Case | null> {
  try {
    const res = await api.get<Case>(`/cases/${id}`);
    if (res.status === 200 && res.data) {
      return res.data;
    }
  } catch {
    // Backend offline
  }
  const found = localCases.find((c) => c.id === id || c.case_number.toLowerCase() === id.toLowerCase());
  return found || null;
}

export async function createCase(data: {
  title: string;
  case_number: string;
  description: string;
  priority: Priority;
  jurisdiction: string;
  lead_officer: string;
}): Promise<Case> {
  const newCase: Case = {
    id: `cd-case-${Date.now()}`,
    case_number: data.case_number || `FIR-2026-GEN-${Math.floor(1000 + Math.random() * 9000)}`,
    title: data.title,
    description: data.description,
    status: 'ACTIVE',
    priority: data.priority,
    jurisdiction: data.jurisdiction,
    lead_officer: data.lead_officer,
    lead_officer_id: 'usr-inv-4029',
    lead_officer_badge: 'INSP-4029',
    supervisor: 'ACP Meera Sen',
    created_by: 'usr-inv-4029',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    document_count: 1,
    evidence_count: 0,
    merkle_status: 'HASH_OK · Just now',
    merkle_last_checked: 'Just now',
  };

  try {
    const res = await api.post<Case>('/cases', newCase);
    if (res.status === 201 && res.data) {
      localCases.unshift(res.data);
      return res.data;
    }
  } catch {
    // Backend offline
  }

  localCases.unshift(newCase);
  return newCase;
}

export async function updateCaseStatus(caseId: string, status: CaseStatus): Promise<Case | null> {
  const c = localCases.find((item) => item.id === caseId);
  if (c) {
    c.status = status;
    c.updated_at = new Date().toISOString();
    return { ...c };
  }
  return null;
}

export const casesService = {
  getCases,
  getCaseById,
  createCase,
  updateCaseStatus,
  INITIAL_CASES,
};
