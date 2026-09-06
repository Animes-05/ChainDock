import { api } from './api';
import { Document } from '../types';
import { computeSHA256 } from '../utils/validation';

export async function getDocuments(caseId?: string): Promise<Document[]> {
  const url = caseId ? `/cases/${caseId}/documents` : '/documents';
  const res = await api.get<Document[] | { documents: Document[] } | { data: Document[] }>(url);
  if (Array.isArray(res.data)) {
    return res.data;
  }
  if (res.data && typeof res.data === 'object') {
    if ('documents' in res.data && Array.isArray((res.data as { documents: Document[] }).documents)) {
      return (res.data as { documents: Document[] }).documents;
    }
    if ('data' in res.data && Array.isArray((res.data as { data: Document[] }).data)) {
      return (res.data as { data: Document[] }).data;
    }
  }
  return [];
}

export async function getDocumentById(id: string): Promise<Document | null> {
  const res = await api.get<Document | { document: Document } | { data: Document }>(`/documents/${id}`);
  if (res.data && typeof res.data === 'object') {
    if ('document' in res.data) {
      return (res.data as { document: Document }).document;
    }
    if ('data' in res.data) {
      return (res.data as { data: Document }).data;
    }
    return res.data as Document;
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
  formData.append('title', data.title);
  formData.append('document_type', data.documentType);
  formData.append('description', data.description);
  formData.append('uploaded_by', data.uploadedBy);
  formData.append('sha256', fileHash);
  if (data.classification) {
    formData.append('classification', data.classification);
  }

  const res = await api.post<Document | { document: Document } | { data: Document }>(
    `/cases/${caseId}/documents`,
    formData
  );

  if (res.data && typeof res.data === 'object') {
    if ('document' in res.data) {
      return (res.data as { document: Document }).document;
    }
    if ('data' in res.data) {
      return (res.data as { data: Document }).data;
    }
    return res.data as Document;
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
      return 'document' in res.data ? (res.data as { document: Document }).document : (res.data as Document);
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
      return 'document' in res.data ? (res.data as { document: Document }).document : (res.data as Document);
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
};
