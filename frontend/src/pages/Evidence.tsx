import React, { useState, useEffect } from 'react';
import { AppShell } from '../components/layout/AppShell';
import { EvidenceList } from '../components/evidence/EvidenceList';
import { EvidenceUpload } from '../components/evidence/EvidenceUpload';
import { ChainOfCustodyLog } from '../components/evidence/ChainOfCustodyLog';
import { ChainOfCustodyTimeline } from '../components/evidence/ChainOfCustodyTimeline';
import { Modal } from '../components/ui/Modal';
import { evidenceService } from '../services/evidence';
import { casesService } from '../services/cases';
import { EvidenceItem } from '../types';
import { BackendUnavailable } from '../components/common/BackendUnavailable';
import { ApiError } from '../services/api';

export const Evidence: React.FC = () => {
  const [evidenceItems, setEvidenceItems] = useState<EvidenceItem[]>([]);
  const [activeCaseId, setActiveCaseId] = useState<string>('cd-case-0412');
  const [loading, setLoading] = useState<boolean>(true);
  const [backendError, setBackendError] = useState<{ status: number; endpoint: string; message: string } | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');

  // Modals
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [transferTargetItem, setTransferTargetItem] = useState<EvidenceItem | null>(null);
  const [timelineTargetItem, setTimelineTargetItem] = useState<EvidenceItem | null>(null);

  const fetchEvidence = async () => {
    try {
      setLoading(true);
      setBackendError(null);
      const items = await evidenceService.getEvidence();
      setEvidenceItems(items);
    } catch (err: unknown) {
      console.error('Failed to load evidence catalog:', err);
      if (err instanceof ApiError) {
        setBackendError({ status: err.status, endpoint: err.endpoint, message: err.message });
      } else {
        setBackendError({ status: 0, endpoint: '/evidence', message: (err as Error).message });
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEvidence();
    casesService.getCases().then((list) => {
      if (list && list.length > 0 && list[0]?.id) {
        setActiveCaseId(list[0].id);
      }
    }).catch(() => {});
  }, []);

  const handleUploadSubmit = async (data: {
    item_number: string;
    name: string;
    category: string;
    description: string;
    location: string;
  }) => {
    await evidenceService.createEvidence({
      case_id: activeCaseId,
      item_number: data.item_number,
      name: data.name,
      category: data.category,
      description: data.description,
      location: data.location,
    });
    setIsUploadOpen(false);
    await fetchEvidence();
  };

  const handleTransfer = async (
    evidenceId: string,
    data: { newCustodian: string; location: string; notes: string; actor: string }
  ) => {
    await evidenceService.transferCustody(evidenceId, {
      actor: data.actor,
      new_custodian: data.newCustodian,
      location: data.location,
      notes: data.notes,
    });
    setTransferTargetItem(null);
    await fetchEvidence();
  };

  const filteredItems = evidenceItems.filter((item) => {
    const q = searchQuery.toLowerCase();
    const matchesSearch =
      (item.name || '').toLowerCase().includes(q) ||
      (item.item_number || '').toLowerCase().includes(q) ||
      (item.custodian || '').toLowerCase().includes(q) ||
      (item.location || '').toLowerCase().includes(q);

    const matchesStatus = statusFilter === 'ALL' || item.status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  return (
    <AppShell>
      <div className="space-y-6 animate-fade-in max-w-[1520px] mx-auto">
        {/* Page Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-moss-border">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl lg:text-3xl font-serif font-bold text-primary">
                Evidence &amp; Chain of Custody
              </h1>
              <span className="bg-[#C3E8D2] text-[#1B3B2B] text-xs px-2.5 py-0.5 rounded-full font-semibold border border-[#6B8E7B]/40 flex items-center gap-1">
                <span className="material-symbols-outlined text-[14px]">policy</span>
                Biometric Dual-Sign
              </span>
            </div>
            <p className="text-sm text-forest-ink/70 mt-1">
              Physical and digital forensic exhibits tracked under cryptographically sealed custody ledgers
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={fetchEvidence}
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
              <span className="material-symbols-outlined text-base text-[#B7C9B1]">add_box</span>
              <span>Register Evidence</span>
            </button>
          </div>
        </div>

        {/* Search & Filters */}
        <div className="bg-surface-bright p-4 rounded-xl border border-moss-border shadow-xs flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="relative w-full md:w-96">
            <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-forest-ink/50 text-[19px]">
              search
            </span>
            <input
              className="w-full h-9 pl-9 pr-3 bg-surface-container-low border border-moss-border text-forest-ink placeholder:text-forest-ink/50 text-xs rounded-lg focus:outline-none focus:border-primary focus:bg-surface-bright transition-all"
              placeholder="Search by exhibit tag #, custodian, location, or description..."
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
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              <option value="ALL">All Custody Statuses</option>
              <option value="SECURE_VAULT">Central Evidence Vault</option>
              <option value="ANALYSIS">Forensic Lab Analysis (CFSL)</option>
              <option value="COURT_EXHIBIT">Submitted in Court</option>
              <option value="IN_TRANSIT">In Transit (Armored Escort)</option>
            </select>
          </div>
        </div>

        {/* Evidence List */}
        {loading ? (
          <div className="p-16 text-center text-forest-ink/60 text-sm">
            <div className="animate-spin w-8 h-8 border-2 border-primary border-t-transparent rounded-full mx-auto mb-3"></div>
            Loading evidence custody catalog...
          </div>
        ) : backendError ? (
          <BackendUnavailable
            moduleName="Evidence Custody Ledger"
            endpoint={backendError.endpoint}
            status={backendError.status}
            errorMessage={backendError.message}
            onRetry={fetchEvidence}
          />
        ) : (
          <EvidenceList
            items={filteredItems}
            onSelect={(item) => setTimelineTargetItem(item)}
            onTransfer={(item) => setTransferTargetItem(item)}
          />
        )}
      </div>

      {/* Register Evidence Modal */}
      <EvidenceUpload
        isOpen={isUploadOpen}
        onClose={() => setIsUploadOpen(false)}
        caseId={activeCaseId}
        onSubmit={handleUploadSubmit}
      />

      {/* Transfer Custody Modal */}
      <ChainOfCustodyLog
        isOpen={Boolean(transferTargetItem)}
        onClose={() => setTransferTargetItem(null)}
        evidenceItem={transferTargetItem}
        onTransfer={handleTransfer}
      />

      {/* Custody History Timeline Modal */}
      <Modal
        isOpen={Boolean(timelineTargetItem)}
        onClose={() => setTimelineTargetItem(null)}
        title={`Custody History — ${timelineTargetItem?.item_number || ''}`}
        subtitle={timelineTargetItem?.name}
        maxWidth="lg"
      >
        <div className="space-y-4">
          <div className="p-3 bg-surface-container-low rounded-lg text-xs flex items-center justify-between border border-moss-border">
            <div>
              <span className="text-forest-ink/60">Current Vault:</span>{' '}
              <span className="font-semibold text-primary">{timelineTargetItem?.location}</span>
            </div>
            <div>
              <span className="text-forest-ink/60">Custodian:</span>{' '}
              <span className="font-semibold text-primary">{timelineTargetItem?.custodian}</span>
            </div>
          </div>

          <ChainOfCustodyTimeline events={timelineTargetItem?.custody_events || []} />

          <div className="pt-4 border-t border-moss-border flex justify-end gap-3">
            <button
              onClick={() => setTimelineTargetItem(null)}
              className="px-3.5 py-1.5 bg-surface-container hover:bg-surface-container-high text-forest-ink rounded-lg text-xs font-semibold"
            >
              Close History
            </button>
            <button
              onClick={() => {
                const item = timelineTargetItem;
                setTimelineTargetItem(null);
                setTransferTargetItem(item);
              }}
              className="px-3.5 py-1.5 bg-primary hover:bg-primary-dark text-surface-bright rounded-lg text-xs font-semibold flex items-center gap-1.5"
            >
              <span className="material-symbols-outlined text-[15px]">swap_horiz</span>
              <span>Initiate Handover</span>
            </button>
          </div>
        </div>
      </Modal>
    </AppShell>
  );
};
