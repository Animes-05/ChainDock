import React from 'react';
import { useNavigate } from 'react-router-dom';
import { AppShell } from '../../components/layout/AppShell';
import { useAuth } from '../../hooks/useAuth';

export const Unauthorized: React.FC = () => {
  const navigate = useNavigate();
  const { role, user } = useAuth();

  return (
    <AppShell>
      <div className="min-h-[70vh] flex flex-col items-center justify-center p-4">
        <div className="bg-[#fffdf9] p-8 sm:p-10 rounded-2xl border border-[#d1dbcb] shadow-lg flex flex-col items-center text-center max-w-lg w-full">
          <div className="w-16 h-16 rounded-2xl bg-red-100 text-red-900 border border-red-300 flex items-center justify-center mb-4 shadow-xs">
            <span className="material-symbols-outlined text-[34px]">gpp_maybe</span>
          </div>

          <span className="text-[11px] font-mono font-bold uppercase tracking-wider text-red-800 bg-red-50 px-3 py-1 rounded-full border border-red-200 mb-2.5">
            Clearance Tier 3 Required
          </span>

          <h1 className="text-xl sm:text-2xl font-bold text-[#1a2b27] font-serif">
            Access Restricted
          </h1>

          <p className="text-xs text-[#4e5c56] mt-2 leading-relaxed max-w-sm">
            Personnel provisioning, cryptographic key management, and hardware enclave administration are restricted to <strong>Administrator</strong> clearance.
          </p>

          <div className="mt-6 p-4 bg-[#f6eed6]/70 rounded-xl border border-[#d1dbcb] text-xs text-[#1a2b27] flex flex-col gap-2 text-left w-full">
            <span className="font-bold text-[10px] uppercase font-mono text-[#2e5d4b]">
              Current Session Security Context:
            </span>
            <div className="flex items-center justify-between border-b border-[#d1dbcb]/50 pb-1.5">
              <span className="text-[#4e5c56]">Authenticated Officer:</span>
              <span className="font-semibold text-[#1a2b27]">{user?.name || 'Officer'}</span>
            </div>
            <div className="flex items-center justify-between border-b border-[#d1dbcb]/50 pb-1.5">
              <span className="text-[#4e5c56]">Assigned Clearance Cadre:</span>
              <span className="font-mono font-bold text-[#2e5d4b]">{role || 'UNKNOWN'}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-[#4e5c56]">Access Disposition:</span>
              <span className="text-[10px] font-mono font-bold uppercase bg-red-100 text-red-900 px-2 py-0.5 rounded border border-red-200">
                403 Forbidden
              </span>
            </div>
          </div>

          <div className="mt-6 flex flex-col sm:flex-row items-center gap-2.5 w-full">
            <button
              onClick={() => navigate('/dashboard')}
              className="w-full py-2.5 px-4 rounded-lg bg-[#0e1c19] text-[#fffdf9] hover:bg-[#243b35] text-xs font-semibold flex items-center justify-center gap-2 transition-colors shadow-xs"
            >
              <span className="material-symbols-outlined text-[16px]">arrow_back</span>
              <span>Return to Dashboard</span>
            </button>
            <button
              onClick={() => navigate('/login')}
              className="w-full py-2.5 px-4 rounded-lg bg-white border border-[#d1dbcb] text-[#1a2b27] hover:bg-[#f6eed6] text-xs font-semibold flex items-center justify-center gap-2 transition-colors"
            >
              <span className="material-symbols-outlined text-[16px]">login</span>
              <span>Switch Session</span>
            </button>
          </div>

          <p className="text-[10px] text-[#4e5c56]/70 mt-4 font-mono">
            Audit Event #403 logged to immutable SHA-256 ledger.
          </p>
        </div>
      </div>
    </AppShell>
  );
};
