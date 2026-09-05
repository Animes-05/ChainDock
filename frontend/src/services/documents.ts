import { api } from './api';
import { Document } from '../types';
import { computeSHA256 } from '../utils/validation';

export const INITIAL_DOCUMENTS: Document[] = [
  {
    id: 'doc-0412-01',
    case_id: 'cd-case-0412',
    case_number: 'FIR-2026-DL-0412',
    title: 'First Information Report (FIR No. 412/2026) u/s 409, 420, 120B IPC & Sec 66 IT Act',
    document_type: 'FIRST_INFORMATION_REPORT',
    description: 'Registered statutory FIR documenting fraudulent diversion of ₹142 Crores through unauthorized core banking credential compromise and RTGS channel exploitation.',
    version: 1,
    sha256: '8f4a3c19e83b271d49a02fb7d4a98072e912bc34567890abcdef1234567892c1',
    original_sha256: '8f4a3c19e83b271d49a02fb7d4a98072e912bc34567890abcdef1234567892c1',
    is_tampered: false,
    integrity_status: 'VERIFIED',
    signature_status: 'VALID',
    signer_name: 'Inspector Rajesh Sharma',
    signer_key: 'ed25519:4029a1b8e23f9011ba72091ea448910b',
    signed_at: '2026-08-20T10:15:00Z',
    uploaded_by: 'Insp. Rajesh Sharma',
    file_size: '3.4 MB',
    file_type: 'Certified PDF/A-3',
    classification: 'RESTRICTED EVIDENCE EXHIBIT A',
    legal_docket_ref: 'CR-DL-2026-FIR-0412-A',
    created_at: '2026-08-20T10:00:00Z',
    versions: [
      {
        version: 1,
        timestamp: '2026-08-20T10:00:00Z',
        sha256: '8f4a3c19e83b271d49a02fb7d4a98072e912bc34567890abcdef1234567892c1',
        uploaded_by: 'Insp. Rajesh Sharma',
        notes: 'Original stamped police station registration signed under digital token',
      },
    ],
  },
  {
    id: 'doc-0412-02',
    case_id: 'cd-case-0412',
    case_number: 'FIR-2026-DL-0412',
    title: 'Final Police Report & Charge Sheet (u/s 173 CrPC) — State vs. Verma & Ors.',
    document_type: 'CHARGE_SHEET',
    description: 'Comprehensive 84-page judicial charge sheet submitted before Special Magistrate detailing shell corporate entities, Hawala ledger reconciliation, and cryptographic proof of tampering attempts.',
    version: 3,
    sha256: '4e71bb392019482bf41aa72190bc412093e8f4a3c19e83b271d49a02fb7d4a98',
    original_sha256: '4e71bb392019482bf41aa72190bc412093e8f4a3c19e83b271d49a02fb7d4a98',
    is_tampered: false,
    integrity_status: 'VERIFIED',
    signature_status: 'VALID',
    signer_name: 'ACP Meera Sen',
    signer_key: 'ed25519:1044bf91823a0988cc812903ea77192b',
    signed_at: '2026-09-04T17:30:00Z',
    uploaded_by: 'Insp. Rajesh Sharma',
    file_size: '18.2 MB',
    file_type: 'Certified PDF/A-3 (Court Archival)',
    classification: 'CONFIDENTIAL JUDICIAL FILING',
    legal_docket_ref: 'CS-ND-2026-0884-FIN',
    created_at: '2026-08-25T11:00:00Z',
    versions: [
      {
        version: 1,
        timestamp: '2026-08-25T11:00:00Z',
        sha256: '1109a1cbdf32115391a7812903bbca0129012398412893041233d07e21a8a25c',
        uploaded_by: 'Insp. Rajesh Sharma',
        notes: 'Initial preliminary draft for supervisory review',
      },
      {
        version: 2,
        timestamp: '2026-09-01T15:20:00Z',
        sha256: 'b44917a2ff82cd9320e881023bc4a67109283401928340128930412839401283',
        uploaded_by: 'Insp. Rajesh Sharma',
        notes: 'Appended forensic accounting annexures and chartered accountant audit',
      },
      {
        version: 3,
        timestamp: '2026-09-04T17:30:00Z',
        sha256: '4e71bb392019482bf41aa72190bc412093e8f4a3c19e83b271d49a02fb7d4a98',
        uploaded_by: 'ACP Meera Sen',
        notes: 'Finalized and digitally countersigned with Ed25519 supervisory key',
      },
    ],
  },
  {
    id: 'doc-0412-03',
    case_id: 'cd-case-0412',
    case_number: 'FIR-2026-DL-0412',
    title: 'CFSL Digital Forensics Examination Report — Bitstream Extraction of Server NVMe',
    document_type: 'FORENSIC_LAB_REPORT',
    description: 'Central Forensic Science Laboratory certified forensic bitstream duplicate analysis, raw E01 image verification, and recovery of deleted transaction table fragments.',
    version: 1,
    sha256: 'd2f190a4e71bb392019482bf41aa72190bc412093e8f4a3c19e83b271d49a02f',
    original_sha256: 'd2f190a4e71bb392019482bf41aa72190bc412093e8f4a3c19e83b271d49a02f',
    is_tampered: false,
    integrity_status: 'VERIFIED',
    signature_status: 'VALID',
    signer_name: 'Dr. Anand Verma (Forensic Director)',
    signer_key: 'ed25519:6601ea9981203b87bb019482a019482b',
    signed_at: '2026-08-30T14:10:00Z',
    uploaded_by: 'Insp. Rajesh Sharma',
    file_size: '7.6 MB',
    file_type: 'Certified PDF + E01 Checksum Sheet',
    classification: 'CFSL SCIENTIFIC EVIDENCE',
    legal_docket_ref: 'CFSL-CYB-2026-891',
    created_at: '2026-08-30T13:45:00Z',
    versions: [
      {
        version: 1,
        timestamp: '2026-08-30T13:45:00Z',
        sha256: 'd2f190a4e71bb392019482bf41aa72190bc412093e8f4a3c19e83b271d49a02f',
        uploaded_by: 'Insp. Rajesh Sharma',
        notes: 'Official sealed laboratory analysis received from CFSL CBI complex',
      },
    ],
  },
  {
    id: 'doc-0188-01',
    case_id: 'cd-case-0188',
    case_number: 'FIR-2026-MH-0188',
    title: 'Witness Statement & Deposition Record (u/s 161 & 164 CrPC) — Key Accused Driver',
    document_type: 'WITNESS_STATEMENT',
    description: 'Verbatim magistrate-certified statement recording route details, clandestine cargo handling, burner phone distribution, and verbal instructions from syndicate handlers.',
    version: 2,
    sha256: '9a02fb7d4a98072e912bc34567890abcdef1234567892c18f4a3c19e83b271d4',
    original_sha256: '9a02fb7d4a98072e912bc34567890abcdef1234567892c18f4a3c19e83b271d4',
    is_tampered: false,
    integrity_status: 'VERIFIED',
    signature_status: 'VALID',
    signer_name: 'ACP Meera Sen',
    signer_key: 'ed25519:1044bf91823a0988cc812903ea77192b',
    signed_at: '2026-08-18T16:00:00Z',
    uploaded_by: 'Insp. Vikram Rao',
    file_size: '2.1 MB',
    file_type: 'Certified PDF/A-3',
    classification: 'CONFIDENTIAL WITNESS RECORD',
    legal_docket_ref: 'WIT-SEC164-2026-0188',
    created_at: '2026-08-16T10:00:00Z',
    versions: [
      {
        version: 1,
        timestamp: '2026-08-16T10:00:00Z',
        sha256: '72e912bc34567890abcdef1234567892c18f4a3c19e83b271d49a02fb7d4a980',
        uploaded_by: 'Insp. Vikram Rao',
        notes: 'Section 161 CrPC police investigation recording',
      },
      {
        version: 2,
        timestamp: '2026-08-18T16:00:00Z',
        sha256: '9a02fb7d4a98072e912bc34567890abcdef1234567892c18f4a3c19e83b271d4',
        uploaded_by: 'Insp. Vikram Rao',
        notes: 'Formal Section 164 CrPC statement certified before Metropolitan Magistrate',
      },
    ],
  },
  {
    id: 'doc-0188-02',
    case_id: 'cd-case-0188',
    case_number: 'FIR-2026-MH-0188',
    title: 'Seizure Panchnama & Physical Evidence Custody Manifest (Sec 100 CrPC)',
    document_type: 'SEIZURE_PANCHNAMA',
    description: 'On-site recovery memo executed in presence of independent panch witnesses documenting seizure of 4 satellite handsets, encrypted thumb drives, and currency packets.',
    version: 1,
    sha256: '1a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4f5a6b7c8d9e0f1a2b',
    original_sha256: '1a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4f5a6b7c8d9e0f1a2b',
    is_tampered: false,
    integrity_status: 'VERIFIED',
    signature_status: 'VALID',
    signer_name: 'Insp. Vikram Rao',
    signer_key: 'ed25519:5102aa8810293ebc41982bca019482b1',
    signed_at: '2026-07-15T22:30:00Z',
    uploaded_by: 'Insp. Vikram Rao',
    file_size: '4.2 MB',
    file_type: 'Certified PDF/A-3',
    classification: 'PHYSICAL RECOVERY MEMO',
    legal_docket_ref: 'PAN-MH-2026-0188-REC',
    created_at: '2026-07-15T22:00:00Z',
    versions: [
      {
        version: 1,
        timestamp: '2026-07-15T22:00:00Z',
        sha256: '1a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4f5a6b7c8d9e0f1a2b',
        uploaded_by: 'Insp. Vikram Rao',
        notes: 'Signed on-site by Panch witnesses and Investigating Officer',
      },
    ],
  },
  {
    id: 'doc-0751-01',
    case_id: 'cd-case-0751',
    case_number: 'FIR-2026-KA-0751',
    title: 'SCADA Telemetry Intrusion Analysis & Reverse-Engineered Exploit Payload',
    document_type: 'CYBER_FORENSIC_DUMP',
    description: 'Reverse engineering disassembly report of custom DLL implant targeting power distribution SCADA controllers with IOC list, packet PCAPs, and timeline reconstruction.',
    version: 1,
    sha256: '3f4a5b6c7d8e9f0a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a',
    original_sha256: '3f4a5b6c7d8e9f0a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a',
    is_tampered: false,
    integrity_status: 'VERIFIED',
    signature_status: 'VALID',
    signer_name: 'Director Arvind Kumar',
    signer_key: 'ed25519:0001ff9910293ebc41982bca019482b1',
    signed_at: '2026-08-10T11:00:00Z',
    uploaded_by: 'Dr. Anand Verma (Forensics)',
    file_size: '34.8 MB',
    file_type: 'PCAP & Disassembly Dossier',
    classification: 'NATIONAL CRITICAL INFRASTRUCTURE',
    legal_docket_ref: 'CYB-SEC-2026-0751-SCADA',
    created_at: '2026-08-10T10:30:00Z',
    versions: [
      {
        version: 1,
        timestamp: '2026-08-10T10:30:00Z',
        sha256: '3f4a5b6c7d8e9f0a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a',
        uploaded_by: 'Dr. Anand Verma (Forensics)',
        notes: 'Initial packet reconstruction certified under IT Act Section 79A',
      },
    ],
  },
];

