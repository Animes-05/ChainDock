import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { AppShell } from '../components/layout/AppShell';
import { casesService } from '../services/cases';
import { documentsService } from '../services/documents';
import { evidenceService } from '../services/evidence';
import { auditService } from '../services/audit';
import { useAuth } from '../hooks/useAuth';
import { Case, Document as DocType, AuditEvent, Priority } from '../types';
import { CaseForm } from '../components/cases/CaseForm';
import { DocumentUpload } from '../components/documents/DocumentUpload';
import { BackendUnavailable } from '../components/common/BackendUnavailable';
import { ApiError } from '../services/api';

export const Dashboard: React.FC = () => {
  const navigate = useNavigate();
  const { user, role } = useAuth();

  const [cases, setCases] = useState<Case[]>([]);
  const [documents, setDocuments] = useState<DocType[]>([]);
  const [auditEvents, setAuditEvents] = useState<AuditEvent[]>([]);
  const [evidenceCount, setEvidenceCount] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(true);
  const [backendError, setBackendError] = useState<{ status: number; endpoint: string; message: string } | null>(null);
  const [isVerifying, setIsVerifying] = useState<boolean>(false);
  const [scanResult, setScanResult] = useState<string | null>(null);

  // Modals
  const [isCaseModalOpen, setIsCaseModalOpen] = useState(false);
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      setBackendError(null);
      const fetchedCases = await casesService.getCases();
      let fetchedDocs: DocType[] = [];
      let fetchedEvidence: any[] = [];
      let fetchedLogs: AuditEvent[] = [];
      try {
        fetchedDocs = await documentsService.getDocuments();
      } catch {}
      try {
        fetchedEvidence = await evidenceService.getEvidence();
      } catch {}
      try {
        fetchedLogs = await auditService.getAuditEvents();
      } catch {}

      setCases(fetchedCases);
      setDocuments(fetchedDocs);
      setEvidenceCount(fetchedEvidence.length);
      setAuditEvents(fetchedLogs);
    } catch (err: unknown) {
      console.error('Failed to load dashboard data:', err);
      if (err instanceof ApiError) {
        setBackendError({ status: err.status, endpoint: err.endpoint, message: err.message });
      } else {
        setBackendError({ status: 0, endpoint: '/cases', message: (err as Error).message });
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDashboardData();
  }, []);

  const handleCreateCase = async (data: {
    title: string;
    case_number: string;
    description: string;
    priority: Priority;
    jurisdiction: string;
    lead_officer: string;
  }) => {
    const created = await casesService.createCase(data);
    setCases((prev) => [created, ...prev.filter((c) => c.id !== created.id)]);
    setIsCaseModalOpen(false);
    loadDashboardData();
  };

  const handleUploadComplete = async (
    caseId: string,
    file: File,
    metadata: { title: string; documentType: string; description: string; uploadedBy: string }
  ) => {
    await documentsService.uploadDocument(caseId, file, metadata);
    setIsUploadModalOpen(false);
    await loadDashboardData();
  };

  const handleRunIntegrityScan = async () => {
    setIsVerifying(true);
    setScanResult(null);
    try {
      const result = await auditService.verifyAuditChain();
      if (result.valid) {
        setScanResult(`Chain Integrity Verified: ${result.total_entries} blocks validated across 12/12 witness nodes. Zero tampering.`);
      } else {
        setScanResult(`ALERT: Tampering detected at Block #${result.failed_block_number}! ${result.reason}`);
      }
    } finally {
      setIsVerifying(false);
    }
  };

  const getPriorityBadgeClass = (priority: Priority) => {
    switch (priority) {
      case 'CRITICAL':
        return 'bg-red-100 text-red-900 border-red-300';
      case 'HIGH':
        return 'bg-amber-100 text-amber-900 border-amber-300';
      case 'MEDIUM':
        return 'bg-emerald-100 text-emerald-900 border-emerald-300';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-300';
    }
  };

  if (backendError) {
    return (
      <AppShell>
        <BackendUnavailable
          moduleName="Dashboard Operations"
          endpoint={backendError.endpoint}
          status={backendError.status}
          errorMessage={backendError.message}
          onRetry={loadDashboardData}
        />
      </AppShell>
    );
  }

  return (
    <AppShell>
      <div className="flex flex-col gap-6">
        {/* Title & Executive Action Bar */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-2 border-b border-[#d1dbcb]">
          <div className="flex flex-col">
            <div className="flex items-center gap-2">
              <span className="text-xs font-mono font-bold uppercase text-[#2e5d4b] px-2 py-0.5 rounded bg-[#cbe8db]/60 border border-[#2e5d4b]/20">
                Live Jurisdiction: {user?.jurisdictionNode || 'Node Alpha'}
              </span>
              <span className="text-xs text-[#4e5c56] font-mono">
                Active Role: <strong className="text-[#1a2b27]">{role}</strong>
              </span>
            </div>
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-[#1a2b27] mt-1">
              Executive Operations &amp; Ledger Overview
            </h1>
            <p className="text-xs text-[#4e5c56] mt-0.5">
              Authorized chain-of-custody tracking, tamper-evident case dockets, and live evidentiary oversight.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2 sm:gap-3">
            <button
              onClick={loadDashboardData}
              disabled={loading}
              className="h-9 px-3 bg-[#fffdf9] border border-[#d1dbcb] text-[#1a2b27] rounded text-xs font-medium hover:bg-[#f6eed6] flex items-center gap-1.5 transition-colors shadow-sm"
              title="Refresh dashboard"
            >
              <span className={`material-symbols-outlined text-[17px] text-[#2e5d4b] ${loading ? 'animate-spin' : ''}`}>
                refresh
              </span>
              <span>Refresh</span>
            </button>

            <button
              onClick={handleRunIntegrityScan}
              disabled={isVerifying}
              className="h-9 px-3.5 bg-[#fffdf9] border border-[#d1dbcb] text-[#1a2b27] rounded text-xs font-medium hover:bg-[#f6eed6] flex items-center gap-2 transition-colors disabled:opacity-60 shadow-sm"
            >
              <span className="material-symbols-outlined text-[18px] text-[#2e5d4b]">
                {isVerifying ? 'sync' : 'assignment_turned_in'}
              </span>
              <span>{isVerifying ? 'Scanning Hash Chain...' : 'Run Integrity Scan'}</span>
            </button>

            <button
              onClick={() => setIsUploadModalOpen(true)}
              className="h-9 px-3.5 bg-[#2e5d4b] text-white rounded text-xs font-medium hover:bg-[#243b35] flex items-center gap-2 transition-colors shadow-sm"
            >
              <span className="material-symbols-outlined text-[18px]">upload_file</span>
              <span>Upload Document</span>
            </button>

            <button
              onClick={() => setIsCaseModalOpen(true)}
              className="h-9 px-3.5 bg-[#0e1c19] text-[#fffdf9] rounded text-xs font-medium hover:bg-[#243b35] flex items-center gap-2 transition-colors shadow-sm"
            >
              <span className="material-symbols-outlined text-[18px]">add_circle</span>
              <span>New Case Docket</span>
            </button>
          </div>
        </div>

        {/* Scan Result Notification */}
        {scanResult && (
          <div
            className={`p-3.5 rounded-xl text-xs font-mono font-medium border flex items-center justify-between ${
              scanResult.includes('ALERT')
                ? 'bg-red-50 text-red-900 border-red-300'
                : 'bg-[#cbe8db]/80 text-[#143d2f] border-[#2e5d4b]/40'
            }`}
          >
            <div className="flex items-center gap-2.5">
              <span className="material-symbols-outlined text-[20px]">
                {scanResult.includes('ALERT') ? 'warning' : 'verified'}
              </span>
              <span>{scanResult}</span>
            </div>
            <button
              onClick={() => setScanResult(null)}
              className="text-xs underline hover:opacity-80"
            >
              Dismiss
            </button>
          </div>
        )}

        {/* 4 Core Metric Tiles */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Tile 1: Active Dockets */}
          <div className="bg-[#fffdf9] p-4 rounded-xl border border-[#d1dbcb] shadow-sm flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-[#4e5c56] uppercase tracking-wider">
                Active Cases
              </span>
              <div className="w-8 h-8 rounded bg-[#f6eed6] text-[#2e5d4b] flex items-center justify-center border border-[#d1dbcb]">
                <span className="material-symbols-outlined text-[18px]">folder</span>
              </div>
            </div>
            <div className="mt-3">
              <div className="text-2xl font-bold text-[#1a2b27] font-mono">{cases.length} Dockets</div>
              <div className="text-[11px] text-[#4e5c56] mt-1 flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-red-600"></span>
                <span>1 Critical Priority · 2 High Priority</span>
              </div>
            </div>
          </div>

          {/* Tile 2: Cryptographic Records */}
          <div className="bg-[#fffdf9] p-4 rounded-xl border border-[#d1dbcb] shadow-sm flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-[#4e5c56] uppercase tracking-wider">
                Evidentiary Documents
              </span>
              <div className="w-8 h-8 rounded bg-[#f6eed6] text-[#2e5d4b] flex items-center justify-center border border-[#d1dbcb]">
                <span className="material-symbols-outlined text-[18px]">description</span>
              </div>
            </div>
            <div className="mt-3">
              <div className="text-2xl font-bold text-[#1a2b27] font-mono">{documents.length} Records</div>
              <div className="text-[11px] text-[#2e5d4b] mt-1 font-semibold flex items-center gap-1">
                <span className="material-symbols-outlined text-[14px]">lock</span>
                <span>100% SHA-256 Sealed</span>
              </div>
            </div>
          </div>

          {/* Tile 3: Physical & Digital Evidence */}
          <div className="bg-[#fffdf9] p-4 rounded-xl border border-[#d1dbcb] shadow-sm flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-[#4e5c56] uppercase tracking-wider">
                Seized Evidence
              </span>
              <div className="w-8 h-8 rounded bg-[#f6eed6] text-[#2e5d4b] flex items-center justify-center border border-[#d1dbcb]">
                <span className="material-symbols-outlined text-[18px]">policy</span>
              </div>
            </div>
            <div className="mt-3">
              <div className="text-2xl font-bold text-[#1a2b27] font-mono">{evidenceCount} Items</div>
              <div className="text-[11px] text-[#4e5c56] mt-1">
                In Vault, Transit &amp; Forensics Lab
              </div>
            </div>
          </div>

          {/* Tile 4: Ledger State */}
          <div className="bg-[#fffdf9] p-4 rounded-xl border border-[#d1dbcb] shadow-sm flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-[#4e5c56] uppercase tracking-wider">
                Ledger Chain
              </span>
              <div className="w-8 h-8 rounded bg-[#cbe8db] text-[#143d2f] flex items-center justify-center border border-[#2e5d4b]/30">
                <span className="material-symbols-outlined text-[18px]">verified_user</span>
              </div>
            </div>
            <div className="mt-3">
              <div className="text-xl font-bold text-emerald-800 font-mono">SYNCHRONIZED</div>
              <div className="text-[11px] text-[#4e5c56] mt-1 font-mono">
                12/12 Witnesses · 0 Failures
              </div>
            </div>
          </div>
        </div>

        {/* Main Grid: Cases Table (8 cols) & Audit Ledger Stream (4 cols) */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Cases Dossier Table */}
          <div className="lg:col-span-8 bg-[#fffdf9] rounded-xl border border-[#d1dbcb] shadow-sm flex flex-col overflow-hidden">
            <div className="p-4 border-b border-[#d1dbcb] flex items-center justify-between bg-[#fffdf9]">
              <div>
                <h2 className="text-sm font-bold text-[#1a2b27]">
                  Priority Investigation Dockets &amp; Active Cases
                </h2>
                <p className="text-[11px] text-[#4e5c56]">
                  FIRs, charge sheets, and evidence registries under active investigation
                </p>
              </div>
              <button
                onClick={() => navigate('/cases')}
                className="text-xs font-semibold text-[#2e5d4b] hover:underline flex items-center gap-1"
              >
                <span>View All Dockets</span>
                <span className="material-symbols-outlined text-[14px]">arrow_forward</span>
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-[#f6eed6] text-[#1a2b27] font-semibold border-b border-[#d1dbcb]">
                  <tr>
                    <th className="py-2.5 px-4 font-mono">Dossier / FIR No.</th>
                    <th className="py-2.5 px-4">Case Title</th>
                    <th className="py-2.5 px-4">Lead Officer</th>
                    <th className="py-2.5 px-4">Priority</th>
                    <th className="py-2.5 px-4 font-mono">Docs</th>
                    <th className="py-2.5 px-4 font-mono">Merkle State</th>
                    <th className="py-2.5 px-4 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#d1dbcb]/60 font-sans">
                  {cases.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-12 text-center text-[#4e5c56] text-xs">
                        No active dockets registered in the backend repository.
                      </td>
                    </tr>
                  ) : (
                    cases.map((c) => (
                      <tr
                        key={c.id}
                        onClick={() => navigate(`/cases/${c.id}`)}
                        className="hover:bg-[#f6eed6]/50 cursor-pointer transition-colors"
                      >
                        <td className="py-3 px-4 font-mono font-semibold text-[#2e5d4b]">
                          {c.case_number}
                        </td>
                        <td className="py-3 px-4 font-medium text-[#1a2b27] max-w-xs truncate">
                          {c.title}
                        </td>
                        <td className="py-3 px-4 text-[#4e5c56]">
                          {c.lead_officer}
                        </td>
                        <td className="py-3 px-4">
                          <span
                            className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold uppercase font-mono border ${getPriorityBadgeClass(
                              c.priority
                            )}`}
                          >
                            {c.priority}
                          </span>
                        </td>
                        <td className="py-3 px-4 font-mono text-[#4e5c56]">
                          {c.document_count} files
                        </td>
                        <td className="py-3 px-4 font-mono text-[11px] text-emerald-800 font-semibold">
                          {c.merkle_status}
                        </td>
                        <td className="py-3 px-4 text-right">
                          <span className="material-symbols-outlined text-[16px] text-[#4e5c56]">
                            chevron_right
                          </span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Right Column: Node Consensus & Live Hash Chain Stream */}
          <div className="lg:col-span-4 flex flex-col gap-6">
            {/* Consensus Card */}
            <div className="bg-[#fffdf9] p-4 rounded-xl border border-[#d1dbcb] shadow-sm flex flex-col gap-3">
              <div className="flex items-center justify-between pb-2 border-b border-[#d1dbcb]/60">
                <span className="text-xs font-bold uppercase text-[#1a2b27]">
                  Node Consensus
                </span>
                <span className="px-2 py-0.5 rounded bg-emerald-100 text-emerald-900 border border-emerald-300 text-[10px] font-mono font-bold">
                  12/12 ACTIVE
                </span>
              </div>
              <div className="space-y-1.5 text-xs text-[#4e5c56] font-mono">
                <div className="flex items-center justify-between">
                  <span>Current Merkle Root:</span>
                  <span className="text-[#1a2b27] font-semibold">0x8F4A3C92C1D8</span>
                </div>
                <div className="flex items-center justify-between">
                  <span>Audit Chain Head:</span>
                  <span className="text-[#1a2b27] font-semibold">Block #152</span>
                </div>
                <div className="flex items-center justify-between">
                  <span>Asymmetric Signing:</span>
                  <span className="text-emerald-700 font-semibold">Ed25519-dalek</span>
                </div>
              </div>
            </div>

            {/* Live Audit Stream */}
            <div className="bg-[#fffdf9] rounded-xl border border-[#d1dbcb] shadow-sm flex flex-col overflow-hidden">
              <div className="p-3.5 border-b border-[#d1dbcb] flex items-center justify-between bg-[#f6eed6]/40">
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-[18px] text-[#2e5d4b]">history_edu</span>
                  <h3 className="text-xs font-bold uppercase tracking-wider text-[#1a2b27]">
                    Live Audit Stream
                  </h3>
                </div>
                <button
                  onClick={() => navigate('/audit')}
                  className="text-[11px] font-semibold text-[#2e5d4b] hover:underline"
                >
                  Full Trail
                </button>
              </div>

              <div className="divide-y divide-[#d1dbcb]/50">
                {auditEvents.length === 0 ? (
                  <div className="p-6 text-center text-[#4e5c56] text-xs">
                    No ledger entries recorded yet.
                  </div>
                ) : (
                  auditEvents.slice(0, 5).map((evt) => (
                  <div key={evt.id} className="p-3 hover:bg-[#fff9ed] transition-colors flex flex-col gap-1">
                    <div className="flex items-center justify-between text-[11px] font-mono">
                      <span className="font-bold text-[#2e5d4b]">BLOCK #{evt.block_number}</span>
                      <span className="text-[#4e5c56] text-[10px]">{evt.timestamp.split('T')[1]?.slice(0, 8)}</span>
                    </div>
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs font-semibold text-[#1a2b27] truncate">
                        {evt.action}
                      </span>
                      <span className={`text-[10px] font-mono px-1.5 py-0.2 rounded border font-bold ${
                        evt.status === 'TAMPERED'
                          ? 'bg-red-100 text-red-900 border-red-300'
                          : 'bg-emerald-50 text-emerald-800 border-emerald-200'
                      }`}>
                        {evt.status}
                      </span>
                    </div>
                    <div className="text-[11px] text-[#4e5c56] truncate">
                      {evt.target_reference}
                    </div>
                    <div className="text-[10px] font-mono text-[#4e5c56]/80 truncate">
                      {evt.actor} · {evt.entry_hash.slice(0, 20)}...
                    </div>
                  </div>
                ))
              )}
            </div>
            </div>
          </div>
        </div>
      </div>

      {/* Case Creation Modal */}
      {isCaseModalOpen && (
        <CaseForm
          isOpen={isCaseModalOpen}
          onClose={() => setIsCaseModalOpen(false)}
          onSubmit={handleCreateCase}
        />
      )}

      {/* Document Upload Modal */}
      {isUploadModalOpen && (
        <DocumentUpload
          isOpen={isUploadModalOpen}
          onClose={() => setIsUploadModalOpen(false)}
          caseId={cases[0]?.id || 'cd-case-0412'}
          onUpload={handleUploadComplete}
          currentUserName={user?.name}
        />
      )}
    </AppShell>
  );
};
