import React, { useState, useEffect } from 'react';
import { AppShell } from '../components/layout/AppShell';
import { CaseList } from '../components/cases/CaseList';
import { CaseCard } from '../components/cases/CaseCard';
import { CaseForm } from '../components/cases/CaseForm';
import { Case, Priority } from '../types';
import { casesService } from '../services/cases';
import { BackendUnavailable } from '../components/common/BackendUnavailable';
import { ApiError } from '../services/api';

export const Cases: React.FC = () => {
  const [cases, setCases] = useState<Case[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [backendError, setBackendError] = useState<{ status: number; endpoint: string; message: string } | null>(null);
  const [viewMode, setViewMode] = useState<'grid' | 'table'>('table');

  // Filters & Search
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [priorityFilter, setPriorityFilter] = useState<string>('ALL');

  // Modals
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

  const fetchCases = async () => {
    try {
      setLoading(true);
      setBackendError(null);
      const data = await casesService.getCases();
      setCases(data);
    } catch (err: unknown) {
      console.error('Failed to load cases:', err);
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
    fetchCases();
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
    setIsCreateModalOpen(false);
    fetchCases();
  };

  const filteredCases = cases.filter((c) => {
    const q = searchQuery.toLowerCase();
    const matchesSearch =
      (c.title || '').toLowerCase().includes(q) ||
      (c.case_number || '').toLowerCase().includes(q) ||
      (c.lead_officer || '').toLowerCase().includes(q) ||
      (c.jurisdiction || '').toLowerCase().includes(q);

    const matchesStatus = statusFilter === 'ALL' || c.status === statusFilter;
    const matchesPriority = priorityFilter === 'ALL' || c.priority === priorityFilter;

    return matchesSearch && matchesStatus && matchesPriority;
  });

  return (
    <AppShell>
      <div className="space-y-6 animate-fade-in max-w-[1520px] mx-auto">
        {/* Header and Actions */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-moss-border">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl lg:text-3xl font-serif font-bold text-primary">
                Investigation Dockets
              </h1>
              <span className="bg-secondary-container text-on-secondary-container text-xs px-2.5 py-0.5 rounded-full font-semibold flex items-center gap-1">
                <span className="material-symbols-outlined text-[14px]">shield</span>
                CrPC &amp; BSA Registry
              </span>
            </div>
            <p className="text-sm text-forest-ink/70 mt-1">
              Active legal and forensic case files secured under cryptographic custody chains
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={fetchCases}
              className="px-3 py-2 bg-surface-container hover:bg-surface-container-high text-forest-ink border border-moss-border rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-xs"
            >
              <span className={`material-symbols-outlined text-base ${loading ? 'animate-spin' : ''}`}>
                refresh
              </span>
              <span>Refresh</span>
            </button>
            <button
              onClick={() => setIsCreateModalOpen(true)}
              className="px-3.5 py-2 bg-[#243B35] hover:bg-[#162521] text-[#FFF9ED] rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-xs"
            >
              <span className="material-symbols-outlined text-base text-[#B7C9B1]">create_new_folder</span>
              <span>Register Case</span>
            </button>
          </div>
        </div>

        {/* Filter Bar */}
        <div className="bg-surface-bright p-4 rounded-xl border border-moss-border shadow-xs flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="relative w-full md:w-96">
            <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-forest-ink/50 text-[19px]">
              search
            </span>
            <input
              className="w-full h-9 pl-9 pr-3 bg-surface-container-low border border-moss-border text-forest-ink placeholder:text-forest-ink/50 text-xs rounded-lg focus:outline-none focus:border-primary focus:bg-surface-bright transition-all"
              placeholder="Search by case #, title, officer, or jurisdiction..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          <div className="flex items-center gap-3 w-full md:w-auto flex-wrap justify-end">
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-forest-ink/50 text-[18px]">
                tune
              </span>
              <select
                className="text-xs bg-surface-container-low border border-moss-border rounded-lg px-2.5 py-2 text-forest-ink focus:ring-1 focus:ring-primary"
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
              >
                <option value="ALL">All Statuses</option>
                <option value="ACTIVE">Active</option>
                <option value="UNDER_REVIEW">Under Review</option>
                <option value="COURT_PROCEEDINGS">Court Proceedings</option>
                <option value="CLOSED">Closed</option>
                <option value="ARCHIVED">Archived</option>
              </select>

              <select
                className="text-xs bg-surface-container-low border border-moss-border rounded-lg px-2.5 py-2 text-forest-ink focus:ring-1 focus:ring-primary"
                value={priorityFilter}
                onChange={(e) => setPriorityFilter(e.target.value)}
              >
                <option value="ALL">All Priorities</option>
                <option value="CRITICAL">Critical</option>
                <option value="HIGH">High</option>
                <option value="MEDIUM">Medium</option>
                <option value="LOW">Low</option>
              </select>
            </div>

            {/* View Mode Toggle */}
            <div className="flex items-center border border-moss-border rounded-lg overflow-hidden bg-surface-container p-0.5">
              <button
                type="button"
                className={`p-1.5 rounded text-xs transition-colors flex items-center justify-center ${
                  viewMode === 'table'
                    ? 'bg-surface-bright text-primary shadow-xs font-semibold'
                    : 'text-forest-ink/60 hover:text-forest-ink'
                }`}
                onClick={() => setViewMode('table')}
                title="Table View"
              >
                <span className="material-symbols-outlined text-[18px]">table_rows</span>
              </button>
              <button
                type="button"
                className={`p-1.5 rounded text-xs transition-colors flex items-center justify-center ${
                  viewMode === 'grid'
                    ? 'bg-surface-bright text-primary shadow-xs font-semibold'
                    : 'text-forest-ink/60 hover:text-forest-ink'
                }`}
                onClick={() => setViewMode('grid')}
                title="Grid View"
              >
                <span className="material-symbols-outlined text-[18px]">grid_view</span>
              </button>
            </div>
          </div>
        </div>

        {/* Content View */}
        {loading ? (
          <div className="p-16 text-center text-forest-ink/60 text-sm">
            <div className="animate-spin w-8 h-8 border-2 border-primary border-t-transparent rounded-full mx-auto mb-3"></div>
            Loading investigation dockets...
          </div>
        ) : backendError ? (
          <BackendUnavailable
            moduleName="Investigation Dockets"
            endpoint={backendError.endpoint}
            status={backendError.status}
            errorMessage={backendError.message}
            onRetry={fetchCases}
          />
        ) : filteredCases.length === 0 ? (
          <div className="p-16 text-center bg-surface-bright rounded-xl border border-dashed border-moss-border text-forest-ink/60">
            <p className="text-base font-semibold text-primary">No matching dockets found</p>
            <p className="text-xs text-forest-ink/60 mt-1">
              Try adjusting your search query or status filter parameters.
            </p>
          </div>
        ) : viewMode === 'table' ? (
          <CaseList cases={filteredCases} />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {filteredCases.map((c) => (
              <CaseCard key={c.id} caseItem={c} />
            ))}
          </div>
        )}
      </div>

      {/* Case Creation Modal */}
      <CaseForm
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onSubmit={handleCreateCase}
      />
    </AppShell>
  );
};
