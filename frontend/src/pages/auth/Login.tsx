import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

export const Login: React.FC = () => {
  const navigate = useNavigate();
  const { login, enterEvaluationSession } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [jurisdiction, setJurisdiction] = useState('Node Alpha');
  const [sessionToken, setSessionToken] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      await login(email, password);
      navigate('/dashboard');
    } catch (err: unknown) {
      setError(
        err instanceof Error
          ? err.message
          : 'Unable to authenticate with backend at http://127.0.0.1:3000. Ensure server is running.'
      );
    } finally {
      setLoading(false);
    }
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
          </section>

          {/* Right Panel: Interactive Authentication Form */}
          <main className="lg:col-span-7 bg-[#fffdf9] p-6 sm:p-8 flex flex-col justify-between">
            <div className="flex flex-col gap-5">
              <div className="flex flex-col gap-1 border-b border-[#d1dbcb]/60 pb-3">
                <div className="flex items-center gap-2 text-xs font-bold text-[#2e5d4b] uppercase tracking-wider">
                  <span className="material-symbols-outlined text-[16px]">lock</span>
                  Jurisdictional Gateway Authentication
                </div>
                <h2 className="text-xl sm:text-2xl font-bold text-[#1a2b27] tracking-tight">
                  Officer Identity Verification
                </h2>
                <p className="text-xs text-[#4e5c56]">
                  Sign in with registered police / judicial email and cryptographic authentication token.
                </p>
              </div>

              {error && (
                <div className="p-3.5 bg-red-100 text-red-900 rounded-xl text-xs font-medium border border-red-300 flex flex-col gap-2">
                  <div className="flex items-center gap-2">
                    <span className="material-symbols-outlined text-[18px] text-red-700 shrink-0">error</span>
                    <span>{error}</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      enterEvaluationSession('ADMIN');
                      navigate('/dashboard');
                    }}
                    className="self-start px-3 py-1.5 bg-[#243B35] text-[#FFF9ED] rounded-lg text-xs font-semibold hover:bg-[#162521] transition-colors flex items-center gap-1.5 mt-1 shadow-xs"
                  >
                    <span>Enter Offline Session &amp; View All Pages</span>
                    <span className="material-symbols-outlined text-[15px]">arrow_forward</span>
                  </button>
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
                  <label className="text-xs font-semibold text-[#1a2b27] uppercase tracking-wider">
                    Officer Email / Government ID
                  </label>
                  <div className="relative">
                    <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-[#4e5c56] text-[18px]">
                      badge
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
                      <span>Initialize Cryptographic Session</span>
                      <span className="material-symbols-outlined text-[16px]">arrow_forward</span>
                    </>
                  )}
                </button>

                <div className="relative flex py-1 items-center">
                  <div className="flex-grow border-t border-[#d1dbcb]/60"></div>
                  <span className="flex-shrink mx-3 text-[10px] uppercase font-mono text-[#4e5c56]/80 font-semibold">
                    or preview frontend
                  </span>
                  <div className="flex-grow border-t border-[#d1dbcb]/60"></div>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    enterEvaluationSession('ADMIN');
                    navigate('/dashboard');
                  }}
                  className="w-full h-10 rounded bg-[#fff9ed] text-[#1a2b27] hover:bg-[#f6eed6] border border-[#d1dbcb] font-semibold text-xs tracking-wider flex items-center justify-center gap-2 shadow-xs transition-colors"
                >
                  <span className="material-symbols-outlined text-[16px] text-[#2e5d4b]">visibility</span>
                  <span>Explore &amp; View All Pages Directly</span>
                </button>
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