let localDocuments: Document[] = [...INITIAL_DOCUMENTS];

export async function getDocuments(caseId?: string): Promise<Document[]> {
  try {
    const url = caseId ? `/cases/${caseId}/documents` : '/documents';
    const res = await api.get<Document[]>(url);
    if (res.status === 200 && Array.isArray(res.data) && res.data.length > 0) {
      return res.data;
    }
  } catch {
    // Backend offline
  }

  if (caseId) {
    const q = caseId.toLowerCase();
    const matched = localDocuments.filter((d) =>
      d.case_id.toLowerCase() === q ||
      (d.case_number && d.case_number.toLowerCase() === q)
    );
    return matched.length > 0 ? matched : localDocuments;
  }
  return localDocuments;
}

export async function getDocumentById(id: string): Promise<Document | null> {
  try {
    const res = await api.get<Document>(`/documents/${id}`);
    if (res.status === 200 && res.data) {
      return res.data;
    }
  } catch {
    // Backend offline
  }

  const doc = localDocuments.find((d) => d.id === id);
  return doc || null;
}

export async function uploadDocument(
  caseId: string,
  file: File,
  metadata: {
    title: string;
    documentType: string;
    description: string;
    uploadedBy: string;
    classification?: string;
  }
): Promise<Document> {
  let fileHash = 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855';
  try {
    const buffer = await file.arrayBuffer();
    fileHash = await computeSHA256(buffer);
  } catch {
    fileHash = `mock_sha256_${Date.now()}_${Math.random().toString(36).substring(2, 10)}`;
  }

  const newDoc: Document = {
    id: `doc-${Date.now()}`,
    case_id: caseId,
    title: metadata.title,
    document_type: metadata.documentType,
    description: metadata.description,
    version: 1,
    sha256: fileHash,
    original_sha256: fileHash,
    is_tampered: false,
    integrity_status: 'VERIFIED',
    signature_status: 'UNSIGNED',
    uploaded_by: metadata.uploadedBy || 'Insp. Rajesh Sharma',
    file_size: `${(file.size / (1024 * 1024)).toFixed(2)} MB`,
    file_type: file.type || 'Certified Evidentiary File',
    classification: metadata.classification || 'CONFIDENTIAL POLICE DOCKET',
    legal_docket_ref: `DOK-${caseId.toUpperCase()}-${Math.floor(1000 + Math.random() * 9000)}`,
    created_at: new Date().toISOString(),
    versions: [
      {
        version: 1,
        timestamp: new Date().toISOString(),
        sha256: fileHash,
        uploaded_by: metadata.uploadedBy || 'Insp. Rajesh Sharma',
        notes: 'Initial evidentiary intake with cryptographic digest commitment',
      },
    ],
  };

  try {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('metadata', JSON.stringify(newDoc));
    const res = await api.post<Document>(`/cases/${caseId}/documents`, formData);
    if (res.status === 201 && res.data) {
      localDocuments.unshift(res.data);
      return res.data;
    }
  } catch {
    // Backend offline
  }

  localDocuments.unshift(newDoc);
  return newDoc;
}

