import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { Role } from '../../types';

interface NavbarProps {
  onMenuToggle?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({ onMenuToggle }) => {
  const { user, role, loginAsRole } = useAuth();
  const [dropdownOpen, setDropdownOpen] = useState(false);

  const rolesList: { role: Role; label: string; officer: string; badge: string; desc: string; tier: string }[] = [
    {
      role: 'INVESTIGATOR',
      label: 'Investigator',
      officer: 'Insp. Rajesh Sharma',
      badge: 'INSP-4029',
      desc: 'Assigned cases only, upload evidence & FIR records, search within docket',
      tier: 'Tier 1',
    },
    {
      role: 'SUPERVISOR',
      label: 'Supervisor',
      officer: 'ACP Meera Sen',
      badge: 'ACP-1044',
      desc: 'Audit trail oversight, document review, Ed25519 signature finalization',
      tier: 'Tier 2',
    },
    {
      role: 'ADMIN',
      label: 'Administrator',
      officer: 'Director Arvind Kumar',
      badge: 'ADM-001',
      desc: 'Personnel management, public keys, root chain integrity verification, tamper demo',
      tier: 'Tier 3',
    },
  ];

  return (
    <header className="fixed top-0 left-0 lg:left-64 right-0 h-16 bg-[#fffdf9] border-b border-[#d1dbcb] z-40 flex items-center justify-between px-4 sm:px-6 lg:px-8 gap-3 select-none">
      {/* Left Branding & Quick Search */}
      <div className="flex items-center gap-3 sm:gap-6 flex-1 min-w-0">
        <button
          onClick={onMenuToggle}
          className="lg:hidden p-1.5 rounded border border-[#d1dbcb] text-[#1a2b27] hover:bg-[#f6eed6] shrink-0 flex items-center justify-center"
          aria-label="Toggle navigation menu"
        >
          <span className="material-symbols-outlined text-[20px]">menu</span>
        </button>

        <div className="flex flex-col min-w-0 shrink-0">
          <span className="text-[10px] sm:text-[11px] font-bold tracking-wider text-[#2e5d4b] uppercase truncate">
            National Digital Evidence
          </span>
          <span className="text-[11px] sm:text-xs text-[#4e5c56] font-medium hidden sm:block truncate">
            Cryptographic Case Repository · SIH26190
          </span>
        </div>

        <div className="hidden md:block h-6 w-px bg-[#d1dbcb] shrink-0"></div>

        <div className="relative flex-1 max-w-xs hidden sm:block">
          <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-[#4e5c56] text-[18px]">
            search
          </span>
          <input
            className="w-full h-9 pl-9 pr-3 bg-[#fff9ed] border border-[#d1dbcb] rounded text-xs text-[#1a2b27] placeholder:text-[#4e5c56]/70 focus:outline-none focus:border-[#2e5d4b] focus:ring-1 focus:ring-[#2e5d4b] font-mono"
            placeholder="Search dossier ID, FIR, hash..."
            type="text"
          />
        </div>
      </div>

      {/* Right Controls: Consensus State & User Profile */}
      <div className="flex items-center gap-2 sm:gap-4 shrink-0">
        <div className="hidden md:flex items-center gap-2 px-3 py-1 rounded bg-[#cbe8db] text-[#143d2f] border border-[#2e5d4b]/20 text-xs font-mono font-medium">
          <span className="material-symbols-outlined text-[16px] text-[#2e5d4b]">verified_user</span>
          <span className="hidden lg:inline">CONSENSUS: 12/12 WITNESSES (VALID)</span>
          <span className="lg:hidden">12/12 VALID</span>
        </div>

        <div className="hidden md:block h-6 w-px bg-[#d1dbcb]"></div>

        {/* User Profile & Demo Role Switcher */}
        <div className="relative">
          <button
            onClick={() => setDropdownOpen(!dropdownOpen)}
            className="flex items-center gap-2.5 p-1 rounded hover:bg-[#f6eed6] transition-colors border border-transparent hover:border-[#d1dbcb]"
          >
            <div className="hidden sm:flex flex-col text-right">
              <span className="text-xs font-semibold text-[#1a2b27] leading-tight truncate max-w-[140px]">
                {user?.name || 'Insp. Rajesh Sharma'}
              </span>
              <span className="text-[10px] text-[#4e5c56] tracking-wider uppercase font-semibold font-mono">
                {role || 'INVESTIGATOR'} · {user?.badgeNumber || 'INSP-4029'}
              </span>
            </div>
            <div className="w-8 h-8 rounded bg-[#243b35] text-[#fffdf9] flex items-center justify-center font-bold text-xs border border-[#d1dbcb] shrink-0">
              {user?.name
                ? user.name
                    .split(' ')
                    .map((n) => n[0])
                    .slice(0, 2)
                    .join('')
                : 'RS'}
            </div>
            <span className="material-symbols-outlined text-[18px] text-[#4e5c56]">arrow_drop_down</span>
          </button>

          {dropdownOpen && (
            <div className="absolute right-0 mt-2 w-80 bg-[#fffdf9] rounded-xl shadow-xl border border-[#d1dbcb] p-3 flex flex-col gap-2 z-50 animate-in fade-in zoom-in-95 duration-150">
              <div className="px-2 py-1.5 border-b border-[#d1dbcb]/60 pb-2">
                <div className="text-[10px] font-bold uppercase tracking-wider text-[#2e5d4b]">
                  Role-Based Access Control (RBAC Sandbox)
                </div>
                <div className="text-xs text-[#1a2b27] font-medium mt-0.5">
                  Select a profile to test authority tiers defined in the PRD:
                </div>
              </div>

              <div className="flex flex-col gap-1.5">
                {rolesList.map((r) => (
                  <button
                    key={r.role}
                    onClick={() => {
                      loginAsRole(r.role);
                      setDropdownOpen(false);
                    }}
                    className={`text-left p-2.5 rounded-lg text-xs flex flex-col gap-1 transition-colors border ${
                      role === r.role
                        ? 'bg-[#cbe8db]/70 border-[#2e5d4b] text-[#143d2f] font-semibold'
                        : 'bg-[#fff9ed] border-[#d1dbcb]/60 hover:bg-[#f6eed6] text-[#1a2b27]'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-bold flex items-center gap-1.5 text-xs">
                        {role === r.role && (
                          <span className="w-2 h-2 rounded-full bg-[#2e5d4b]"></span>
                        )}
                        {r.officer}
                      </span>
                      <span className="text-[10px] uppercase font-mono px-1.5 py-0.5 rounded bg-[#243b35]/10 text-[#243b35] font-bold">
                        {r.tier} · {r.label}
                      </span>
                    </div>
                    <span className="text-[11px] text-[#4e5c56] leading-tight">{r.desc}</span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
