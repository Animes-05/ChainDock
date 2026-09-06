import React from 'react';
import { NavLink } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { canManageUsers } from '../../utils/permissions';

export const Sidebar: React.FC = () => {
  const { role, logout } = useAuth();

  const navItems: { to: string; label: string; icon: string; badge?: string }[] = [
    { to: '/dashboard', label: 'Dashboard', icon: 'dashboard' },
    { to: '/cases', label: 'Cases & Dossiers', icon: 'folder_open' },
    { to: '/documents', label: 'Documents & FIRs', icon: 'description' },
    { to: '/evidence', label: 'Evidence & Custody', icon: 'policy' },
    { to: '/audit', label: 'Audit Chain', icon: 'history_edu' },
    { to: '/security', label: 'Security Center', icon: 'security' },
  ];

  if (canManageUsers(role)) {
    navItems.push({ to: '/users', label: 'Users', icon: 'manage_accounts', badge: 'ADMIN' });
  }

  return (
    <aside className="fixed left-0 top-0 h-full w-64 bg-[#0e1c19] text-[#fffdf9] z-50 flex flex-col justify-between border-r border-[#243b35]/60 select-none">
      <div className="flex flex-col">
        {/* Institutional Brand Header */}
        <div className="h-16 flex items-center px-5 gap-3 border-b border-[#243b35]/60 bg-[#0e1c19]">
          <div className="w-8 h-8 rounded bg-[#243b35] flex items-center justify-center border border-[#d1dbcb]/20 text-[#fffdf9] shrink-0">
            <span className="material-symbols-outlined text-[20px]">shield</span>
          </div>
          <div className="flex flex-col min-w-0">
            <span className="font-bold text-sm tracking-wider uppercase text-[#fffdf9] leading-none truncate">
              ChainDock
            </span>
            <span className="text-[10px] text-[#d1dbcb]/70 uppercase tracking-wider mt-1 truncate">
              Forensic Case Repository
            </span>
          </div>
        </div>

        {/* Node Identification */}
        <div className="px-3.5 py-3 border-b border-[#243b35]/40">
          <div className="px-3 py-2 rounded bg-[#243b35]/40 border border-[#243b35]/80 flex items-center justify-between text-xs text-[#d1dbcb] font-mono">
            <span className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
              NODE ALPHA-01
            </span>
            <span className="text-[10px] uppercase text-[#d1dbcb]/60">MAINNET</span>
          </div>
        </div>

        {/* Main Navigation Links */}
        <nav className="flex flex-col gap-1 p-3">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                `flex items-center justify-between px-3 py-2.5 rounded text-xs tracking-wide transition-colors ${
                  isActive
                    ? 'bg-[#243b35] text-[#fffdf9] font-semibold shadow-sm'
                    : 'text-[#d1dbcb]/80 hover:bg-[#243b35]/50 hover:text-[#fffdf9]'
                }`
              }
            >
              <div className="flex items-center gap-3 min-w-0">
                <span className="material-symbols-outlined text-[18px] shrink-0">{item.icon}</span>
                <span className="truncate">{item.label}</span>
              </div>
              {item.badge && (
                <span className="text-[9px] font-mono font-bold px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30">
                  {item.badge}
                </span>
              )}
            </NavLink>
          ))}
        </nav>
      </div>

      {/* Cryptographic Root Footer & Logout */}
      <div className="p-3 flex flex-col gap-2">
        <div className="p-3 rounded bg-[#243b35]/40 border border-[#243b35]/80 flex flex-col gap-1.5 font-mono">
          <div className="flex items-center justify-between text-[11px] text-[#d1dbcb]">
            <span className="flex items-center gap-1.5 font-medium">
              <span className="material-symbols-outlined text-[14px]">lock</span>
              SHA-256 LEDGER
            </span>
            <span className="text-emerald-400 font-semibold text-[10px]">SYNCHRONIZED</span>
          </div>
          <div className="text-[10px] text-[#d1dbcb]/70 truncate">
            ROOT: 0x8F4A3C92C1D8
          </div>
        </div>

        <button
          onClick={logout}
          className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded text-xs font-semibold text-[#d1dbcb]/80 hover:text-red-400 hover:bg-[#243b35]/60 transition-colors"
        >
          <span className="material-symbols-outlined text-[16px]">logout</span>
          <span>Exit Secure Session</span>
        </button>
      </div>
    </aside>
  );
};
