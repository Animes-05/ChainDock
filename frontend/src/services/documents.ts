import { api } from './api';
import { Document } from '../types';
import { computeSHA256 } from '../utils/validation';

export function normalizeDocument(d: any, fallback?: Partial<Document>): Document {
  const isTampered = Boolean(d?.is_tampered ?? d?.isTampered ?? fallback?.is_tampered ?? false);
  const sha256Val = String(d?.sha256 || d?.hash || fallback?.sha256 || '');
  const origSha256 = String(d?.original_sha256 || d?.originalSha256 || fallback?.original_sha256 || sha256Val);
  const created = String(d?.created_at || d?.createdAt || fallback?.created_at || new Date().toISOString());
  const uploadedBy = String(d?.uploaded_by || d?.uploadedBy || fallback?.uploaded_by || 'Investigating Officer');

  let versionsList = Array.isArray(d?.versions) ? d.versions : fallback?.versions;
  if (!Array.isArray(versionsList) || versionsList.length === 0) {
    versionsList = [
      {
        version: Number(d?.version || 1),
        timestamp: created,
        sha256: sha256Val,
        uploaded_by: uploadedBy,
      },
    ];
  }

  let formattedSize = '1.2 MB';
  if (typeof d?.file_size === 'number') {
    formattedSize = `${(d.file_size / (1024 * 1024)).toFixed(2)} MB`;
  } else if (d?.file_size) {
    formattedSize = String(d.file_size);
  } else if (d?.fileSize) {
    formattedSize = String(d.fileSize);
  }

  return {
    id: String(d?.id || fallback?.id || ''),
    case_id: String(d?.case_id || d?.caseId || fallback?.case_id || ''),
    case_number: String(d?.case_number || d?.caseNumber || fallback?.case_number || 'CASE-2026'),
    title: String(d?.title || fallback?.title || 'Untitled Document'),
    document_type: String(d?.document_type || d?.documentType || fallback?.document_type || 'EVIDENTIARY_REPORT'),
    description: String(d?.description || fallback?.description || ''),
    version: Number(d?.version || fallback?.version || 1),
    sha256: sha256Val,
    original_sha256: origSha256,
    is_tampered: isTampered,
    tamper_offset: d?.tamper_offset || d?.tamperOffset || fallback?.tamper_offset,
    integrity_status: d?.integrity_status || d?.integrityStatus || fallback?.integrity_status || (isTampered ? 'TAMPERED' : 'VERIFIED'),
    signature_status: d?.signature_status || d?.signatureStatus || fallback?.signature_status || 'VALID',
    signer_name: d?.signer_name || d?.signerName || fallback?.signer_name,
    signer_key: d?.signer_key || d?.signerKey || fallback?.signer_key,
    signed_at: d?.signed_at || d?.signedAt || fallback?.signed_at,
    uploaded_by: uploadedBy,
    file_size: formattedSize,
    file_type: String(d?.file_type || d?.fileType || d?.mime_type || fallback?.file_type || 'application/pdf'),
    classification: String(d?.classification || fallback?.classification || 'CONFIDENTIAL'),
    legal_docket_ref: d?.legal_docket_ref || d?.legalDocketRef || fallback?.legal_docket_ref,
    created_at: created,
    versions: versionsList,
  };
}

export async function getDocuments(caseId?: string): Promise<Document[]> {
  const url = caseId ? `/cases/${caseId}/documents` : '/documents';
  const res = await api.get<Document[] | { documents: Document[] } | { data: Document[] } | { items: Document[] } | { results: Document[] }>(url);
  let rawList: any[] = [];
  if (Array.isArray(res.data)) {
    rawList = res.data;
  } else if (res.data && typeof res.data === 'object') {
    const d = res.data as Record<string, unknown>;
    if (Array.isArray(d.documents)) {
      rawList = d.documents;
    } else if (Array.isArray(d.data)) {
      rawList = d.data;
    } else if (Array.isArray(d.items)) {
      rawList = d.items;
    } else if (Array.isArray(d.results)) {
      rawList = d.results;
    }
  }
  return rawList.map((doc) => normalizeDocument(doc));
}

export async function getDocumentById(id: string): Promise<Document | null> {
  const res = await api.get<Document | { document: Document } | { data: Document }>(`/documents/${id}`);
  if (res.data && typeof res.data === 'object') {
    const raw = 'document' in res.data ? (res.data as any).document : 'data' in res.data ? (res.data as any).data : res.data;
    return normalizeDocument(raw);
  }
  return null;
}

export async function uploadDocument(
  caseId: string,
  file: File,
  data: {
    title: string;
    documentType: string;
    description: string;
    uploadedBy: string;
    classification?: string;
  }
): Promise<Document> {
  let fileHash = '';
  try {
    const buffer = await file.arrayBuffer();
    fileHash = await computeSHA256(buffer);
  } catch {
    fileHash = '';
  }

  const formData = new FormData();
  formData.append('file', file);
  formData.append('case_id', caseId);
  formData.append('caseId', caseId);
  formData.append('title', data.title);
  formData.append('document_type', data.documentType);
  formData.append('documentType', data.documentType);
  formData.append('description', data.description);
  formData.append('uploaded_by', data.uploadedBy);
  formData.append('uploadedBy', data.uploadedBy);
  formData.append('sha256', fileHash);
  if (data.classification) {
    formData.append('classification', data.classification);
  }

  let res;
  try {
    res = await api.post<Document | { document: Document } | { data: Document }>(
      `/cases/${caseId}/documents`,
      formData
    );
  } catch (err: any) {
    if (err?.status === 404) {
      res = await api.post<Document | { document: Document } | { data: Document }>(
        '/documents',
        formData
      );
    } else {
      throw err;
    }
  }

  if (res.data && typeof res.data === 'object') {
    const raw = 'document' in res.data ? (res.data as any).document : 'data' in res.data ? (res.data as any).data : res.data;
    return normalizeDocument(raw, {
      case_id: caseId,
      title: data.title,
      document_type: data.documentType,
      description: data.description,
      uploaded_by: data.uploadedBy,
      sha256: fileHash,
      file_size: `${(file.size / (1024 * 1024)).toFixed(2)} MB`,
      file_type: file.type || 'application/pdf',
    });
  }

  throw new Error('Failed to upload document: Invalid backend response');
}

export async function finalizeDocument(
  docId: string,
  signerName: string,
  signerKey: string
): Promise<Document | null> {
  try {
    const res = await api.post<Document | { document: Document }>(`/documents/${docId}/finalize`, {
      signer_name: signerName,
      signer_key: signerKey,
    });
    if (res.data && typeof res.data === 'object') {
      const raw = 'document' in res.data ? (res.data as { document: Document }).document : (res.data as Document);
      return normalizeDocument(raw);
    }
  } catch (err) {
    console.warn('Backend finalize endpoint unavailable:', err);
  }
  return null;
}

export async function toggleDocumentTamper(docId: string): Promise<Document | null> {
  try {
    const res = await api.post<Document | { document: Document }>(`/documents/${docId}/tamper`);
    if (res.data && typeof res.data === 'object') {
      const raw = 'document' in res.data ? (res.data as { document: Document }).document : (res.data as Document);
      return normalizeDocument(raw);
    }
  } catch (err) {
    console.warn('Backend tamper simulation endpoint unavailable:', err);
  }
  return null;
}

export const documentsService = {
  getDocuments,
  getDocumentById,
  uploadDocument,
  finalizeDocument,
  toggleDocumentTamper,
  normalizeDocument,
};
