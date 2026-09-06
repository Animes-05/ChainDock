import React, { useState, useEffect } from 'react';
import { AppShell } from '../components/layout/AppShell';
import { User } from '../types';
import { userService } from '../services/userService';
import { UserStatsCards } from '../components/users/UserStatsCards';
import { UserTable } from '../components/users/UserTable';
import { UserProvisionModal } from '../components/users/UserProvisionModal';
import { UserKeyModal } from '../components/users/UserKeyModal';
import { BackendUnavailable } from '../components/common/BackendUnavailable';
import { ApiError } from '../services/api';

export const Users: React.FC = () => {
  const [personnel, setPersonnel] = useState<User[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [backendError, setBackendError] = useState<{ status: number; endpoint: string; message: string } | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('ALL');

  // Modals & Active selections
  const [isProvisionModalOpen, setIsProvisionModalOpen] = useState(false);
  const [isKeyModalOpen, setIsKeyModalOpen] = useState(false);
  const [selectedOfficer, setSelectedOfficer] = useState<User | null>(null);
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      setBackendError(null);
      const data = await userService.getUsers();
      setPersonnel(data);
    } catch (err: unknown) {
      console.error('Failed to load personnel records from backend:', err);
      if (err instanceof ApiError) {
        setBackendError({ status: err.status, endpoint: err.endpoint, message: err.message });
      } else {
        setBackendError({ status: 0, endpoint: '/users', message: (err as Error).message });
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const handleInspectKey = (officer: User) => {
    setSelectedOfficer(officer);
    setIsKeyModalOpen(true);
  };

  const handleToggleStatus = async (officer: User) => {
    try {
      setActionLoadingId(officer.id);
      const currentStatus = officer.status === 'SUSPENDED' ? 'SUSPENDED' : 'ACTIVE';
      const updated = await userService.toggleUserStatus(officer.id, currentStatus);
      setPersonnel((prev) => prev.map((p) => (p.id === officer.id ? updated : p)));
    } catch (err: any) {
      console.error('Failed to toggle status:', err);
      alert(`Backend update failed: ${err?.message || 'Unable to update status'}`);
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleUserCreated = (newUser: User) => {
    setPersonnel((prev) => [newUser, ...prev]);
    fetchUsers();
  };

  const filteredPersonnel = personnel.filter((p) => {
    const q = searchQuery.toLowerCase();
    const nameStr = (p.name || '').toLowerCase();
    const emailStr = (p.email || '').toLowerCase();
    const badgeStr = (p.badgeNumber || p.badge_number || '').toLowerCase();
    const deptStr = (p.department || '').toLowerCase();

    const matchesSearch =
      nameStr.includes(q) ||
      emailStr.includes(q) ||
      badgeStr.includes(q) ||
      deptStr.includes(q);

    const matchesRole = roleFilter === 'ALL' || p.role === roleFilter;
    return matchesSearch && matchesRole;
  });

  return (
    <AppShell>
      <div className="flex flex-col gap-6 max-w-[1520px] mx-auto animate-fade-in">
        {/* Title and Master Controls */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-2 border-b border-[#d1dbcb]">
          <div className="flex flex-col">
            <div className="flex items-center gap-2">
              <span className="text-xs font-mono font-bold uppercase text-emerald-800 bg-[#cbe8db] px-2.5 py-0.5 rounded border border-[#2e5d4b]/20">
                Administrator Clearance (Tier 3)
              </span>
              <span className="text-xs text-[#4e5c56] font-mono">FIPS 140-3 Hardware Key Registry</span>
            </div>
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-[#1a2b27] mt-1 font-serif">
              Personnel &amp; Cryptographic Access Management
            </h1>
            <p className="text-xs text-[#4e5c56] mt-0.5">
              Commission authorized officers, assign Ed25519 signing credentials, and maintain jurisdictional access control.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={fetchUsers}
              disabled={loading}
              className="h-9 px-3 bg-[#fffdf9] border border-[#d1dbcb] text-[#1a2b27] rounded text-xs font-medium hover:bg-[#f6eed6] flex items-center gap-1.5 transition-colors shadow-xs"
              title="Refresh personnel from backend"
            >
              <span className={`material-symbols-outlined text-[17px] text-[#2e5d4b] ${loading ? 'animate-spin' : ''}`}>
                refresh
              </span>
              <span>Refresh</span>
            </button>

            <button
              onClick={() => setIsProvisionModalOpen(true)}
              className="h-9 px-3.5 bg-[#0e1c19] text-[#fffdf9] hover:bg-[#243b35] rounded text-xs font-semibold flex items-center gap-2 transition-colors shadow-xs"
            >
              <span className="material-symbols-outlined text-[18px]">person_add</span>
              <span>Provision New Officer</span>
            </button>
          </div>
        </div>

        {/* Content View */}
        {loading ? (
          <div className="p-16 text-center text-[#4e5c56] text-xs">
            <div className="animate-spin w-8 h-8 border-2 border-[#2e5d4b] border-t-transparent rounded-full mx-auto mb-3"></div>
            Loading personnel and cryptographic credential records from backend...
          </div>
        ) : backendError ? (
          <BackendUnavailable
            moduleName="Personnel & Key Registry"
            endpoint={backendError.endpoint}
            status={backendError.status}
            errorMessage={backendError.message}
            onRetry={fetchUsers}
          />
        ) : (
          <>
            {/* 4 Dynamic Metric Stats Cards */}
            <UserStatsCards personnel={personnel} />

            {/* Filter and Table Container */}
            <div className="bg-[#fffdf9] rounded-xl border border-[#d1dbcb] shadow-xs overflow-hidden flex flex-col">
              <div className="p-4 border-b border-[#d1dbcb] flex flex-col sm:flex-row items-center justify-between gap-3 bg-[#f6eed6]/40">
                <div className="relative w-full sm:w-80">
                  <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-[#4e5c56] text-[18px]">
                    search
                  </span>
                  <input
                    type="text"
                    placeholder="Search officer name, badge, email, or unit..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full h-9 pl-9 pr-3 text-xs bg-white rounded border border-[#d1dbcb] text-[#1a2b27] focus:outline-none focus:border-[#2e5d4b]"
                  />
                </div>

                <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
                  <span className="text-xs text-[#4e5c56] font-medium">Filter Cadre:</span>
                  <select
                    value={roleFilter}
                    onChange={(e) => setRoleFilter(e.target.value)}
                    className="h-9 px-2.5 text-xs bg-white rounded border border-[#d1dbcb] text-[#1a2b27] focus:outline-none focus:border-[#2e5d4b]"
                  >
                    <option value="ALL">All Roles</option>
                    <option value="INVESTIGATOR">Investigators (Tier 1)</option>
                    <option value="SUPERVISOR">Supervisors (Tier 2)</option>
                    <option value="ADMIN">Administrators (Tier 3)</option>
                  </select>
                </div>
              </div>

              {/* Modular Personnel Table */}
              <UserTable
                personnel={filteredPersonnel}
                onInspectKey={handleInspectKey}
                onToggleStatus={handleToggleStatus}
                actionLoadingId={actionLoadingId}
              />
            </div>
          </>
        )}
      </div>

      {/* Provision Officer Modal */}
      <UserProvisionModal
        isOpen={isProvisionModalOpen}
        onClose={() => setIsProvisionModalOpen(false)}
        onCreated={handleUserCreated}
      />

      {/* Inspect Ed25519 Key Modal */}
      <UserKeyModal
        officer={selectedOfficer}
        isOpen={isKeyModalOpen}
        onClose={() => setIsKeyModalOpen(false)}
        onKeyRotated={fetchUsers}
      />
    </AppShell>
  );
};
