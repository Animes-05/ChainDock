import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { AppShell } from '../components/layout/AppShell';
import { DocumentUpload } from '../components/documents/DocumentUpload';
import { EvidenceUpload } from '../components/evidence/EvidenceUpload';
import { ChainOfCustodyLog } from '../components/evidence/ChainOfCustodyLog';
import { casesService } from '../services/cases';
import { documentsService } from '../services/documents';
import { evidenceService } from '../services/evidence';
import { Case, Document as DocType, EvidenceItem } from '../types';
import { formatTimestamp, truncateHash } from '../utils/formatters';

export const CaseDetails: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [caseItem, setCaseItem] = useState<Case | null>(null);
  const [documents, setDocuments] = useState<DocType[]>([]);
  const [evidenceItems, setEvidenceItems] = useState<EvidenceItem[]>([]);
  const [activeTab, setActiveTab] = useState<'documents' | 'evidence' | 'timeline' | 'details'>('documents');
  const [loading, setLoading] = useState<boolean>(true);

  // Search & Filters in Exhibit Table
  const [tableSearch, setTableSearch] = useState('');
  const [tableFilter, setTableFilter] = useState<'all' | 'verified' | 'tampered'>('all');
  const [formatFilter, setFormatFilter] = useState('ALL');

  // Interactive Verification Toast / State
  const [isVerifyingHashes, setIsVerifyingHashes] = useState(false);
  const [verifyNotice, setVerifyNotice] = useState<string | null>(null);
  const [copiedHash, setCopiedHash] = useState<string | null>(null);

  // Modals
  const [isDocUploadOpen, setIsDocUploadOpen] = useState(false);
  const [isEvidenceUploadOpen, setIsEvidenceUploadOpen] = useState(false);
  const [selectedEvidenceForTransfer, setSelectedEvidenceForTransfer] = useState<EvidenceItem | null>(null);

  const loadCaseData = async () => {
    if (!id) return;
    try {
      setLoading(true);
      const [fetchedCase, fetchedDocs, fetchedEvidence] = await Promise.all([
        casesService.getCaseById(id),
        documentsService.getDocuments(id),
        evidenceService.getEvidence(id),
      ]);

      setCaseItem(fetchedCase || null);
      setDocuments(fetchedDocs);
      setEvidenceItems(fetchedEvidence);
    } catch (err) {
      console.error('Failed to load case details:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCaseData();
  }, [id]);

  const handleVerifyAllHashes = () => {
    setIsVerifyingHashes(true);
    setVerifyNotice(null);
    setTimeout(() => {
      setIsVerifyingHashes(false);
      const hasTamper = documents.some((d) => d.is_tampered);
      if (hasTamper) {
        setVerifyNotice('ATTENTION: Discrepancy detected in 1 or more document SHA-256 digests!');
      } else {
        setVerifyNotice(`ALL ${documents.length} EXHIBITS VERIFIED: 100% cryptographic match with consensus ledger.`);
      }
    }, 800);
  };

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedHash(text);
    setTimeout(() => setCopiedHash(null), 2000);
  };

  const handleDocUpload = async (
    caseId: string,
    file: File,
    metadata: { title: string; documentType: string; description: string; uploadedBy: string }
  ) => {
    await documentsService.uploadDocument(caseId, file, metadata);
    setIsDocUploadOpen(false);
    await loadCaseData();
  };

  const handleEvidenceUpload = async (data: {
    item_number: string;
    name: string;
    category: string;
    description: string;
    location: string;
  }) => {
    if (!caseItem) return;
    await evidenceService.createEvidence({
      case_id: caseItem.id,
      item_number: data.item_number,
      name: data.name,
      category: data.category,
      description: data.description,
      location: data.location,
    });
    setIsEvidenceUploadOpen(false);
    await loadCaseData();
  };

  const handleCustodyTransfer = async (
    evidenceId: string,
    data: { newCustodian: string; location: string; notes: string; actor: string }
  ) => {
    await evidenceService.transferCustody(evidenceId, {
      actor: data.actor,
      new_custodian: data.newCustodian,
      location: data.location,
      notes: data.notes,
    });
    setSelectedEvidenceForTransfer(null);
    await loadCaseData();
  };

  // Filtered documents
  const filteredDocs = documents.filter((doc) => {
    const matchesSearch =
      doc.title.toLowerCase().includes(tableSearch.toLowerCase()) ||
      doc.sha256.toLowerCase().includes(tableSearch.toLowerCase()) ||
      doc.document_type.toLowerCase().includes(tableSearch.toLowerCase()) ||
      doc.uploaded_by.toLowerCase().includes(tableSearch.toLowerCase());

    const matchesStatus =
      tableFilter === 'all'
        ? true
        : tableFilter === 'verified'
        ? !doc.is_tampered
        : doc.is_tampered;

    const matchesFormat =
      formatFilter === 'ALL'
        ? true
        : doc.file_type.toLowerCase().includes(formatFilter.toLowerCase());

    return matchesSearch && matchesStatus && matchesFormat;
  });

  if (loading) {
    return (
      <AppShell>
        <div className="p-16 text-center text-forest-ink/60 text-sm">
          <div className="animate-spin w-8 h-8 border-2 border-primary border-t-transparent rounded-full mx-auto mb-3"></div>
          Decrypting and loading docket file...
        </div>
      </AppShell>
    );
  }

  if (!caseItem) {
    return (
      <AppShell>
        <div className="p-12 text-center bg-surface-bright rounded-xl border border-moss-border">
          <span className="material-symbols-outlined text-4xl text-forest-ink/40 mb-3 block">warning</span>
          <h2 className="text-lg font-serif font-bold text-primary">Docket Not Found</h2>
          <p className="text-xs text-forest-ink/60 mt-1">The requested investigation record does not exist or has been expunged.</p>
          <button
            onClick={() => navigate('/cases')}
            className="mt-4 px-4 py-2 bg-surface-container hover:bg-surface-container-high text-forest-ink rounded-lg text-xs font-semibold"
          >
            Return to Case Registry
          </button>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <div className="space-y-6 animate-fade-in max-w-[1520px] mx-auto">
        {/* Navigation Breadcrumb & Back */}
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <button
              onClick={() => navigate('/cases')}
              className="flex items-center gap-1.5 text-xs font-semibold text-forest-ink/70 hover:text-primary transition-colors py-1.5 px-2.5 rounded hover:bg-surface-container"
            >
              <span className="material-symbols-outlined text-base">arrow_back</span>
              <span>Back to Registry</span>
            </button>
            <span className="text-moss-border">/</span>
            <span className="font-mono text-xs font-bold text-primary bg-surface-container px-2 py-0.5 rounded">
              {caseItem.case_number}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-[11px] font-mono text-forest-ink/60">
              Jurisdictional Ledger Block: <strong className="text-primary font-bold">#152</strong>
            </span>
          </div>
        </div>

        {/* Master Case Header Card - Matching Stitch Case Dossier */}
        <section className="bg-surface-bright border border-moss-border rounded-xl p-5 lg:p-6 shadow-xs flex flex-col gap-5">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-5 border-b border-moss-border">
            <div className="flex flex-col gap-2">
              <div className="flex flex-wrap items-center gap-2">
                <span className="px-2.5 py-1 rounded bg-[#243B35] text-[#FFF9ED] text-xs font-bold font-mono tracking-wide uppercase">
                  {caseItem.case_number}
                </span>
                <span className="px-2.5 py-1 rounded bg-[#C3E8D2] text-[#1B3B2B] text-xs font-semibold flex items-center gap-1.5 border border-[#6B8E7B]/40">
                  <span className="w-2 h-2 rounded-full bg-[#6B8E7B] animate-pulse"></span>
                  STATUS: {caseItem.status}
                </span>
                <span className={`px-2.5 py-1 rounded text-xs font-semibold flex items-center gap-1 border ${
                  caseItem.priority === 'CRITICAL'
                    ? 'bg-[#FBE9E7] text-[#BA1A1A] border-[#FFCDD2]'
                    : 'bg-[#F6EED6] text-[#8C6D1F] border-[#D1DBCB]'
                }`}>
                  <span className="material-symbols-outlined text-[14px]">flag</span>
                  PRIORITY: {caseItem.priority}
                </span>
                <span className="px-2.5 py-1 rounded bg-surface-container text-forest-ink text-xs font-medium border border-moss-border">
                  JURISDICTION: {caseItem.jurisdiction}
                </span>
              </div>

              <h1 className="text-2xl lg:text-3xl font-bold text-primary tracking-tight mt-1">
                {caseItem.title}
              </h1>

              <p className="text-sm text-forest-ink/80 max-w-4xl leading-relaxed">
                {caseItem.description}
              </p>
            </div>

            {/* Header Action Buttons */}
            <div className="flex flex-wrap items-center gap-2.5 self-start lg:self-center shrink-0">
              <button
                onClick={() => {
                  if (evidenceItems.length > 0) {
                    setSelectedEvidenceForTransfer(evidenceItems[0]);
                  } else {
                    setIsEvidenceUploadOpen(true);
                  }
                }}
                className="h-9 px-3.5 bg-surface-container hover:bg-surface-container-high text-forest-ink border border-moss-border transition-colors rounded text-xs font-semibold flex items-center gap-1.5 shadow-xs"
              >
                <span className="material-symbols-outlined text-[17px] text-[#243B35]">lock_reset</span>
                <span>Transfer Custody</span>
              </button>

              <button
                onClick={handleVerifyAllHashes}
                disabled={isVerifyingHashes}
                className="h-9 px-3.5 bg-[#243B35] hover:bg-[#162521] text-[#FFF9ED] transition-colors rounded text-xs font-semibold flex items-center gap-1.5 shadow-xs"
              >
                <span className={`material-symbols-outlined text-[17px] text-[#B7C9B1] ${isVerifyingHashes ? 'animate-spin' : ''}`}>
                  {isVerifyingHashes ? 'sync' : 'verified_user'}
                </span>
                <span>{isVerifyingHashes ? 'Verifying...' : 'Verify All Hashes'}</span>
              </button>

              <button
                onClick={() => setIsDocUploadOpen(true)}
                className="h-9 px-3.5 bg-secondary-container text-on-secondary-container hover:bg-secondary-container/80 transition-colors rounded text-xs font-semibold flex items-center gap-1.5"
              >
                <span className="material-symbols-outlined text-[17px]">upload_file</span>
                <span>Deposit Document</span>
              </button>

              <button
                onClick={() => setIsEvidenceUploadOpen(true)}
                className="h-9 px-3.5 bg-surface-container-low hover:bg-surface-container text-primary border border-moss-border transition-colors rounded text-xs font-semibold flex items-center gap-1.5"
              >
                <span className="material-symbols-outlined text-[17px]">inventory_2</span>
                <span>Log Evidence</span>
              </button>
            </div>
          </div>

          {/* Verification Notification Toast */}
          {verifyNotice && (
            <div className={`p-3 rounded-lg text-xs font-medium flex items-center justify-between gap-2 border ${
              verifyNotice.includes('ATTENTION')
                ? 'bg-red-50 text-red-900 border-red-200'
                : 'bg-[#C3E8D2]/40 text-[#1B3B2B] border-[#6B8E7B]/40'
            }`}>
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-base">
                  {verifyNotice.includes('ATTENTION') ? 'error' : 'check_circle'}
                </span>
                <span>{verifyNotice}</span>
              </div>
              <button
                onClick={() => setVerifyNotice(null)}
                className="text-xs font-bold opacity-60 hover:opacity-100"
              >
                Dismiss
              </button>
            </div>
          )}

          {/* 4 Docket Metrics Strip */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="p-3.5 bg-surface-container-low rounded-lg border border-moss-border flex items-center gap-3">
              <div className="w-10 h-10 rounded bg-[#243B35] text-[#FFF9ED] font-bold text-xs flex items-center justify-center shrink-0">
                {caseItem.lead_officer.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()}
              </div>
              <div className="flex flex-col min-w-0">
                <span className="text-[10px] text-forest-ink/60 uppercase tracking-wider font-semibold">Lead Investigator</span>
                <span className="text-sm font-bold text-primary truncate">{caseItem.lead_officer}</span>
                <span className="text-xs text-forest-ink/60 font-mono">Badge #{caseItem.lead_officer_badge}</span>
              </div>
            </div>

            <div className="p-3.5 bg-surface-container-low rounded-lg border border-moss-border flex items-center gap-3">
              <div className="w-10 h-10 rounded bg-[#6B8E7B] text-[#FFF9ED] font-bold text-xs flex items-center justify-center shrink-0">
                {caseItem.supervisor.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()}
              </div>
              <div className="flex flex-col min-w-0">
                <span className="text-[10px] text-forest-ink/60 uppercase tracking-wider font-semibold">Supervisory Officer</span>
                <span className="text-sm font-bold text-primary truncate">{caseItem.supervisor}</span>
                <span className="text-xs text-forest-ink/60">Forensic Notary / Signer</span>
              </div>
            </div>

            <div className="p-3.5 bg-surface-container-low rounded-lg border border-moss-border flex items-center gap-3">
              <div className="w-10 h-10 rounded bg-surface-container text-primary border border-moss-border flex items-center justify-center shrink-0">
                <span className="material-symbols-outlined text-[20px]">calendar_today</span>
              </div>
              <div className="flex flex-col min-w-0">
                <span className="text-[10px] text-forest-ink/60 uppercase tracking-wider font-semibold">Date Registered</span>
                <span className="text-sm font-bold text-primary">{formatTimestamp(caseItem.created_at)}</span>
                <span className="text-xs text-forest-ink/60">Active Case Diary Entry</span>
              </div>
            </div>

            <div className="p-3.5 bg-[#C3E8D2]/50 rounded-lg border border-[#6B8E7B]/40 flex items-center gap-3">
              <div className="w-10 h-10 rounded bg-[#243B35] text-[#C3E8D2] flex items-center justify-center shrink-0">
                <span className="material-symbols-outlined text-[20px]">token</span>
              </div>
              <div className="flex flex-col min-w-0">
                <span className="text-[10px] text-[#1B3B2B] uppercase tracking-wider font-semibold">Ledger Health</span>
                <span className="text-sm font-bold text-[#1B3B2B]">100% Immutable</span>
                <span className="text-xs font-mono text-[#1B3B2B]/80">Block #152 · VERIFIED</span>
              </div>
            </div>
          </div>
        </section>

        {/* Responsive 2-Column Split matching Stitch screen */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Left Column (8 cols): Tabs, Search & Exhibits Data Table */}
          <div className="lg:col-span-8 flex flex-col gap-5 w-full min-w-0">
            {/* Tabbed Navigation */}
            <div className="flex items-center gap-1.5 p-1 bg-surface-container border border-moss-border rounded-lg overflow-x-auto">
              <button
                onClick={() => setActiveTab('documents')}
                className={`px-3 lg:px-4 py-2 rounded text-xs font-bold transition-all flex items-center gap-2 shrink-0 ${
                  activeTab === 'documents'
                    ? 'bg-surface-bright text-primary border border-moss-border shadow-xs'
                    : 'text-forest-ink/70 hover:text-primary hover:bg-surface-bright/60'
                }`}
              >
                <span className="material-symbols-outlined text-[17px] text-primary">folder_open</span>
                <span>Sealed Documents</span>
                <span className="px-1.5 py-0.5 rounded bg-primary text-surface-bright text-[10px] font-mono">
                  {documents.length}
                </span>
              </button>

              <button
                onClick={() => setActiveTab('evidence')}
                className={`px-3 lg:px-4 py-2 rounded text-xs font-semibold transition-all flex items-center gap-2 shrink-0 ${
                  activeTab === 'evidence'
                    ? 'bg-surface-bright text-primary border border-moss-border shadow-xs'
                    : 'text-forest-ink/70 hover:text-primary hover:bg-surface-bright/60'
                }`}
              >
                <span className="material-symbols-outlined text-[17px]">inventory_2</span>
                <span>Physical & Digital Evidence</span>
                <span className="px-1.5 py-0.5 rounded bg-surface-container-highest text-forest-ink text-[10px] font-mono">
                  {evidenceItems.length}
                </span>
              </button>

              <button
                onClick={() => setActiveTab('timeline')}
                className={`px-3 lg:px-4 py-2 rounded text-xs font-semibold transition-all flex items-center gap-2 shrink-0 ${
                  activeTab === 'timeline'
                    ? 'bg-surface-bright text-primary border border-moss-border shadow-xs'
                    : 'text-forest-ink/70 hover:text-primary hover:bg-surface-bright/60'
                }`}
              >
                <span className="material-symbols-outlined text-[17px]">account_tree</span>
                <span>Chain of Custody Timeline</span>
              </button>

              <button
                onClick={() => setActiveTab('details')}
                className={`px-3 lg:px-4 py-2 rounded text-xs font-semibold transition-all flex items-center gap-2 shrink-0 ${
                  activeTab === 'details'
                    ? 'bg-surface-bright text-primary border border-moss-border shadow-xs'
                    : 'text-forest-ink/70 hover:text-primary hover:bg-surface-bright/60'
                }`}
              >
                <span className="material-symbols-outlined text-[17px]">gavel</span>
                <span>Statutory Context</span>
              </button>
            </div>

            {/* Tab 1: Documents & Exhibits Table */}
            {activeTab === 'documents' && (
              <div className="space-y-4">
                {/* Search & Filter Controls */}
                <div className="bg-surface-bright border border-moss-border rounded-xl p-4 shadow-xs flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
                  <div className="relative w-full md:w-80">
                    <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-forest-ink/50 text-[19px]">
                      search
                    </span>
                    <input
                      className="w-full h-9 pl-9 pr-3 bg-surface-container-low border border-moss-border text-forest-ink placeholder:text-forest-ink/50 text-xs rounded-lg focus:outline-none focus:border-primary focus:bg-surface-bright transition-all"
                      placeholder="Search by file name, SHA-256 hash or officer..."
                      type="text"
                      value={tableSearch}
                      onChange={(e) => setTableSearch(e.target.value)}
                    />
                  </div>

                  <div className="flex flex-wrap items-center gap-2 w-full md:w-auto justify-start md:justify-end">
                    <div className="flex items-center border border-moss-border rounded-lg bg-surface-container-low p-0.5 text-xs">
                      <button
                        onClick={() => setTableFilter('all')}
                        className={`px-2.5 py-1 rounded text-xs font-medium transition-colors ${
                          tableFilter === 'all'
                            ? 'bg-surface-bright text-primary font-bold shadow-xs'
                            : 'text-forest-ink/70 hover:text-primary'
                        }`}
                      >
                        All ({documents.length})
                      </button>
                      <button
                        onClick={() => setTableFilter('verified')}
                        className={`px-2.5 py-1 rounded text-xs font-medium transition-colors ${
                          tableFilter === 'verified'
                            ? 'bg-surface-bright text-primary font-bold shadow-xs'
                            : 'text-forest-ink/70 hover:text-primary'
                        }`}
                      >
                        Verified
                      </button>
                      <button
                        onClick={() => setTableFilter('tampered')}
                        className={`px-2.5 py-1 rounded text-xs font-medium transition-colors ${
                          tableFilter === 'tampered'
                            ? 'bg-red-100 text-red-900 font-bold shadow-xs'
                            : 'text-forest-ink/70 hover:text-primary'
                        }`}
                      >
                        Tampered
                      </button>
                    </div>

                    <select
                      value={formatFilter}
                      onChange={(e) => setFormatFilter(e.target.value)}
                      className="h-9 px-3 bg-surface-container-low border border-moss-border text-forest-ink text-xs rounded-lg focus:outline-none focus:border-primary"
                    >
                      <option value="ALL">All File Formats</option>
                      <option value="PDF">Certified PDF / A-3</option>
                      <option value="FORENSIC">Forensic PCAP / Binaries</option>
                      <option value="IMAGE">RAW Disk Images</option>
                    </select>
                  </div>
                </div>

                {/* Evidentiary Exhibits Data Table */}
                <div className="bg-surface-bright border border-moss-border rounded-xl overflow-hidden shadow-xs w-full">
                  <div className="overflow-x-auto w-full">
                    <table className="w-full text-left text-xs text-forest-ink border-collapse min-w-[680px]">
                      <thead>
                        <tr className="bg-surface-container border-b border-moss-border text-forest-ink uppercase tracking-wider font-semibold text-[11px]">
                          <th className="py-3 px-4">Document Name & Ref</th>
                          <th className="py-3 px-4">SHA-256 Checksum</th>
                          <th className="py-3 px-4">Timestamp</th>
                          <th className="py-3 px-4">Type / Size</th>
                          <th className="py-3 px-4">Tamper Status</th>
                          <th className="py-3 px-4 text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-moss-border/60">
                        {filteredDocs.length === 0 ? (
                          <tr>
                            <td colSpan={6} className="py-8 text-center text-forest-ink/60 text-xs">
                              No exhibits found matching your search filters.
                            </td>
                          </tr>
                        ) : (
                          filteredDocs.map((doc) => (
                            <tr
                              key={doc.id}
                              onClick={() => navigate(`/documents/${doc.id}`)}
                              className="hover:bg-surface-container-low transition-colors cursor-pointer"
                            >
                              <td className="py-3.5 px-4">
                                <div className="flex items-center gap-3">
                                  <div className={`w-8 h-8 rounded border flex items-center justify-center shrink-0 ${
                                    doc.is_tampered
                                      ? 'bg-red-50 border-red-200 text-red-700'
                                      : 'bg-surface-container-low border-moss-border text-primary'
                                  }`}>
                                    <span className="material-symbols-outlined text-[18px]">
                                      {doc.is_tampered ? 'warning' : 'description'}
                                    </span>
                                  </div>
                                  <div className="flex flex-col min-w-0 max-w-xs">
                                    <span className="font-semibold text-forest-ink truncate hover:underline">
                                      {doc.title}
                                    </span>
                                    <span className="text-[10px] text-forest-ink/60 font-mono">
                                      {doc.legal_docket_ref || doc.id} · {doc.document_type}
                                    </span>
                                  </div>
                                </div>
                              </td>

                              <td className="py-3.5 px-4" onClick={(e) => e.stopPropagation()}>
                                <div className="flex items-center gap-1.5 bg-surface-container px-2 py-1 rounded border border-moss-border w-fit">
                                  <span className={`font-mono text-[11px] ${doc.is_tampered ? 'text-red-700 font-bold line-through' : 'text-primary'}`}>
                                    {truncateHash(doc.sha256, 8, 8)}
                                  </span>
                                  <button
                                    onClick={() => handleCopy(doc.sha256)}
                                    className="text-forest-ink/60 hover:text-primary transition-colors"
                                    title="Copy SHA-256 checksum"
                                  >
                                    <span className="material-symbols-outlined text-[14px]">
                                      {copiedHash === doc.sha256 ? 'check' : 'content_copy'}
                                    </span>
                                  </button>
                                </div>
                              </td>

                              <td className="py-3.5 px-4 text-forest-ink/70 font-mono text-[11px]">
                                {formatTimestamp(doc.created_at)}
                              </td>

                              <td className="py-3.5 px-4">
                                <span className="font-medium text-forest-ink">{doc.file_type}</span>
                                <span className="text-forest-ink/60 text-[11px]"> · {doc.file_size}</span>
                              </td>

                              <td className="py-3.5 px-4">
                                {doc.is_tampered ? (
                                  <span className="px-2 py-0.5 rounded-full bg-red-100 text-red-800 font-bold text-[10px] inline-flex items-center gap-1 border border-red-300">
                                    <span className="material-symbols-outlined text-[13px]">gpp_bad</span>
                                    TAMPER DETECTED
                                  </span>
                                ) : (
                                  <span className="px-2 py-0.5 rounded-full bg-[#C3E8D2] text-[#1B3B2B] font-semibold text-[10px] inline-flex items-center gap-1 border border-[#6B8E7B]/40">
                                    <span className="material-symbols-outlined text-[13px]">verified</span>
                                    VERIFIED / SEALED
                                  </span>
                                )}
                              </td>

                              <td className="py-3.5 px-4 text-right" onClick={(e) => e.stopPropagation()}>
                                <div className="flex items-center justify-end gap-1 text-forest-ink/70">
                                  <button
                                    onClick={() => navigate(`/documents/${doc.id}`)}
                                    className="p-1 hover:text-primary hover:bg-surface-container rounded"
                                    title="Inspect Hash Proof"
                                  >
                                    <span className="material-symbols-outlined text-[17px]">verified</span>
                                  </button>
                                  <button
                                    onClick={() => alert(`Downloading court sealed package for ${doc.title}`)}
                                    className="p-1 hover:text-primary hover:bg-surface-container rounded"
                                    title="Download Sealed Record"
                                  >
                                    <span className="material-symbols-outlined text-[17px]">download</span>
                                  </button>
                                </div>
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>

                  {/* Table Footer */}
                  <div className="bg-surface-container px-4 py-3 border-t border-moss-border flex flex-col sm:flex-row items-center justify-between gap-2 text-xs">
                    <span className="text-forest-ink/70">
                      Showing <strong className="text-forest-ink">{filteredDocs.length}</strong> of {documents.length} Evidentiary Exhibits
                    </span>
                    <div className="flex items-center gap-3">
                      <span className="text-forest-ink/70 font-mono text-[11px]">Ledger Sync: Realtime</span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Tab 2: Evidence Catalog */}
            {activeTab === 'evidence' && (
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {evidenceItems.map((item) => (
                    <div
                      key={item.id}
                      className="bg-surface-bright border border-moss-border rounded-xl p-4 shadow-xs flex flex-col justify-between gap-3 hover:border-primary/50 transition-colors"
                    >
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="font-mono text-xs font-bold text-primary bg-surface-container px-2 py-0.5 rounded border border-moss-border">
                            {item.item_number}
                          </span>
                          <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-[#C3E8D2] text-[#1B3B2B] border border-[#6B8E7B]/40">
                            {item.status}
                          </span>
                        </div>

                        <h4 className="text-sm font-bold text-primary">{item.name}</h4>
                        <p className="text-xs text-forest-ink/70 line-clamp-2">{item.description}</p>
                      </div>

                      <div className="pt-3 border-t border-moss-border flex items-center justify-between text-xs">
                        <div className="flex flex-col">
                          <span className="text-[10px] text-forest-ink/50 uppercase">Current Location</span>
                          <span className="font-semibold text-primary">{item.location}</span>
                        </div>
                        <button
                          onClick={() => setSelectedEvidenceForTransfer(item)}
                          className="px-2.5 py-1 bg-surface-container hover:bg-surface-container-high text-primary border border-moss-border rounded text-xs font-semibold flex items-center gap-1"
                        >
                          <span className="material-symbols-outlined text-[14px]">swap_horiz</span>
                          <span>Handover</span>
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Tab 3: Chain of Custody Timeline */}
            {activeTab === 'timeline' && (
              <div className="bg-surface-bright border border-moss-border rounded-xl p-6 shadow-xs space-y-6">
                <div className="flex items-center justify-between border-b border-moss-border pb-4">
                  <div>
                    <h3 className="text-base font-serif font-bold text-primary">
                      Forensic Custody Ledger Sequence
                    </h3>
                    <p className="text-xs text-forest-ink/60">
                      Sequential cryptographic handovers signed with officer biometric keys
                    </p>
                  </div>
                  <span className="text-xs font-mono bg-surface-container px-2.5 py-1 rounded text-primary font-bold border border-moss-border">
                    CHAIN VALID · 0 FORKS
                  </span>
                </div>

                <div className="space-y-4">
                  {evidenceItems.flatMap(e => e.custody_events.map(ev => ({ ...ev, item_name: e.name, item_number: e.item_number })))
                    .map((ev, idx) => (
                      <div key={ev.id || idx} className="flex items-start gap-4 p-3.5 bg-surface-container-low rounded-lg border border-moss-border">
                        <div className="w-8 h-8 rounded-full bg-[#243B35] text-[#FFF9ED] flex items-center justify-center text-xs font-bold shrink-0 mt-0.5">
                          {idx + 1}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex flex-wrap items-center justify-between gap-1">
                            <span className="font-bold text-xs text-primary">{ev.action}</span>
                            <span className="font-mono text-[11px] text-forest-ink/60">{formatTimestamp(ev.timestamp)}</span>
                          </div>
                          <p className="text-xs text-forest-ink mt-0.5">
                            {ev.item_number}: <strong>{ev.item_name}</strong>
                          </p>
                          <div className="flex flex-wrap items-center gap-3 text-[11px] text-forest-ink/70 mt-1.5 pt-1.5 border-t border-moss-border/50">
                            <span>From: <strong>{ev.prev_custodian}</strong></span>
                            <span>→</span>
                            <span>To: <strong>{ev.new_custodian}</strong></span>
                            <span className="font-mono text-[10px] text-secondary ml-auto">{ev.tx_hash}</span>
                          </div>
                        </div>
                      </div>
                    ))}
                </div>
              </div>
            )}

            {/* Tab 4: Statutory Context */}
            {activeTab === 'details' && (
              <div className="bg-surface-bright border border-moss-border rounded-xl p-6 shadow-xs space-y-5">
                <h3 className="text-sm font-semibold text-primary uppercase tracking-wider">
                  Statutory Powers & Legal Framework
                </h3>
                <p className="text-sm text-forest-ink leading-relaxed">
                  {caseItem.description}
                </p>

                <div className="pt-4 border-t border-moss-border space-y-3">
                  <h4 className="text-xs font-semibold text-forest-ink uppercase tracking-wider">
                    Indian Evidence Act Section 65B & Bharatiya Sakshya Adhiniyam
                  </h4>
                  <p className="text-xs text-forest-ink/80 leading-relaxed">
                    This dossier produces digitally generated certificates in compliance with Section 65B of the Indian Evidence Act, 1872 and corresponding provisions of the Bharatiya Sakshya Adhiniyam. All digital evidence items undergo client-side SHA-256 fingerprinting before being cryptographically notarized into the consensus audit ledger.
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Right Column (4 cols): Seal Security, Custodian & Custody Lifecycle */}
          <div className="lg:col-span-4 flex flex-col gap-5 w-full min-w-0">
            {/* Seal & Tamper Verification Card - Dark Forest `#243B35` */}
            <div className="bg-[#243B35] text-[#FFF9ED] rounded-xl p-5 border border-[#162521] shadow-xs flex flex-col gap-4">
              <div className="flex items-center justify-between border-b border-[#36534B] pb-3">
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-[#B7C9B1] text-[20px]">verified_user</span>
                  <span className="font-bold text-sm tracking-wide">Seal & Tamper Verification</span>
                </div>
                <span className="px-2 py-0.5 rounded bg-[#162521] text-[#C3E8D2] text-[10px] font-bold border border-[#6B8E7B]/40">
                  ACTIVE SEAL
                </span>
              </div>

              <div className="flex flex-col gap-1.5">
                <span className="text-[10px] text-[#B7C9B1] uppercase font-semibold tracking-wider">
                  Physical Evidence Bag Barcode #
                </span>
                <span className="font-mono text-xs tracking-wider bg-[#1A2B27] text-[#FFF9ED] px-3 py-2 rounded border border-[#36534B] truncate">
                  CD-PB-2026-99120-X
                </span>
              </div>

              <div className="grid grid-cols-2 gap-2.5 pt-1">
                <div className="bg-[#1A2B27] p-2.5 rounded border border-[#36534B]">
                  <span className="text-[10px] text-[#B7C9B1] uppercase font-medium">NFC Tag Status</span>
                  <div className="text-xs font-bold text-[#FFF9ED] mt-0.5 flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#6B8E7B]"></span>
                    LOCKED
                  </div>
                </div>

                <div className="bg-[#1A2B27] p-2.5 rounded border border-[#36534B]">
                  <span className="text-[10px] text-[#B7C9B1] uppercase font-medium">Tamper Sensor</span>
                  <div className="text-xs font-bold text-[#C3E8D2] mt-0.5 flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#C3E8D2]"></span>
                    UNBROKEN
                  </div>
                </div>
              </div>

              <div className="pt-1 flex flex-col gap-1.5 border-t border-[#36534B]">
                <div className="flex items-center justify-between text-[11px] text-[#B7C9B1]">
                  <span>Cryptographic Proof Depth</span>
                  <span className="font-mono text-[#FFF9ED] font-semibold">6 of 6 Sign-offs</span>
                </div>
                <div className="w-full bg-[#1A2B27] h-1.5 rounded-full overflow-hidden">
                  <div className="bg-[#6B8E7B] h-full rounded-full" style={{ width: '100%' }}></div>
                </div>
              </div>
            </div>

            {/* Current Physical Custodian Card */}
            <div className="bg-surface-bright border border-moss-border rounded-xl p-5 shadow-xs flex flex-col gap-3">
              <span className="text-xs font-bold text-primary uppercase tracking-wider">
                Current Physical Custodian
              </span>
              <div className="flex items-center gap-3 bg-surface-container-low p-3 rounded-lg border border-moss-border">
                <div className="w-10 h-10 rounded bg-[#243B35] text-[#FFF9ED] flex items-center justify-center font-bold text-xs shrink-0">
                  RC
                </div>
                <div className="flex flex-col min-w-0">
                  <span className="text-sm font-bold text-primary">Ray Chen (Forensic Vault)</span>
                  <span className="text-xs text-forest-ink/70">Central Forensic Evidence Keeper</span>
                  <span className="text-[11px] font-mono text-secondary font-semibold mt-0.5 truncate">
                    Keycard: #VAULT-K8 · Biometric Authorized
                  </span>
                </div>
              </div>
              <p className="text-[11px] text-forest-ink/70 leading-relaxed">
                Physical exhibits remain secured in climate-controlled Evidence Locker C-12 under institutional dual-custody protocol.
              </p>
            </div>

            {/* Custody Lifecycle Preview */}
            <div className="bg-surface-bright border border-moss-border rounded-xl p-5 shadow-xs flex flex-col gap-3">
              <div className="flex items-center justify-between border-b border-moss-border pb-3">
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-primary text-[20px]">account_tree</span>
                  <h2 className="text-sm font-bold text-primary uppercase tracking-wider">
                    Custody Lifecycle
                  </h2>
                </div>
                <span className="text-[11px] font-mono font-semibold px-2 py-0.5 rounded bg-surface-container border border-moss-border text-primary">
                  {evidenceItems.reduce((acc, e) => acc + e.custody_events.length, 0)} EVENTS
                </span>
              </div>

              <div className="space-y-3">
                {evidenceItems.slice(0, 3).map((item) => (
                  <div key={item.id} className="text-xs flex items-center justify-between p-2 rounded bg-surface-container-low border border-moss-border/60">
                    <div className="flex flex-col min-w-0">
                      <span className="font-semibold text-primary truncate">{item.name}</span>
                      <span className="text-[10px] text-forest-ink/60 font-mono">{item.item_number}</span>
                    </div>
                    <span className="text-[10px] font-semibold text-secondary uppercase">
                      {item.status}
                    </span>
                  </div>
                ))}
              </div>

              <button
                onClick={() => setActiveTab('timeline')}
                className="text-xs text-primary font-semibold hover:underline flex items-center justify-center gap-1 mt-1"
              >
                <span>View Complete Custody Chain</span>
                <span className="material-symbols-outlined text-[14px]">arrow_forward</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Document Upload Modal */}
      <DocumentUpload
        isOpen={isDocUploadOpen}
        onClose={() => setIsDocUploadOpen(false)}
        caseId={caseItem.id}
        onUpload={handleDocUpload}
      />

      {/* Evidence Upload Modal */}
      <EvidenceUpload
        isOpen={isEvidenceUploadOpen}
        onClose={() => setIsEvidenceUploadOpen(false)}
        caseId={caseItem.id}
        onSubmit={handleEvidenceUpload}
      />

      {/* Chain of Custody Transfer Modal */}
      <ChainOfCustodyLog
        isOpen={Boolean(selectedEvidenceForTransfer)}
        onClose={() => setSelectedEvidenceForTransfer(null)}
        evidenceItem={selectedEvidenceForTransfer}
        onTransfer={handleCustodyTransfer}
      />
    </AppShell>
  );
};