export function tamperDocument(docId: string): Document | null {
  const doc = localDocuments.find((d) => d.id === docId);
  if (doc) {
    doc.is_tampered = true;
    doc.integrity_status = 'TAMPERED';
    doc.signature_status = 'INVALID';
    doc.tamper_offset = 'Byte 0x0042F0 (Content Payload Mutation)';
    doc.sha256 = 'CORRUPTED_HASH_' + doc.original_sha256.substring(15);
    return { ...doc };
  }
  return null;
}

export function restoreDocument(docId: string): Document | null {
  const doc = localDocuments.find((d) => d.id === docId);
  if (doc) {
    doc.is_tampered = false;
    doc.integrity_status = 'VERIFIED';
    doc.signature_status = 'VALID';
    doc.sha256 = doc.original_sha256;
    doc.tamper_offset = undefined;
    return { ...doc };
  }
  return null;
}

export function finalizeDocument(docId: string, signerName: string, signerKey: string): Document | null {
  const doc = localDocuments.find((d) => d.id === docId);
  if (doc) {
    doc.signature_status = 'VALID';
    doc.signer_name = signerName;
    doc.signer_key = signerKey;
    doc.signed_at = new Date().toISOString();
    doc.version = doc.version + 1;
    doc.versions.push({
      version: doc.version,
      timestamp: new Date().toISOString(),
      sha256: doc.sha256,
      uploaded_by: signerName,
      notes: `Finalized & digitally signed under Ed25519 token by ${signerName}`,
    });
    return { ...doc };
  }
  return null;
}

export function toggleDocumentTamper(docId: string): Document | null {
  const doc = localDocuments.find((d) => d.id === docId);
  if (!doc) return null;
  if (doc.is_tampered) {
    return restoreDocument(docId);
  } else {
    return tamperDocument(docId);
  }
}

export const documentsService = {
  getDocuments,
  getDocumentById,
  uploadDocument,
  tamperDocument,
  restoreDocument,
  toggleDocumentTamper,
  finalizeDocument,
  INITIAL_DOCUMENTS,
};
