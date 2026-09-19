import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { AppShell } from '../components/layout/AppShell';
import { DocumentList } from '../components/documents/DocumentList';
import { DocumentUpload } from '../components/documents/DocumentUpload';
import { documentsService } from '../services/documents';
import { casesService } from '../services/cases';
import { Document as DocType } from '../types';
import { BackendUnavailable } from '../components/common/BackendUnavailable';
import { ApiError } from '../services/api';

export const Documents: React.FC = () => {
  const navigate = useNavigate();
  const [documents, setDocuments] = useState<DocType[]>([]);
  const [activeCaseId, setActiveCaseId] = useState<string>('cd-case-0412');
  const [loading, setLoading] = useState<boolean>(true);
  const [backendError, setBackendError] = useState<{ status: number; endpoint: string; message: string } | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState<string>('ALL');
  const [isUploadOpen, setIsUploadOpen] = useState(false);

  const fetchDocuments = async () => {
    try {
      setLoading(true);
      setBackendError(null);
      const docs = await documentsService.getDocuments();
      setDocuments(docs);
    } catch (err: unknown) {
      console.error('Failed to load documents:', err);
      if (err instanceof ApiError) {
        setBackendError({ status: err.status, endpoint: err.endpoint, message: err.message });
      } else {
        setBackendError({ status: 0, endpoint: '/documents', message: (err as Error).message });
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDocuments();
    casesService.getCases().then((list) => {
      if (list && list.length > 0 && list[0]?.id) {
        setActiveCaseId(list[0].id);
      }
    }).catch(() => {});
  }, []);

  const handleUploadComplete = async (
    caseId: string,
    file: File,
    metadata: { title: string; documentType: string; description: string; uploadedBy: string }
  ) => {
    await documentsService.uploadDocument(caseId, file, metadata);
    setIsUploadOpen(false);
    await fetchDocuments();
  };

  const filteredDocs = documents.filter((doc) => {
    const q = searchQuery.toLowerCase();
    const titleMatch = (doc.title || '').toLowerCase().includes(q);
    const hashMatch = (doc.sha256 || '').toLowerCase().includes(q);
    const typeMatch = (doc.file_type || '').toLowerCase().includes(q);
    const caseNumMatch = (doc.case_number || '').toLowerCase().includes(q);
    const caseIdMatch = (doc.case_id || '').toLowerCase().includes(q);
    const matchesSearch = titleMatch || hashMatch || typeMatch || caseNumMatch || caseIdMatch;

    const matchesType =
      typeFilter === 'ALL' || (doc.document_type || '').toUpperCase().includes(typeFilter);

    return matchesSearch && matchesType;
  });

  return (
    <AppShell>
      <div className="space-y-6 animate-fade-in max-w-[1520px] mx-auto">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-moss-border">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl lg:text-3xl font-serif font-bold text-primary">
                Legal Document Repository
              </h1>
              <span className="bg-[#C3E8D2] text-[#1B3B2B] text-xs px-2.5 py-0.5 rounded-full font-semibold flex items-center gap-1 border border-[#6B8E7B]/40">
                <span className="material-symbols-outlined text-[14px]">verified</span>
                SHA-256 Sealed
              </span>
            </div>
            <p className="text-sm text-forest-ink/70 mt-1">
              Court-admissible digital records: FIRs, charge sheets, CFSL forensic reports, and witness statements
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={fetchDocuments}
              className="px-3 py-2 bg-surface-container hover:bg-surface-container-high text-forest-ink border border-moss-border rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-xs"
            >
              <span className={`material-symbols-outlined text-base ${loading ? 'animate-spin' : ''}`}>
                refresh
              </span>
              <span>Refresh</span>
            </button>
            <button
              onClick={() => setIsUploadOpen(true)}
              className="px-3.5 py-2 bg-[#243B35] hover:bg-[#162521] text-[#FFF9ED] rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-xs"
            >
              <span className="material-symbols-outlined text-base text-[#B7C9B1]">upload_file</span>
              <span>Deposit Document</span>
            </button>
          </div>
        </div>

        {/* Search and Filters */}
        <div className="bg-surface-bright p-4 rounded-xl border border-moss-border shadow-xs flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="relative w-full md:w-96">
            <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-forest-ink/50 text-[19px]">
              search
            </span>
            <input
              className="w-full h-9 pl-9 pr-3 bg-surface-container-low border border-moss-border text-forest-ink placeholder:text-forest-ink/50 text-xs rounded-lg focus:outline-none focus:border-primary focus:bg-surface-bright transition-all"
              placeholder="Search by title, SHA-256 checksum, or case reference..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          <div className="flex items-center gap-2 w-full md:w-auto justify-end">
            <span className="material-symbols-outlined text-forest-ink/50 text-[18px]">
              tune
            </span>
            <select
              className="text-xs bg-surface-container-low border border-moss-border rounded-lg px-2.5 py-2 text-forest-ink focus:ring-1 focus:ring-primary"
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
            >
              <option value="ALL">All Statutory Types</option>
              <option value="FIRST_INFORMATION_REPORT">First Information Reports (FIR)</option>
              <option value="CHARGE_SHEET">Charge Sheets (u/s 173 CrPC)</option>
              <option value="CFSL_FORENSIC_REPORT">CFSL Forensic Reports</option>
              <option value="WITNESS_STATEMENT">Witness Depositions (u/s 161/164)</option>
              <option value="SEIZURE_MEMO">Seizure Memos &amp; Panchnamas</option>
            </select>
          </div>
        </div>

        {/* Document List */}
        {loading ? (
          <div className="p-16 text-center text-forest-ink/60 text-sm">
            <div className="animate-spin w-8 h-8 border-2 border-primary border-t-transparent rounded-full mx-auto mb-3"></div>
            Loading sealed legal repository...
          </div>
        ) : backendError ? (
          <BackendUnavailable
            moduleName="Legal Document Repository"
            endpoint={backendError.endpoint}
            status={backendError.status}
            errorMessage={backendError.message}
            onRetry={fetchDocuments}
          />
        ) : (
          <DocumentList
            documents={filteredDocs}
            onSelect={(doc) => navigate(`/documents/${doc.id}`)}
          />
        )}
      </div>

      {/* Upload Modal */}
      <DocumentUpload
        isOpen={isUploadOpen}
        onClose={() => setIsUploadOpen(false)}
        caseId={activeCaseId}
        onUpload={handleUploadComplete}
      />
    </AppShell>
  );
};
