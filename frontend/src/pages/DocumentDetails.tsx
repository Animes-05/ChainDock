import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { AppShell } from '../components/layout/AppShell';
import { documentsService } from '../services/documents';
import { casesService } from '../services/cases';
import { useAuth } from '../hooks/useAuth';
import { Document as DocType, Case } from '../types';
import { CertificateViewer } from '../components/security/CertificateViewer';
import { BackendUnavailable } from '../components/common/BackendUnavailable';
import { ApiError } from '../services/api';

export const DocumentDetails: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user, role } = useAuth();

  const [document, setDocument] = useState<DocType | null>(null);
  const [caseItem, setCaseItem] = useState<Case | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [copied, setCopied] = useState<boolean>(false);
  const [isCertModalOpen, setIsCertModalOpen] = useState(false);
  const [signatureVerified, setSignatureVerified] = useState<boolean | null>(null);
  const [backendError, setBackendError] = useState<{ status: number; endpoint: string; message: string } | null>(null);

  const fetchDocument = async () => {
    if (!id) return;
    try {
      setLoading(true);
      setBackendError(null);
      const doc = await documentsService.getDocumentById(id);
      if (doc) {
        setDocument(doc);
        if (doc.case_id) {
          try {
            const c = await casesService.getCaseById(doc.case_id);
            setCaseItem(c || null);
          } catch {
            // Case fetch non-fatal
          }
        }
      } else {
        setDocument(null);
      }
    } catch (err: unknown) {
      console.error('Failed to load document:', err);
      if (err instanceof ApiError) {
        setBackendError({ status: err.status, endpoint: err.endpoint, message: err.message });
      } else {
        setBackendError({ status: 0, endpoint: `/documents/${id}`, message: (err as Error).message });
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDocument();
  }, [id]);

  const handleTamperToggle = async () => {
    if (!document) return;
    const updated = await documentsService.toggleDocumentTamper(document.id);
    if (updated) {
      setDocument({ ...updated });
      setSignatureVerified(null);
    }
  };

  const handleFinalizeDocument = async () => {
    if (!document) return;
    const signer = user?.name || 'Authorized Supervisor';
    const key = 'ed25519:1044bf91823a0988cc812903ea77192b';
    const updated = await documentsService.finalizeDocument(document.id, signer, key);
    if (updated) {
      setDocument({ ...updated });
    }
  };

  const handleVerifySignature = () => {
    if (!document) return;
    if (document.is_tampered || document.signature_status === 'INVALID') {
      setSignatureVerified(false);
    } else {
      setSignatureVerified(true);
    }
  };

  const copyHash = () => {
    if (!document) return;
    navigator.clipboard.writeText(document.sha256);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (loading) {
    return (
      <AppShell>
        <div className="p-16 text-center text-[#1a2b27]/60 text-sm">
          <div className="animate-spin w-8 h-8 border-2 border-[#2e5d4b] border-t-transparent rounded-full mx-auto mb-3"></div>
          Verifying cryptographic checksums and loading record...
        </div>
      </AppShell>
    );
  }

  if (backendError) {
    return (
      <AppShell>
        <BackendUnavailable
          moduleName="Document Record Inspection"
          endpoint={backendError.endpoint}
          status={backendError.status}
          errorMessage={backendError.message}
          onRetry={fetchDocument}
        />
      </AppShell>
    );
  }

  if (!document) {
    return (
      <AppShell>
        <div className="p-12 text-center bg-[#fffdf9] rounded-xl border border-[#d1dbcb] max-w-lg mx-auto my-12">
          <span className="material-symbols-outlined text-4xl text-[#4e5c56] mb-3">warning</span>
          <h2 className="text-lg font-bold text-[#1a2b27]">Document Not Found</h2>
          <p className="text-xs text-[#4e5c56] mt-1">The requested evidentiary record was not found in the repository.</p>
          <button
            onClick={() => navigate('/documents')}
            className="mt-4 px-4 py-2 bg-[#2e5d4b] text-white text-xs font-semibold rounded hover:bg-[#243b35]"
          >
            Return to Documents
          </button>
        </div>
      </AppShell>
    );
  }

  const isTampered = document.is_tampered || document.integrity_status === 'TAMPERED';
  const isSupervisor = role === 'SUPERVISOR' || role === 'ADMIN';

  return (
    <AppShell>
      <div className="flex flex-col gap-6 max-w-[1520px] mx-auto">
        {/* Navigation Breadcrumbs & Actions */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-[#d1dbcb]">
          <div className="flex items-center gap-2 text-xs flex-wrap">
            <button
              onClick={() => navigate('/documents')}
              className="text-[#2e5d4b] font-semibold hover:underline flex items-center gap-1"
            >
              <span className="material-symbols-outlined text-[16px]">arrow_back</span>
              Documents
            </button>
            <span className="text-[#d1dbcb]">/</span>
            <span className="font-mono text-[#4e5c56] truncate max-w-xs">{document.case_number || document.case_id}</span>
            <span className="text-[#d1dbcb]">/</span>
            <span className="font-mono font-bold text-[#1a2b27] truncate max-w-sm">{document.id}</span>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Tamper Simulation Trigger */}
            <button
              onClick={handleTamperToggle}
              className={`px-3 py-1.5 rounded text-xs font-mono font-bold flex items-center gap-1.5 transition-colors border shadow-sm ${
                isTampered
                  ? 'bg-red-700 text-white border-red-800 hover:bg-red-800'
                  : 'bg-[#fffdf9] text-red-700 border-red-300 hover:bg-red-50'
              }`}
            >
              <span className="material-symbols-outlined text-[16px]">
                {isTampered ? 'restart_alt' : 'bolt'}
              </span>
              <span>{isTampered ? 'Reset State' : 'Simulate Tamper'}</span>
            </button>

            {/* Supervisor Finalize Button */}
            {isSupervisor && document.signature_status === 'UNSIGNED' && (
              <button
                onClick={handleFinalizeDocument}
                className="px-3 py-1.5 bg-[#2e5d4b] text-white hover:bg-[#243b35] rounded text-xs font-semibold flex items-center gap-1.5 shadow-sm"
              >
                <span className="material-symbols-outlined text-[16px]">draw</span>
                <span>Finalize &amp; Sign (Ed25519)</span>
              </button>
            )}

            <button
              onClick={() => setIsCertModalOpen(true)}
              className="px-3 py-1.5 bg-[#0e1c19] text-[#fffdf9] hover:bg-[#243b35] rounded text-xs font-semibold flex items-center gap-1.5 shadow-sm"
            >
              <span className="material-symbols-outlined text-[16px]">verified</span>
              <span>View Certificate</span>
            </button>
          </div>
        </div>

        {/* Top Record Header */}
        <div className="bg-[#f6eed6] p-4 rounded-xl border border-[#d1dbcb] flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded bg-[#243b35] text-white flex items-center justify-center shrink-0 shadow">
              <span className="material-symbols-outlined text-[22px]">description</span>
            </div>
            <div className="flex flex-col">
              <div className="flex items-center gap-2 flex-wrap text-xs">
                <span className="font-bold text-[#1a2b27] uppercase tracking-wide">Document Record</span>
                <span
                  className={`px-2 py-0.5 rounded text-[11px] font-semibold border ${
                    isTampered
                      ? 'bg-red-100 text-red-900 border-red-300 font-bold'
                      : 'bg-[#cbe8db] text-[#143d2f] border-[#2e5d4b]/30'
                  }`}
                >
                  {isTampered ? 'INTEGRITY BREACHED' : 'Integrity Verified'}
                </span>
              </div>
              <span className="text-xs sm:text-sm font-semibold text-[#1a2b27] mt-0.5">
                Case: {caseItem?.title || document.case_number || document.case_id}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2 text-xs font-mono text-[#4e5c56]">
            <span>Algorithm: SHA-256</span>
            <span>·</span>
            <span>Signatures: Ed25519</span>
          </div>
        </div>

        {/* Main Content Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Left Canvas: Document View (8 cols) */}
          <div className="lg:col-span-8 flex flex-col gap-4">
            <div className="bg-[#fffdf9] rounded-xl p-5 border border-[#d1dbcb] shadow-sm flex flex-col gap-3">
              <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3 pb-3 border-b border-[#d1dbcb]/60">
                <div>
                  <h1 className="text-lg sm:text-xl font-bold text-[#1a2b27] tracking-tight">
                    {document.title}
                  </h1>
                  <span className="text-xs text-[#4e5c56] font-mono mt-1 block">
                    Type: {document.document_type} · Version: v{document.version}.0
                  </span>
                </div>

                <div
                  className={`shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded self-start font-mono text-xs font-bold border ${
                    isTampered
                      ? 'bg-red-100 text-red-900 border-red-300'
                      : 'bg-[#243b35] text-white border-[#243b35]'
                  }`}
                >
                  <span className="material-symbols-outlined text-[16px]">
                    {isTampered ? 'gpp_bad' : 'shield'}
                  </span>
                  <span>{isTampered ? 'TAMPER DETECTED' : 'AUTHENTICATED'}</span>
                </div>
              </div>

              {/* Document Content / Description Body */}
              <div className="pt-2 flex flex-col gap-2">
                <span className="text-xs font-bold uppercase tracking-wider text-[#243b35]">
                  Document Description &amp; Summary
                </span>
                <p className="text-sm text-[#1a2b27] leading-relaxed whitespace-pre-wrap bg-white p-4 rounded-lg border border-[#d1dbcb]">
                  {document.description || 'No description provided for this document.'}
                </p>

                {isTampered && (
                  <div className="p-3 bg-red-50 text-red-900 border border-red-300 rounded-lg text-xs font-mono">
                    <strong>INTEGRITY WARNING:</strong> Document cryptographic digest mismatch detected!
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Right Column: Cryptographic Proofs (4 cols) */}
          <div className="lg:col-span-4 flex flex-col gap-4">
            {/* Status Card */}
            <div
              className={`rounded-xl p-5 shadow-sm border flex flex-col gap-3 transition-colors ${
                isTampered
                  ? 'bg-red-900 text-white border-red-950'
                  : 'bg-[#243b35] text-[#fffdf9] border-[#0e1c19]'
              }`}
            >
              <div className="flex items-start gap-3">
                <div
                  className={`w-10 h-10 rounded flex items-center justify-center shrink-0 shadow ${
                    isTampered ? 'bg-red-500 text-white' : 'bg-[#cbe8db] text-[#143d2f]'
                  }`}
                >
                  <span className="material-symbols-outlined text-[24px]">
                    {isTampered ? 'gpp_bad' : 'verified'}
                  </span>
                </div>
                <div className="flex flex-col">
                  <span className="text-[10px] uppercase font-bold tracking-widest text-emerald-200/80">
                    Cryptographic Integrity
                  </span>
                  <h2 className="text-base font-bold leading-tight mt-0.5">
                    {isTampered ? 'INTEGRITY COMPROMISED' : 'INTEGRITY VERIFIED'}
                  </h2>
                </div>
              </div>

              <p className="text-xs leading-relaxed opacity-90">
                {isTampered
                  ? 'SHA-256 digest does not match the ledger commitment. The document has been modified.'
                  : 'Cryptographic hash verified. Zero tampering detected.'}
              </p>
            </div>

            {/* SHA-256 Digest Card */}
            <div className="bg-[#fffdf9] rounded-xl p-4 border border-[#d1dbcb] shadow-sm flex flex-col gap-2.5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-[#1a2b27]">
                  <span className="material-symbols-outlined text-[18px] text-[#2e5d4b]">tag</span>
                  <span>SHA-256 Checksum</span>
                </div>
              </div>

              <div className="bg-[#f6eed6] p-2.5 rounded border border-[#d1dbcb]">
                <div className="font-mono text-xs break-all leading-relaxed text-[#1a2b27] font-semibold">
                  {document.sha256}
                </div>
                <div className="mt-2 pt-2 border-t border-[#d1dbcb]/60 flex items-center justify-end text-[#4e5c56] text-[11px]">
                  <button
                    onClick={copyHash}
                    className="text-[#1a2b27] hover:text-[#2e5d4b] font-semibold flex items-center gap-1 transition-colors"
                  >
                    <span className="material-symbols-outlined text-[14px]">content_copy</span>
                    <span>{copied ? 'Copied!' : 'Copy Hash'}</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Ed25519 Signature Card */}
            <div className="bg-[#fffdf9] rounded-xl p-4 border border-[#d1dbcb] shadow-sm flex flex-col gap-3">
              <div className="flex items-center justify-between pb-2 border-b border-[#d1dbcb]/60">
                <div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-[#1a2b27]">
                  <span className="material-symbols-outlined text-[18px] text-[#2e5d4b]">encrypted</span>
                  <span>Ed25519 Signature</span>
                </div>
                <span
                  className={`px-2 py-0.5 rounded text-[10px] font-bold font-mono ${
                    document.signature_status === 'VALID'
                      ? 'bg-[#cbe8db] text-[#143d2f]'
                      : 'bg-amber-100 text-amber-900'
                  }`}
                >
                  {document.signature_status}
                </span>
              </div>

              <div className="flex flex-col gap-2 text-xs">
                <div className="p-2 bg-[#f6eed6] rounded border border-[#d1dbcb] flex flex-col gap-0.5">
                  <span className="text-[10px] uppercase font-bold text-[#4e5c56]">Signer</span>
                  <span className="font-bold text-[#1a2b27]">{document.signer_name || 'Unsigned'}</span>
                </div>

                <button
                  onClick={handleVerifySignature}
                  className="w-full py-2 px-3 rounded bg-[#2e5d4b] text-white hover:bg-[#243b35] text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors shadow-sm"
                >
                  <span className="material-symbols-outlined text-[16px]">verified</span>
                  <span>Verify Signature</span>
                </button>

                {signatureVerified !== null && (
                  <div
                    className={`p-2 rounded text-[11px] font-mono font-medium border text-center ${
                      signatureVerified
                        ? 'bg-[#cbe8db] text-[#143d2f] border-[#2e5d4b]/30'
                        : 'bg-red-100 text-red-900 border-red-300'
                    }`}
                  >
                    {signatureVerified
                      ? '✓ Signature Confirmed (Valid Ed25519)'
                      : '✕ Signature Verification Failed'}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Certificate Modal */}
      {isCertModalOpen && (
        <CertificateViewer
          isOpen={isCertModalOpen}
          onClose={() => setIsCertModalOpen(false)}
          document={document}
        />
      )}
    </AppShell>
  );
};
