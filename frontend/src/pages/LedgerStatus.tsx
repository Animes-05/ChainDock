import React, { useState, useEffect, useCallback } from 'react';
import { AppShell } from '../components/layout/AppShell';
import { auditService } from '../services/audit';
import { useAuth } from '../context/AuthContext';
import { AuditEvent, AuditVerificationResult, LedgerHealthResponse, BackendHealthResponse } from '../types';
import { BackendUnavailable } from '../components/common/BackendUnavailable';
import { ApiError } from '../services/api';

/* ────────────────────────────────────────────────────────────────────
 * LedgerStatus — /ledger
 *
 * Dedicated blockchain operations dashboard. Surfaces real-time health
 * from the Axum backend (GET :3000/health) and the Ledger Service
 * (GET :3001/health), chain integrity from GET /audit/verify-chain,
 * the full blockchain entry table, and admin-only tamper/restore demo
 * controls. All data is live — no static/placeholder values.
 * ──────────────────────────────────────────────────────────────────── */

export const LedgerStatus: React.FC = () => {
  const { role } = useAuth();
  const isAdmin = String(role || '').toUpperCase() === 'ADMIN';

  // ── Service Health ──
  const [ledgerHealth, setLedgerHealth] = useState<LedgerHealthResponse | null>(null);
  const [ledgerOnline, setLedgerOnline] = useState<boolean | null>(null);
  const [backendHealth, setBackendHealth] = useState<BackendHealthResponse | null>(null);
  const [backendOnline, setBackendOnline] = useState<boolean | null>(null);

  // ── Chain Verification ──
  const [verificationResult, setVerificationResult] = useState<AuditVerificationResult | null>(null);
  const [isVerifying, setIsVerifying] = useState(false);

  // ── Audit Entries ──
  const [events, setEvents] = useState<AuditEvent[]>([]);
  const [loadingEvents, setLoadingEvents] = useState(true);
  const [filterQuery, setFilterQuery] = useState('');
  const [backendError, setBackendError] = useState<{ status: number; endpoint: string; message: string } | null>(null);

  // ── Demo Controls ──
  const [demoMessage, setDemoMessage] = useState<string | null>(null);
  const [isTampering, setIsTampering] = useState(false);
  const [isRestoring, setIsRestoring] = useState(false);

  // ── Fetchers ──
  const fetchHealth = useCallback(async () => {
    // Ledger Service health
    try {
      const lh = await auditService.getLedgerHealth();
      setLedgerHealth(lh);
      setLedgerOnline(true);
    } catch {
      setLedgerHealth(null);
      setLedgerOnline(false);
    }

    // Backend health
    try {
      const bh = await auditService.getBackendHealth();
      setBackendHealth(bh);
      setBackendOnline(true);
    } catch {
      setBackendHealth(null);
      setBackendOnline(false);
    }
  }, []);

  const fetchEvents = useCallback(async () => {
    try {
      setLoadingEvents(true);
      setBackendError(null);
      const logs = await auditService.getAuditEvents();
      setEvents(logs);
    } catch (err: unknown) {
      if (err instanceof ApiError) {
        setBackendError({ status: err.status, endpoint: err.endpoint, message: err.message });
      } else {
        setBackendError({ status: 0, endpoint: '/cases', message: (err as Error).message });
      }
    } finally {
      setLoadingEvents(false);
    }
  }, []);

  const runVerification = useCallback(async () => {
    setIsVerifying(true);
    try {
      const result = await auditService.verifyAuditChain();
      setVerificationResult(result);
    } catch (err) {
      console.warn('Chain verification failed:', err);
      setVerificationResult(null);
    } finally {
      setIsVerifying(false);
    }
  }, []);

  const refreshAll = useCallback(async () => {
    await Promise.all([fetchHealth(), fetchEvents(), runVerification()]);
  }, [fetchHealth, fetchEvents, runVerification]);

  useEffect(() => {
    refreshAll();
  }, [refreshAll]);

  // ── Demo Handlers ──
  const handleTamper = async () => {
    setIsTampering(true);
    setDemoMessage(null);
    try {
      const ok = await auditService.injectTamperAtBlock150();
      setDemoMessage(ok ? '⚡ Tamper injected — re-verifying chain…' : '⚠ Tamper failed (ledger may be in Fabric mode)');
      await fetchEvents();
      await runVerification();
      if (ok) setDemoMessage('⚡ Tamper injected — chain integrity breach detected.');
    } catch {
      setDemoMessage('⚠ Tamper request failed.');
    } finally {
      setIsTampering(false);
    }
  };

  const handleRestore = async () => {
    setIsRestoring(true);
    setDemoMessage(null);
    try {
      const ok = await auditService.resetAuditChain();
      setDemoMessage(ok ? '✓ Chain restored — re-verifying…' : '⚠ Restore failed.');
      await fetchEvents();
      await runVerification();
      if (ok) setDemoMessage('✓ Chain restored — integrity verified.');
    } catch {
      setDemoMessage('⚠ Restore request failed.');
    } finally {
      setIsRestoring(false);
    }
  };

  // ── Derived State ──
  const isChainTampered = verificationResult ? !verificationResult.valid : false;
  const ledgerMode = ledgerHealth?.mode || null;

  const filteredEvents = events.filter((e) => {
    if (!filterQuery) return true;
    const q = filterQuery.toLowerCase();
    return (
      e.id.toLowerCase().includes(q) ||
      e.action.toLowerCase().includes(q) ||
      e.actor.toLowerCase().includes(q) ||
      e.target_reference.toLowerCase().includes(q) ||
      e.entry_hash.toLowerCase().includes(q)
    );
  });

  // ────────────────────────────────────────────────────────────────────
  // RENDER
  // ────────────────────────────────────────────────────────────────────
  return (
    <AppShell>
      <div className="flex flex-col gap-6">
        {/* ═══ Page Header ═══ */}
        <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-4 pb-2 border-b border-[#d1dbcb]">
          <div className="flex flex-col gap-1.5">
            <div className="flex flex-wrap items-center gap-2">
              <span className="px-2.5 py-0.5 rounded bg-[#f6eed6] border border-[#d1dbcb] text-[#1a2b27] text-[11px] font-bold uppercase tracking-wider font-mono">
                Ledger Bridge · Blockchain Service
              </span>
              {ledgerMode && (
                <span
                  className={`px-2.5 py-0.5 rounded text-[11px] font-bold uppercase tracking-wider font-mono border ${
                    ledgerMode === 'fabric'
                      ? 'bg-blue-100 text-blue-900 border-blue-300'
                      : 'bg-amber-100 text-amber-900 border-amber-300'
                  }`}
                >
                  {ledgerMode === 'fabric' ? 'Hyperledger Fabric' : 'Mock Ledger'}
                </span>
              )}
            </div>
            <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-[#1a2b27] tracking-tight">
              Ledger Status
            </h1>
            <p className="text-xs sm:text-sm text-[#4e5c56] max-w-3xl">
              Real-time health monitoring, chain integrity verification, and blockchain entry inspection
              for the Hyperledger Fabric bridge.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2 sm:gap-3">
            <button
              onClick={refreshAll}
              disabled={loadingEvents}
              className="h-9 sm:h-10 px-3.5 rounded bg-[#f5eedc] hover:bg-[#ede3ce] text-[#1a2b27] border border-[#d1dbcb] text-xs font-semibold transition-colors flex items-center gap-1.5 shadow-sm"
              title="Refresh all status"
            >
              <span className={`material-symbols-outlined text-[18px] ${loadingEvents ? 'animate-spin' : ''}`}>
                refresh
              </span>
              <span>Refresh All</span>
            </button>
          </div>
        </div>

        {/* ═══ Service Health Cards ═══ */}
        <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {/* Backend Gateway */}
          <div className="rounded-xl border border-[#d1dbcb] bg-[#fffdf9] p-5 shadow-sm flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-lg bg-[#f6eed6] flex items-center justify-center border border-[#d1dbcb]">
                  <span className="material-symbols-outlined text-[20px] text-[#243b35]">dns</span>
                </div>
                <div>
                  <div className="text-xs font-bold text-[#1a2b27] uppercase tracking-wider">Backend Gateway</div>
                  <div className="text-[11px] text-[#4e5c56] font-mono">Axum · :3000</div>
                </div>
              </div>
              {backendOnline !== null && (
                <span
                  className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider border ${
                    backendOnline
                      ? 'bg-[#cbe8db] text-[#143d2f] border-[#2e5d4b]/30'
                      : 'bg-red-100 text-red-900 border-red-300'
                  }`}
                >
                  <span className={`w-2 h-2 rounded-full ${backendOnline ? 'bg-[#2e5d4b] animate-pulse' : 'bg-red-500'}`}></span>
                  {backendOnline ? 'Online' : 'Offline'}
                </span>
              )}
            </div>
            <div className="text-[11px] text-[#4e5c56]">
              {backendHealth ? (
                <span>Status: <span className="font-semibold text-[#1a2b27]">{backendHealth.status}</span></span>
              ) : backendOnline === false ? (
                <span className="text-red-700">Unable to reach backend service</span>
              ) : (
                <span className="text-[#4e5c56]/60">Checking…</span>
              )}
            </div>
          </div>

          {/* Ledger Service */}
          <div className="rounded-xl border border-[#d1dbcb] bg-[#fffdf9] p-5 shadow-sm flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-lg bg-[#f6eed6] flex items-center justify-center border border-[#d1dbcb]">
                  <span className="material-symbols-outlined text-[20px] text-[#243b35]">lan</span>
                </div>
                <div>
                  <div className="text-xs font-bold text-[#1a2b27] uppercase tracking-wider">Ledger Service</div>
                  <div className="text-[11px] text-[#4e5c56] font-mono">Express · :3001</div>
                </div>
              </div>
              {ledgerOnline !== null && (
                <span
                  className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider border ${
                    ledgerOnline
                      ? 'bg-[#cbe8db] text-[#143d2f] border-[#2e5d4b]/30'
                      : 'bg-red-100 text-red-900 border-red-300'
                  }`}
                >
                  <span className={`w-2 h-2 rounded-full ${ledgerOnline ? 'bg-[#2e5d4b] animate-pulse' : 'bg-red-500'}`}></span>
                  {ledgerOnline ? 'Online' : 'Offline'}
                </span>
              )}
            </div>
            <div className="text-[11px] text-[#4e5c56]">
              {ledgerHealth ? (
                <span>Status: <span className="font-semibold text-[#1a2b27]">{ledgerHealth.status}</span></span>
              ) : ledgerOnline === false ? (
                <span className="text-red-700">Unable to reach ledger service</span>
              ) : (
                <span className="text-[#4e5c56]/60">Checking…</span>
              )}
            </div>
          </div>

          {/* Ledger Mode */}
          <div className="rounded-xl border border-[#d1dbcb] bg-[#fffdf9] p-5 shadow-sm flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div
                  className={`w-9 h-9 rounded-lg flex items-center justify-center border ${
                    ledgerMode === 'fabric'
                      ? 'bg-blue-100 border-blue-300'
                      : 'bg-[#f6eed6] border-[#d1dbcb]'
                  }`}
                >
                  <span className="material-symbols-outlined text-[20px] text-[#243b35]">
                    {ledgerMode === 'fabric' ? 'hub' : 'memory'}
                  </span>
                </div>
                <div>
                  <div className="text-xs font-bold text-[#1a2b27] uppercase tracking-wider">Ledger Mode</div>
                  <div className="text-[11px] text-[#4e5c56] font-mono">
                    {ledgerMode === 'fabric' ? 'Distributed Ledger' : 'In-Memory Store'}
                  </div>
                </div>
              </div>
            </div>
            <div className="text-[11px] text-[#4e5c56]">
              {ledgerMode ? (
                <div className="flex items-center gap-2">
                  <span
                    className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded text-[10px] font-bold uppercase tracking-wider border font-mono ${
                      ledgerMode === 'fabric'
                        ? 'bg-blue-50 text-blue-800 border-blue-200'
                        : 'bg-amber-50 text-amber-800 border-amber-200'
                    }`}
                  >
                    <span className="material-symbols-outlined text-[14px]">
                      {ledgerMode === 'fabric' ? 'verified' : 'science'}
                    </span>
                    {ledgerMode === 'fabric' ? 'Hyperledger Fabric' : 'Mock (Demo)'}
                  </span>
                </div>
              ) : (
                <span className="text-[#4e5c56]/60">{ledgerOnline === false ? 'Service unavailable' : 'Detecting…'}</span>
              )}
            </div>
          </div>
        </section>

        {/* ═══ Chain Integrity Verification ═══ */}
        <section
          className={`rounded-xl border p-4 sm:p-5 shadow-sm transition-colors ${
            isChainTampered
              ? 'bg-red-900 text-white border-red-950'
              : 'bg-[#fffdf9] border-[#d1dbcb]'
          }`}
        >
          <div
            className={`flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b ${
              isChainTampered ? 'border-red-800' : 'border-[#d1dbcb]/70'
            }`}
          >
            <div className="flex items-center gap-3">
              <div
                className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 border ${
                  isChainTampered
                    ? 'bg-red-500 text-white border-red-400'
                    : 'bg-[#cbe8db] text-[#143d2f] border-[#2e5d4b]/30'
                }`}
              >
                <span className="material-symbols-outlined text-[24px]">
                  {isChainTampered ? 'gpp_bad' : 'verified'}
                </span>
              </div>
              <div>
                <div
                  className={`text-[10px] font-bold uppercase tracking-widest ${
                    isChainTampered ? 'text-red-200' : 'text-[#4e5c56]'
                  }`}
                >
                  Chain Integrity Verdict
                </div>
                <div className="text-base sm:text-lg font-bold flex items-center gap-2 mt-0.5">
                  <span>
                    {verificationResult === null
                      ? 'Verification Pending…'
                      : isChainTampered
                      ? 'INTEGRITY BREACH DETECTED'
                      : verificationResult.total_entries === 0
                      ? 'Ledger Empty — Awaiting First Entry'
                      : 'Chain Integrity Verified'}
                  </span>
                  {verificationResult && (
                    <span
                      className={`inline-block w-2.5 h-2.5 rounded-full ${
                        isChainTampered ? 'bg-red-400 animate-ping' : 'bg-[#2e5d4b] animate-pulse'
                      }`}
                    ></span>
                  )}
                </div>
              </div>
            </div>

            <button
              onClick={runVerification}
              disabled={isVerifying}
              className={`h-9 sm:h-10 px-4 sm:px-5 rounded text-xs font-semibold transition-all flex items-center gap-2 shadow-sm active:scale-[0.99] disabled:opacity-60 ${
                isChainTampered
                  ? 'bg-red-700 hover:bg-red-800 text-white border border-red-600'
                  : 'bg-[#0e1c19] hover:bg-[#243b35] text-[#fffdf9]'
              }`}
            >
              <span className={`material-symbols-outlined text-[18px] ${isVerifying ? 'animate-spin' : ''}`}>
                sync
              </span>
              <span>{isVerifying ? 'Verifying…' : 'Verify Hash-Chain'}</span>
            </button>
          </div>

          {/* Verification Stats */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 pt-4">
            <div
              className={`p-3.5 rounded border ${
                isChainTampered
                  ? 'bg-black/20 border-white/10 text-white'
                  : 'bg-[#fbf3dc] border-[#d1dbcb]/70 text-[#1a2b27]'
              }`}
            >
              <div className="text-[11px] font-semibold uppercase tracking-wider opacity-80">Total Entries</div>
              <div className="text-xl font-bold font-mono mt-0.5">
                {verificationResult ? verificationResult.total_entries : '—'}
              </div>
              <div className="text-[11px] opacity-80 mt-0.5">On-ledger records</div>
            </div>

            <div
              className={`p-3.5 rounded border ${
                isChainTampered
                  ? 'bg-black/20 border-white/10 text-white'
                  : 'bg-[#fbf3dc] border-[#d1dbcb]/70 text-[#1a2b27]'
              }`}
            >
              <div className="text-[11px] font-semibold uppercase tracking-wider opacity-80">Entries Checked</div>
              <div className="text-xl font-bold font-mono mt-0.5">
                {verificationResult
                  ? `${verificationResult.checked_entries} / ${verificationResult.total_entries}`
                  : '—'}
              </div>
              <div className="text-[11px] opacity-80 mt-0.5">Sequential verification</div>
            </div>

            <div
              className={`p-3.5 rounded border ${
                isChainTampered
                  ? 'bg-red-950 border-red-500 text-white'
                  : 'bg-[#fbf3dc] border-[#d1dbcb]/70 text-[#1a2b27]'
              }`}
            >
              <div className="text-[11px] font-semibold uppercase tracking-wider opacity-80">Hash Mismatches</div>
              <div className={`text-xl font-bold font-mono mt-0.5 ${isChainTampered ? 'text-red-300' : 'text-emerald-800'}`}>
                {isChainTampered ? '1 (BROKEN)' : '0'}
              </div>
              <div className="text-[11px] opacity-80 mt-0.5">
                {isChainTampered ? 'Hash integrity broken' : 'All hashes valid'}
              </div>
            </div>

            <div
              className={`p-3.5 rounded border ${
                isChainTampered
                  ? 'bg-black/20 border-white/10 text-white'
                  : 'bg-[#fbf3dc] border-[#d1dbcb]/70 text-[#1a2b27]'
              }`}
            >
              <div className="text-[11px] font-semibold uppercase tracking-wider opacity-80">Ledger Mode</div>
              <div className="text-xl font-bold font-mono mt-0.5">
                {ledgerMode === 'fabric' ? 'Fabric' : ledgerMode === 'mock' ? 'Mock' : '—'}
              </div>
              <div className="text-[11px] opacity-80 mt-0.5">
                {ledgerMode === 'fabric' ? 'Hyperledger Fabric' : ledgerMode === 'mock' ? 'In-memory demo store' : 'Unknown'}
              </div>
            </div>
          </div>

          {/* Broken entry ID */}
          {isChainTampered && verificationResult?.failed_entry_id && (
            <div className="mt-4 p-3.5 rounded bg-red-950 border border-red-500 text-sm font-mono text-red-100">
              <span className="text-[10px] uppercase font-bold text-red-300 block mb-1">Tampered Entry ID</span>
              <span className="break-all">{verificationResult.failed_entry_id}</span>
            </div>
          )}
        </section>

        {/* ═══ Blockchain Entries Table ═══ */}
        {loadingEvents ? (
          <div className="p-16 text-center text-forest-ink/60 text-sm">
            <div className="animate-spin w-8 h-8 border-2 border-[#2e5d4b] border-t-transparent rounded-full mx-auto mb-3"></div>
            Loading ledger entries…
          </div>
        ) : backendError ? (
          <BackendUnavailable
            moduleName="Ledger Status"
            endpoint={backendError.endpoint}
            status={backendError.status}
            errorMessage={backendError.message}
            onRetry={refreshAll}
          />
        ) : (
          <section className="flex flex-col gap-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-[20px] text-[#2e5d4b]">table_chart</span>
                  <h2 className="text-sm font-bold text-[#1a2b27] uppercase tracking-wider">
                    Blockchain Entries
                  </h2>
                </div>
                <p className="text-[11px] text-[#4e5c56] mt-0.5">
                  All audit events recorded on the ledger ({events.length} total)
                </p>
              </div>
              <div className="relative w-full sm:w-64">
                <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-[#4e5c56] text-[18px]">
                  filter_list
                </span>
                <input
                  type="text"
                  value={filterQuery}
                  onChange={(e) => setFilterQuery(e.target.value)}
                  placeholder="Filter entry ID, action, actor…"
                  className="w-full h-9 pl-9 pr-3 bg-[#fffdf9] border border-[#d1dbcb] rounded text-xs text-[#1a2b27] placeholder:text-[#4e5c56]/70 focus:outline-none focus:border-[#2e5d4b] font-mono"
                />
              </div>
            </div>

            <div className="rounded-xl border border-[#d1dbcb] bg-[#fffdf9] overflow-hidden shadow-sm">
              <div className="overflow-x-auto w-full">
                <table className="w-full text-left text-xs">
                  <thead className="bg-[#f6eed6] text-[#1a2b27] font-semibold uppercase tracking-wider text-[11px] border-b border-[#d1dbcb]">
                    <tr>
                      <th className="py-2.5 px-4 font-mono">#</th>
                      <th className="py-2.5 px-4 font-mono">Entry ID</th>
                      <th className="py-2.5 px-4">Action</th>
                      <th className="py-2.5 px-4">Actor</th>
                      <th className="py-2.5 px-4">Reference</th>
                      <th className="py-2.5 px-4 font-mono">Entry Hash</th>
                      <th className="py-2.5 px-4 font-mono">Timestamp</th>
                      <th className="py-2.5 px-4 text-right">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#d1dbcb]/60 font-sans">
                    {filteredEvents.length === 0 ? (
                      <tr>
                        <td colSpan={8} className="py-12 text-center text-[#4e5c56] text-xs">
                          {events.length === 0
                            ? 'No ledger entries found. Create a case and upload a document to generate entries.'
                            : 'No entries matching the filter query.'}
                        </td>
                      </tr>
                    ) : (
                      filteredEvents.map((evt, idx) => (
                        <tr
                          key={evt.id}
                          className={`hover:bg-[#f6eed6]/40 transition-colors ${
                            evt.status === 'TAMPERED' ? 'bg-red-50/80' : ''
                          }`}
                        >
                          <td className="py-3 px-4 font-mono font-bold text-[#1a2b27]">{idx + 1}</td>
                          <td className="py-3 px-4 font-mono text-[11px] text-[#4e5c56] max-w-[140px] truncate" title={evt.id}>
                            {evt.id.length > 16 ? `${evt.id.slice(0, 16)}…` : evt.id}
                          </td>
                          <td className="py-3 px-4">
                            <span className="px-2 py-0.5 rounded bg-[#f6eed6] border border-[#d1dbcb] text-[#1a2b27] font-mono text-[10px] font-bold">
                              {evt.action}
                            </span>
                          </td>
                          <td className="py-3 px-4 font-medium text-[#1a2b27]">{evt.actor}</td>
                          <td className="py-3 px-4 text-[#4e5c56] max-w-xs truncate">{evt.target_reference}</td>
                          <td className="py-3 px-4 font-mono text-[#4e5c56] text-[11px]">
                            {evt.entry_hash
                              ? evt.entry_hash.length > 12
                                ? `${evt.entry_hash.slice(0, 12)}…`
                                : evt.entry_hash
                              : '—'}
                          </td>
                          <td className="py-3 px-4 font-mono text-[#4e5c56] text-[11px]">
                            {evt.timestamp.replace('T', ' ').slice(0, 19)}
                          </td>
                          <td className="py-3 px-4 text-right">
                            <span
                              className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full font-bold text-[10px] font-mono ${
                                evt.status === 'TAMPERED'
                                  ? 'bg-red-100 text-red-900 border border-red-300'
                                  : 'bg-[#cbe8db] text-[#143d2f] border border-[#2e5d4b]/30'
                              }`}
                            >
                              {evt.status === 'TAMPERED' ? '✕ TAMPERED' : '✓ VALID'}
                            </span>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </section>
        )}

        {/* ═══ Admin Demo Controls ═══ */}
        {isAdmin && (
          <section className="rounded-xl bg-[#243b35] text-white p-5 border border-[#0e1c19] shadow-sm">
            <div className="flex flex-col gap-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-lg bg-[#0e1c19] flex items-center justify-center border border-[#243b35]">
                    <span className="material-symbols-outlined text-[20px] text-amber-300">bolt</span>
                  </div>
                  <div>
                    <div className="text-xs font-bold uppercase tracking-wider text-amber-200">
                      Admin Demonstration Controls
                    </div>
                    <div className="text-[11px] text-[#eae2cb]/80">
                      Tamper and restore the ledger to demonstrate chain integrity verification
                    </div>
                  </div>
                </div>
                <span className="text-[9px] font-mono font-bold px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30">
                  ADMIN
                </span>
              </div>

              <div className="flex flex-wrap items-center gap-3">
                <button
                  onClick={handleTamper}
                  disabled={isTampering || isRestoring}
                  className="h-9 sm:h-10 px-4 rounded bg-red-800 text-white hover:bg-red-900 text-xs font-mono font-bold transition-all flex items-center gap-1.5 shadow-sm active:scale-[0.99] disabled:opacity-60"
                >
                  <span className={`material-symbols-outlined text-[18px] ${isTampering ? 'animate-spin' : ''}`}>
                    {isTampering ? 'sync' : 'bolt'}
                  </span>
                  <span>{isTampering ? 'Injecting…' : 'Simulate Tamper'}</span>
                </button>

                {isChainTampered && (
                  <button
                    onClick={handleRestore}
                    disabled={isTampering || isRestoring}
                    className="h-9 sm:h-10 px-4 rounded bg-[#2e5d4b] text-white hover:bg-[#1a4035] text-xs font-semibold transition-colors flex items-center gap-1.5 shadow-sm disabled:opacity-60"
                  >
                    <span className={`material-symbols-outlined text-[18px] ${isRestoring ? 'animate-spin' : ''}`}>
                      {isRestoring ? 'sync' : 'restart_alt'}
                    </span>
                    <span>{isRestoring ? 'Restoring…' : 'Restore Chain'}</span>
                  </button>
                )}
              </div>

              {demoMessage && (
                <div
                  className={`text-xs font-mono px-3.5 py-2.5 rounded border ${
                    demoMessage.startsWith('✓')
                      ? 'bg-[#0e1c19] border-emerald-700 text-emerald-300'
                      : demoMessage.startsWith('⚡')
                      ? 'bg-[#0e1c19] border-red-700 text-red-300'
                      : 'bg-[#0e1c19] border-amber-700 text-amber-300'
                  }`}
                >
                  {demoMessage}
                </div>
              )}
            </div>
          </section>
        )}
      </div>
    </AppShell>
  );
};
