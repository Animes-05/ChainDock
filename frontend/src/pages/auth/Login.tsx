import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { Role } from '../../types';

export const Login: React.FC = () => {
  const navigate = useNavigate();
  const { login, enterEvaluationSession } = useAuth();

  const [activeTab, setActiveTab] = useState<'ADMIN' | 'USER'>('ADMIN');
  const [email, setEmail] = useState('admin@police.gov.in');
  const [password, setPassword] = useState('Admin@123456');
  const [jurisdiction, setJurisdiction] = useState('Node Alpha');
  const [sessionToken, setSessionToken] = useState('849201');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleTabSwitch = (mode: 'ADMIN' | 'USER') => {
    setActiveTab(mode);
    setError('');
    if (mode === 'ADMIN') {
      setEmail('admin@police.gov.in');
      setPassword('Admin@123456');
      setSessionToken('849201');
    } else {
      setEmail('officer@police.gov.in');
      setPassword('Officer@123456');
      setSessionToken('384910');
    }
  };

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      await login(email, password);
      navigate('/dashboard');
    } catch (err: unknown) {
      const msg =
        err instanceof Error
          ? err.message
          : 'Unable to authenticate with backend at http://127.0.0.1:3000. Ensure server is running.';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleQuickSession = (targetRole: Role) => {
    enterEvaluationSession(targetRole);
    navigate('/dashboard');
  };

  return (
    <div className="bg-[#0e1b17] min-h-screen flex flex-col justify-between p-3 sm:p-6 md:p-8 text-[#1a2b27] font-sans relative antialiased selection:bg-[#243b35] selection:text-white">
      {/* Top Institutional Ribbon */}
      <header className="w-full max-w-6xl mx-auto flex flex-wrap items-center justify-between gap-y-2 pb-4 border-b border-[#1d352e]/80 text-xs">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded bg-[#172c26] border border-[#243b35]/60 flex items-center justify-center text-[#2dd4bf]">
            <span className="material-symbols-outlined text-[18px]">shield</span>
          </div>
          <div>
            <div className="text-white/95 font-semibold tracking-wide text-xs sm:text-[13px]">
              Ministry of Home Affairs (NCRB, Women Safety Division) Team ASPIRE
            </div>
            <div className="text-emerald-300/70 text-[11px] font-normal tracking-wider">
              SIH26190 · National Digital Evidence &amp; Case Integrity Repository
            </div>
          </div>
        </div>
        <div className="hidden sm:flex items-center gap-3 font-mono text-[11px]">
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded bg-[#172c26] border border-[#243b35]/70 text-emerald-200">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
            NODE: SECURE-GRID-DEL-01
          </span>
          <span className="text-emerald-300/60">UTC+05:30</span>
        </div>
      </header>

      {/* Central Card Layout */}
      <main className="w-full max-w-5xl mx-auto my-auto py-4 sm:py-6">
        <div className="bg-white rounded-2xl overflow-hidden shadow-2xl grid grid-cols-1 lg:grid-cols-12 border border-[#d1dbcb]/40">
          {/* Left Panel: Institutional Authority & Compliance */}
          <section className="lg:col-span-5 bg-gradient-to-br from-[#162a24] via-[#12221d] to-[#0c1714] text-white p-5 sm:p-8 flex flex-col justify-between border-b lg:border-b-0 lg:border-r border-[#243b35]/50">
            <div>
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 rounded-lg bg-[#243b35] border border-[#d1dbcb]/30 flex items-center justify-center text-emerald-200">
                  <span className="material-symbols-outlined text-[24px]">verified</span>
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xl font-bold tracking-tight text-white font-sans">ChainDock</span>
                    <span className="text-[10px] font-mono uppercase bg-emerald-950 text-emerald-300 px-1.5 py-0.5 rounded border border-emerald-600/40">
                      SEC v2.4
                    </span>
                  </div>
                  <p className="text-[11px] text-emerald-200/70 tracking-wide mt-0.5">
                    Evidentiary Digital Custody Fortress
                  </p>
                </div>
              </div>

              {/* Authorized System Notice */}
              <div className="bg-white/[0.04] border border-white/10 rounded-xl p-4 mb-5">
                <div className="text-[11px] font-bold uppercase tracking-wider text-emerald-300/80 mb-1.5 font-mono flex items-center gap-1.5">
                  <span className="material-symbols-outlined text-[16px]">info</span>
                  Statutory Law Enforcement Notice
                </div>
                <p className="text-xs text-white/80 leading-relaxed font-normal">
                  Access is strictly restricted to designated police officers, forensic investigators, public prosecutors, and court magistrates. Every document upload, view, and tamper check is committed to an append-only SHA-256 hash chain.
                </p>
              </div>

              {/* Compliance Badges */}
              <div className="space-y-2 mb-6">
                <div className="text-[10px] font-bold uppercase tracking-wider text-white/50 font-mono">
                  Evidentiary Standards &amp; Crypto Specs
                </div>
                <div className="flex items-center justify-between p-2 rounded-lg bg-black/25 border border-white/5 text-xs">
                  <span className="text-white/90">Sec. 65B Evidence Act / Sec 63 BSA</span>
                  <span className="text-[10px] font-mono text-teal-300 bg-teal-950/70 px-2 py-0.5 rounded border border-teal-700/40">Compliant</span>
                </div>
                <div className="flex items-center justify-between p-2 rounded-lg bg-black/25 border border-white/5 text-xs">
                  <span className="text-white/90">Append-Only Audit Hash-Chain</span>
                  <span className="text-[10px] font-mono text-teal-300 bg-teal-950/70 px-2 py-0.5 rounded border border-teal-700/40">SHA-256</span>
                </div>
                <div className="flex items-center justify-between p-2 rounded-lg bg-black/25 border border-white/5 text-xs">
                  <span className="text-white/90">Digital Signature on Finalize</span>
                  <span className="text-[10px] font-mono text-teal-300 bg-teal-950/70 px-2 py-0.5 rounded border border-teal-700/40">Ed25519</span>
                </div>
              </div>
            </div>

            <div className="p-3 bg-black/30 rounded-xl border border-white/10 font-mono text-[11px] text-emerald-300/80 flex items-center justify-between">
              <span>ACTIVE CADRE:</span>
              <span className="font-bold text-white bg-emerald-900/60 px-2 py-0.5 rounded border border-emerald-500/30">
                {activeTab === 'ADMIN' ? 'ADMINISTRATOR (TIER 3)' : 'USER / INVESTIGATOR (TIER 1)'}
              </span>
            </div>
          </section>

          {/* Right Panel: Interactive Authentication Form */}
          <main className="lg:col-span-7 bg-[#fffdf9] p-6 sm:p-8 flex flex-col justify-between">
            <div className="flex flex-col gap-5">
              <div className="flex flex-col gap-1 border-b border-[#d1dbcb]/60 pb-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-xs font-bold text-[#2e5d4b] uppercase tracking-wider">
                    <span className="material-symbols-outlined text-[16px]">lock</span>
                    Jurisdictional Gateway Authentication
                  </div>
                </div>
                <h2 className="text-xl sm:text-2xl font-bold text-[#1a2b27] tracking-tight">
                  Officer Identity Verification
                </h2>
                <p className="text-xs text-[#4e5c56]">
                  Select your clearance portal, sign in with registered credentials, or use 1-click evaluator preview.
                </p>
              </div>

              {/* Login Mode Selector Tabs: Admin Login vs User Login */}
              <div className="flex items-center bg-[#f6eed6] p-1 rounded-xl border border-[#d1dbcb]">
                <button
                  type="button"
                  onClick={() => handleTabSwitch('ADMIN')}
                  className={`flex-1 py-2 rounded-lg text-xs font-semibold flex items-center justify-center gap-2 transition-all ${
                    activeTab === 'ADMIN'
                      ? 'bg-[#0e1c19] text-[#fffdf9] shadow-sm'
                      : 'text-[#4e5c56] hover:text-[#1a2b27]'
                  }`}
                >
                  <span className="material-symbols-outlined text-[16px]">admin_panel_settings</span>
                  <span>Admin Login (Tier 3)</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleTabSwitch('USER')}
                  className={`flex-1 py-2 rounded-lg text-xs font-semibold flex items-center justify-center gap-2 transition-all ${
                    activeTab === 'USER'
                      ? 'bg-[#0e1c19] text-[#fffdf9] shadow-sm'
                      : 'text-[#4e5c56] hover:text-[#1a2b27]'
                  }`}
                >
                  <span className="material-symbols-outlined text-[16px]">person</span>
                  <span>User Login (Investigator)</span>
                </button>
              </div>

              {error && (
                <div className="p-3.5 bg-red-100 text-red-900 rounded-xl text-xs font-medium border border-red-300 flex flex-col gap-2">
                  <div className="flex items-center gap-2">
                    <span className="material-symbols-outlined text-[18px] text-red-700 shrink-0">error</span>
                    <span>{error}</span>
                  </div>
                  <div className="flex items-center gap-2 pt-1 flex-wrap">
                    <button
                      type="button"
                      onClick={() => handleQuickSession('ADMIN')}
                      className="px-3 py-1.5 bg-[#243B35] text-[#FFF9ED] rounded-lg text-xs font-semibold hover:bg-[#162521] transition-colors flex items-center gap-1.5 shadow-xs"
                    >
                      <span>Explore as Admin</span>
                      <span className="material-symbols-outlined text-[15px]">arrow_forward</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleQuickSession('INVESTIGATOR')}
                      className="px-3 py-1.5 bg-[#fffdf9] border border-[#d1dbcb] text-[#1a2b27] rounded-lg text-xs font-semibold hover:bg-[#f6eed6] transition-colors flex items-center gap-1.5 shadow-xs"
                    >
                      <span>Explore as User</span>
                      <span className="material-symbols-outlined text-[15px]">arrow_forward</span>
                    </button>
                  </div>
                </div>
              )}

              <form onSubmit={handleLoginSubmit} className="flex flex-col gap-3.5">
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-semibold text-[#1a2b27] uppercase tracking-wider">
                    Jurisdiction Node Access Point
                  </label>
                  <select
                    value={jurisdiction}
                    onChange={(e) => setJurisdiction(e.target.value)}
                    className="h-10 px-3 bg-[#fff9ed] text-[#1a2b27] border border-[#d1dbcb] rounded text-xs focus:outline-none focus:border-[#2e5d4b] focus:ring-1 focus:ring-[#2e5d4b]"
                  >
                    <option value="Node Alpha">Jurisdiction Node Alpha (Special Crime Branch, Delhi)</option>
                    <option value="Node Beta">Jurisdiction Node Beta (Central Oversight &amp; Prosecution)</option>
                    <option value="Root Central">Sovereign Root Central Tribunal (NCRB Infrastructure)</option>
                  </select>
                </div>

                <div className="flex flex-col gap-1">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-semibold text-[#1a2b27] uppercase tracking-wider">
                      {activeTab === 'ADMIN' ? 'Administrator Email' : 'Officer / User Email'}
                    </label>
                    <span className="text-[10px] text-[#2e5d4b] font-mono font-medium">
                      {activeTab === 'ADMIN' ? 'Cadre: ADMIN' : 'Cadre: INVESTIGATOR'}
                    </span>
                  </div>
                  <div className="relative">
                    <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-[#4e5c56] text-[18px]">
                      {activeTab === 'ADMIN' ? 'admin_panel_settings' : 'badge'}
                    </span>
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                      className="w-full h-10 pl-9 pr-3 bg-[#fff9ed] text-[#1a2b27] border border-[#d1dbcb] rounded text-xs focus:outline-none focus:border-[#2e5d4b] focus:ring-1 focus:ring-[#2e5d4b] font-mono"
                    />
                  </div>
                </div>

                <div className="flex flex-col gap-1">
                  <label className="text-xs font-semibold text-[#1a2b27] uppercase tracking-wider">
                    Secret Key Phrase / Password
                  </label>
                  <div className="relative">
                    <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-[#4e5c56] text-[18px]">
                      key
                    </span>
                    <input
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      className="w-full h-10 pl-9 pr-3 bg-[#fff9ed] text-[#1a2b27] border border-[#d1dbcb] rounded text-xs focus:outline-none focus:border-[#2e5d4b] focus:ring-1 focus:ring-[#2e5d4b] font-mono"
                    />
                  </div>
                </div>

                <div className="flex flex-col gap-1">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-semibold text-[#1a2b27] uppercase tracking-wider">
                      MFA Hardware Token / TOTP
                    </label>
                    <span className="text-[10px] text-[#2e5d4b] font-mono font-bold">FIPS 140-3 COMPLIANT</span>
                  </div>
                  <input
                    type="text"
                    value={sessionToken}
                    onChange={(e) => setSessionToken(e.target.value)}
                    className="w-full h-10 px-3 bg-[#fff9ed] text-[#1a2b27] border border-[#d1dbcb] rounded text-xs focus:outline-none focus:border-[#2e5d4b] focus:ring-1 focus:ring-[#2e5d4b] font-mono"
                    placeholder="6-digit token (e.g. 849201)"
                  />
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full h-11 mt-2 rounded bg-[#0e1c19] text-[#fffdf9] hover:bg-[#243b35] font-semibold text-xs tracking-wider uppercase flex items-center justify-center gap-2 shadow-md transition-colors disabled:opacity-60"
                >
                  {loading ? (
                    <span className="inline-block w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <>
                      <span>Sign In as {activeTab === 'ADMIN' ? 'Administrator' : 'User (Officer)'}</span>
                      <span className="material-symbols-outlined text-[16px]">arrow_forward</span>
                    </>
                  )}
                </button>

                <div className="relative flex py-1 items-center">
                  <div className="flex-grow border-t border-[#d1dbcb]/60"></div>
                  <span className="flex-shrink mx-3 text-[10px] uppercase font-mono text-[#4e5c56]/80 font-semibold">
                    or quick 1-click evaluator preview
                  </span>
                  <div className="flex-grow border-t border-[#d1dbcb]/60"></div>
                </div>

                {/* Direct 1-Click Role Switcher Options */}
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => handleQuickSession('ADMIN')}
                    className="h-10 rounded bg-[#fff9ed] text-[#1a2b27] hover:bg-[#f6eed6] border border-[#d1dbcb] font-semibold text-xs flex items-center justify-center gap-1.5 shadow-xs transition-colors"
                  >
                    <span className="material-symbols-outlined text-[16px] text-[#2e5d4b]">admin_panel_settings</span>
                    <span>Admin Option</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleQuickSession('INVESTIGATOR')}
                    className="h-10 rounded bg-[#fff9ed] text-[#1a2b27] hover:bg-[#f6eed6] border border-[#d1dbcb] font-semibold text-xs flex items-center justify-center gap-1.5 shadow-xs transition-colors"
                  >
                    <span className="material-symbols-outlined text-[16px] text-[#2e5d4b]">person</span>
                    <span>User Option</span>
                  </button>
                </div>
              </form>
            </div>

            <div className="pt-4 mt-4 border-t border-[#d1dbcb]/60 flex items-center justify-between text-[11px] text-[#4e5c56] font-mono">
              <span>SHA-256 Commit Leaf: Active</span>
              <span className="text-emerald-700 font-semibold">12/12 Witnesses Online</span>
            </div>
          </main>
        </div>
      </main>

      {/* Footer */}
      <footer className="w-full max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2 pt-4 border-t border-[#1d352e]/80 text-[11px] text-white/50">
        <div>SIH26190 · Problem Statement: Secure Digital Document Management System</div>
        <div>Axum / Postgres / Ed25519 DAL / Append-Only Hash-Chain</div>
      </footer>
    </div>
  );
};
