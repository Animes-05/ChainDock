import { api } from './api';
import { EvidenceItem } from '../types';

export const INITIAL_EVIDENCE: EvidenceItem[] = [
  {
    id: 'ev-0412-01',
    case_id: 'cd-case-0412',
    case_number: 'FIR-2026-DL-0412',
    item_number: 'EVD-0412-01',
    name: 'Seagate Exos 8TB Enterprise Server NVMe SSD',
    category: 'DIGITAL_HARDWARE',
    description: 'Hardware drive extracted from Rack 4, Core Transaction Server. Hardware serial: SGH8829012. Sealed inside anti-static tamper-evident evidence pouch.',
    custodian: 'Insp. Rajesh Sharma',
    custodian_badge: 'INSP-4029',
    location: 'Cyber Crime Secure Vault B-12',
    sealed_at: '2026-08-20T12:00:00Z',
    chain_hash: '9f82bc41aa72190bc412093e8f4a3c19e83b271d49a02fb7d4a98072e912bc34',
    status: 'SECURE_VAULT',
    custody_events: [
      {
        id: 'cust-01',
        timestamp: '2026-08-20T12:00:00Z',
        actor: 'Insp. Rajesh Sharma',
        role: 'INVESTIGATOR',
        action: 'INITIAL_SEIZURE',
        prev_custodian: 'Data Center Admin',
        new_custodian: 'Insp. Rajesh Sharma',
        location: 'Data Center Site, Sector 62',
        notes: 'Physical recovery memo executed on-site with tamper seal #77291',
        tx_hash: '7c9a4e21b8f041d8e19c00bc8f192b027c9a4e21b8f041d8e19c00bc8f192b02',
      },
      {
        id: 'cust-02',
        timestamp: '2026-08-21T09:30:00Z',
        actor: 'Insp. Rajesh Sharma',
        role: 'INVESTIGATOR',
        action: 'VAULT_DEPOSIT',
        prev_custodian: 'Insp. Rajesh Sharma',
        new_custodian: 'Head Constable (Malkhana Custodian)',
        location: 'Cyber Crime Secure Vault B-12',
        notes: 'Deposit into humidity-controlled evidence locker. Seal verified intact.',
        tx_hash: '98cf611e038890ae448c901e892cfa7198cf611e038890ae448c901e892cfa71',
      },
    ],
  },
  {
    id: 'ev-0412-02',
    case_id: 'cd-case-0412',
    case_number: 'FIR-2026-DL-0412',
    item_number: 'EVD-0412-02',
    name: 'Bitstream E01 Forensic Image on Write-Blocked Storage',
    category: 'DIGITAL_FORENSICS',
    description: 'Hardware write-blocked clone of physical drive EVD-0412-01. SHA-256 verified identical to physical source drive prior to forensic lab processing.',
    custodian: 'Dr. Anand Verma (Forensics)',
    custodian_badge: 'CFSL-812',
    location: 'CFSL Cyber Forensic Analysis Lab',
    sealed_at: '2026-08-22T15:30:00Z',
    chain_hash: '3d07e21a8a25c1109a1cbdf32115391a7812903bbca012901239841289304123',
    status: 'ANALYSIS',
    custody_events: [
      {
        id: 'cust-03',
        timestamp: '2026-08-22T15:30:00Z',
        actor: 'Dr. Anand Verma',
        role: 'INVESTIGATOR',
        action: 'TRANSFER_FOR_ANALYSIS',
        prev_custodian: 'Head Constable (Malkhana Custodian)',
        new_custodian: 'Dr. Anand Verma',
        location: 'CFSL Cyber Forensic Analysis Lab',
        notes: 'Requisition order issued by ACP Meera Sen for digital carve and SQL table recovery',
        tx_hash: 'b44917a2ff82cd9320e881023bc4a67109283401928340128930412839401283',
      },
    ],
  },
  {
    id: 'ev-0188-01',
    case_id: 'cd-case-0188',
    case_number: 'FIR-2026-MH-0188',
    item_number: 'EVD-0188-01',
    name: 'Iridium Extreme 9575 Satellite Phone Handset',
    category: 'COMMUNICATION_HARDWARE',
    description: 'Ruggedized satellite handset recovered from suspect vehicle. IMEI: 300434061298410. Faraday bag sealed with forensic chain tag #MH-8812.',
    custodian: 'Insp. Vikram Rao',
    custodian_badge: 'INSP-5102',
    location: 'Special Cell Vault Locker 4A',
    sealed_at: '2026-07-15T23:00:00Z',
    chain_hash: '5f884a1239cd49b9ee348bb8294a2b105f884a1239cd49b9ee348bb8294a2b10',
    status: 'SECURE_VAULT',
    custody_events: [
      {
        id: 'cust-04',
        timestamp: '2026-07-15T23:00:00Z',
        actor: 'Insp. Vikram Rao',
        role: 'INVESTIGATOR',
        action: 'INITIAL_SEIZURE',
        prev_custodian: 'Suspect (In Custody)',
        new_custodian: 'Insp. Vikram Rao',
        location: 'Highway Toll Checkpoint, Mumbai-Pune Expressway',
        notes: 'Seized during vehicular interception with panchnama witnesses',
        tx_hash: '1a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d1a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d',
      },
    ],
  },
  {
    id: 'ev-0188-02',
    case_id: 'cd-case-0188',
    case_number: 'FIR-2026-MH-0188',
    item_number: 'EVD-0188-02',
    name: 'Handwritten Spiral Hawala Ledger & Codebook',
    category: 'PHYSICAL_RECORD',
    description: 'Red leather bound spiral diary containing 142 coded accounting entries, monetary transfers, and foreign contact numbers. Kept in sealed documentary envelope.',
    custodian: 'ACP Meera Sen',
    custodian_badge: 'ACP-1044',
    location: 'Sessions Court Exhibit Room 3',
    sealed_at: '2026-08-01T11:00:00Z',
    chain_hash: '2c3b4a5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a1b2c3d4e5f6a7b8c9d0e1f2a3b',
    status: 'COURT_EXHIBIT',
    custody_events: [
      {
        id: 'cust-05',
        timestamp: '2026-08-01T11:00:00Z',
        actor: 'ACP Meera Sen',
        role: 'SUPERVISOR',
        action: 'COURT_SUBMISSION',
        prev_custodian: 'Insp. Vikram Rao',
        new_custodian: 'Registrar, Sessions Court Division III',
        location: 'Sessions Court Exhibit Room 3',
        notes: 'Submitted as primary prosecution exhibit along with Section 65B certificate',
        tx_hash: '8f4a3c19e83b271d49a02fb7d4a98072e912bc34567890abcdef1234567892c1',
      },
    ],
  },
];

