import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';

interface NavbarProps {
  onMenuToggle?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({ onMenuToggle }) => {
  const { user, role, logout } = useAuth();
  const [dropdownOpen, setDropdownOpen] = useState(false);

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

        {/* User Profile Dropdown */}
        <div className="relative">
          <button
            onClick={() => setDropdownOpen(!dropdownOpen)}
            className="flex items-center gap-2.5 p-1 rounded hover:bg-[#f6eed6] transition-colors border border-transparent hover:border-[#d1dbcb]"
          >
            <div className="hidden sm:flex flex-col text-right">
              <span className="text-xs font-semibold text-[#1a2b27] leading-tight truncate max-w-[140px]">
                {user?.name || 'Authorized Officer'}
              </span>
              <span className="text-[10px] text-[#4e5c56] tracking-wider uppercase font-semibold font-mono">
                {role || 'OFFICER'} {user?.badgeNumber ? `· ${user.badgeNumber}` : ''}
              </span>
            </div>
            <div className="w-8 h-8 rounded bg-[#243b35] text-[#fffdf9] flex items-center justify-center font-bold text-xs border border-[#d1dbcb] shrink-0">
              {user?.name
                ? user.name
                    .split(' ')
                    .map((n) => n[0])
                    .slice(0, 2)
                    .join('')
                : 'AO'}
            </div>
            <span className="material-symbols-outlined text-[18px] text-[#4e5c56]">arrow_drop_down</span>
          </button>

          {dropdownOpen && (
            <div className="absolute right-0 mt-2 w-64 bg-[#fffdf9] rounded-xl shadow-xl border border-[#d1dbcb] p-3 flex flex-col gap-2 z-50 animate-in fade-in zoom-in-95 duration-150">
              <div className="px-2 py-1.5 border-b border-[#d1dbcb]/60 pb-2">
                <div className="text-xs font-bold text-[#1a2b27]">
                  {user?.name || 'Authorized Officer'}
                </div>
                <div className="text-[11px] text-[#4e5c56] font-mono truncate">
                  {user?.email || 'officer@police.gov.in'}
                </div>
                <div className="mt-1 flex items-center gap-1.5">
                  <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-[#243b35]/10 text-[#243b35] font-bold">
                    {role || 'INVESTIGATOR'}
                  </span>
                  {user?.badgeNumber && (
                    <span className="text-[10px] font-mono text-[#4e5c56]">
                      {user.badgeNumber}
                    </span>
                  )}
                </div>
              </div>

              <button
                onClick={() => {
                  setDropdownOpen(false);
                  logout();
                }}
                className="w-full text-left px-2.5 py-2 rounded-lg text-xs font-medium text-red-800 hover:bg-red-50 flex items-center gap-2 transition-colors"
              >
                <span className="material-symbols-outlined text-[16px]">logout</span>
                <span>Sign Out</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