let localEvidence: EvidenceItem[] = [...INITIAL_EVIDENCE];

export async function getEvidence(caseId?: string): Promise<EvidenceItem[]> {
  try {
    const url = caseId ? `/cases/${caseId}/evidence` : '/evidence';
    const res = await api.get<EvidenceItem[]>(url);
    if (res.status === 200 && Array.isArray(res.data) && res.data.length > 0) {
      return res.data;
    }
  } catch {
    // Backend offline
  }

  if (caseId) {
    const q = caseId.toLowerCase();
    const matched = localEvidence.filter((e) => 
      e.case_id.toLowerCase() === q || 
      (e.item_number && e.item_number.toLowerCase().includes(q))
    );
    return matched.length > 0 ? matched : localEvidence;
  }
  return localEvidence;
}

export async function getEvidenceById(id: string): Promise<EvidenceItem | null> {
  const item = localEvidence.find((e) => e.id === id || e.item_number.toLowerCase() === id.toLowerCase());
  return item || null;
}

export async function createEvidence(data: {
  case_id: string;
  item_number: string;
  name: string;
  category: string;
  description: string;
  location: string;
}): Promise<EvidenceItem> {
  const newItem: EvidenceItem = {
    id: `ev-${Date.now()}`,
    case_id: data.case_id,
    case_number: 'FIR-2026-DL-0412',
    item_number: data.item_number || `EVD-${Math.floor(1000 + Math.random() * 9000)}`,
    name: data.name,
    category: data.category,
    description: data.description,
    custodian: 'Insp. Rajesh Sharma',
    custodian_badge: 'INSP-4029',
    location: data.location,
    sealed_at: new Date().toISOString(),
    chain_hash: `sha256_evidence_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`,
    status: 'SECURE_VAULT',
    custody_events: [
      {
        id: `cust-${Date.now()}`,
        timestamp: new Date().toISOString(),
        actor: 'Insp. Rajesh Sharma',
        role: 'INVESTIGATOR',
        action: 'INITIAL_SEIZURE',
        prev_custodian: 'On-Site Recovery',
        new_custodian: 'Insp. Rajesh Sharma',
        location: data.location,
        notes: 'Initial formal seizure and barcode tagging',
        tx_hash: `0x${Math.random().toString(16).substring(2, 10)}${Math.random().toString(16).substring(2, 10)}`,
      },
    ],
  };

  localEvidence.unshift(newItem);
  return newItem;
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
  const item = localEvidence.find((e) => e.id === evidenceId);
  if (item) {
    const prevCustodian = item.custodian;
    item.custodian = data.new_custodian;
    item.location = data.location;
    item.custody_events.push({
      id: `cust-${Date.now()}`,
      timestamp: new Date().toISOString(),
      actor: data.actor,
      role: 'INVESTIGATOR',
      action: 'CUSTODY_TRANSFER',
      prev_custodian: prevCustodian,
      new_custodian: data.new_custodian,
      location: data.location,
      notes: data.notes,
      tx_hash: `0x${Math.random().toString(16).substring(2, 10)}${Math.random().toString(16).substring(2, 10)}`,
    });
    return { ...item };
  }
  return null;
}

export const evidenceService = {
  getEvidence,
  getEvidenceById,
  createEvidence,
  transferCustody,
  INITIAL_EVIDENCE,
};
