import React, { useState } from 'react';
import { AppShell } from '../components/layout/AppShell';
import { CertificateViewer } from '../components/security/CertificateViewer';

export const Security: React.FC = () => {
  const [isCertModalOpen, setIsCertModalOpen] = useState(false);

  return (
    <AppShell>
      <div className="space-y-8 animate-fade-in max-w-[1520px] mx-auto">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-moss-border">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl lg:text-3xl font-serif font-bold text-primary">
                Cryptographic Infrastructure
              </h1>
              <span className="bg-[#C3E8D2] text-[#1B3B2B] text-xs px-2.5 py-0.5 rounded-full font-semibold border border-[#6B8E7B]/40 flex items-center gap-1">
                <span className="material-symbols-outlined text-[14px]">shield</span>
                100% IMMUTABLE
              </span>
            </div>
            <p className="text-sm text-forest-ink/70 mt-1">
              Hardware Security Modules, Ed25519 Key Management, and Section 65B Court-Admissible Trust Anchors
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => setIsCertModalOpen(true)}
              className="px-3.5 py-2 bg-surface-container hover:bg-surface-container-high text-forest-ink border border-moss-border rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-xs"
            >
              <span className="material-symbols-outlined text-[17px] text-primary">verified</span>
              <span>Inspect Root CA Certificate</span>
            </button>
          </div>
        </div>

        {/* Cryptographic Stack 4 Pillars */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
          <div className="p-5 rounded-xl bg-surface-bright border border-moss-border shadow-xs space-y-3">
            <div className="p-2.5 rounded-lg bg-surface-container text-primary w-fit">
              <span className="material-symbols-outlined text-[22px]">lock</span>
            </div>
            <h3 className="text-sm font-semibold text-primary">SHA-256 Engine</h3>
            <p className="text-xs text-forest-ink/70 leading-relaxed">
              Content-addressable cryptographic hashing. 256-bit collision-resistant digests computed client-side before any packet transmission.
            </p>
            <div className="pt-2 flex items-center gap-1.5 text-xs text-secondary font-semibold">
              <span className="material-symbols-outlined text-[15px]">check_circle</span>
              <span>NIST FIPS 180-4</span>
            </div>
          </div>

          <div className="p-5 rounded-xl bg-surface-bright border border-moss-border shadow-xs space-y-3">
            <div className="p-2.5 rounded-lg bg-surface-container text-primary w-fit">
              <span className="material-symbols-outlined text-[22px]">vpn_key</span>
            </div>
            <h3 className="text-sm font-semibold text-primary">Ed25519 Signatures</h3>
            <p className="text-xs text-forest-ink/70 leading-relaxed">
              Edwards-curve Digital Signature Algorithm (RFC 8032). High-speed non-repudiation and quantum-resistant signature generation for supervisors.
            </p>
            <div className="pt-2 flex items-center gap-1.5 text-xs text-secondary font-semibold">
              <span className="material-symbols-outlined text-[15px]">check_circle</span>
              <span>Curve25519 Standard</span>
            </div>
          </div>

          <div className="p-5 rounded-xl bg-surface-bright border border-moss-border shadow-xs space-y-3">
            <div className="p-2.5 rounded-lg bg-surface-container text-primary w-fit">
              <span className="material-symbols-outlined text-[22px]">account_tree</span>
            </div>
            <h3 className="text-sm font-semibold text-primary">Merkle Hash Chain</h3>
            <p className="text-xs text-forest-ink/70 leading-relaxed">
              Sequential cryptographic block linkages. Any alteration to historical audit blocks breaks the root hash chain, immediately exposing unauthorized edits.
            </p>
            <div className="pt-2 flex items-center gap-1.5 text-xs text-secondary font-semibold">
              <span className="material-symbols-outlined text-[15px]">check_circle</span>
              <span>Zero-Trust Tamper Proof</span>
            </div>
          </div>

          <div className="p-5 rounded-xl bg-surface-bright border border-moss-border shadow-xs space-y-3">
            <div className="p-2.5 rounded-lg bg-surface-container text-primary w-fit">
              <span className="material-symbols-outlined text-[22px]">memory</span>
            </div>
            <h3 className="text-sm font-semibold text-primary">CloudHSM Cluster</h3>
            <p className="text-xs text-forest-ink/70 leading-relaxed">
              Isolated hardware boundary for private keys. Non-exportable cryptographic seeds with multi-party quorum controls.
            </p>
            <div className="pt-2 flex items-center gap-1.5 text-xs text-secondary font-semibold">
              <span className="material-symbols-outlined text-[15px]">check_circle</span>
              <span>FIPS 140-2 Level 3</span>
            </div>
          </div>
        </div>

        {/* Hardware Security Module Infrastructure Status */}
        <div className="bg-surface-bright border border-moss-border rounded-xl p-6 shadow-xs space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-moss-border">
            <div>
              <h2 className="text-base font-serif font-bold text-primary">
                Hardware Security Module (HSM) Topology
              </h2>
              <p className="text-xs text-forest-ink/60">
                Physical cryptographic accelerator instances securing root custody signing keys across national zones
              </p>
            </div>
            <span className="text-xs text-forest-ink/60 font-mono">
              Sync Epoch: 2,491,029
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-4 rounded-xl border border-secondary/30 bg-secondary-container/10 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-secondary text-[20px]">dns</span>
                  <span className="text-xs font-bold text-primary">Primary HSM Instance (ap-south-1a, New Delhi)</span>
                </div>
                <span className="px-2 py-0.5 rounded bg-[#C3E8D2] text-[#1B3B2B] text-[10px] font-bold border border-[#6B8E7B]/40">
                  ACTIVE
                </span>
              </div>
              <div className="grid grid-cols-2 gap-2 text-[11px] font-mono text-forest-ink/70">
                <div>Cluster: CD-PROD-HSM-DEL</div>
                <div>Firmware: v4.19-SEC</div>
                <div>Crypto Ops: 1,420/sec</div>
                <div>Latency: 1.2ms</div>
              </div>
            </div>

            <div className="p-4 rounded-xl border border-moss-border bg-surface-container-low space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-forest-ink/60 text-[20px]">dns</span>
                  <span className="text-xs font-bold text-primary">Secondary Failover (ap-south-1b, Mumbai)</span>
                </div>
                <span className="px-2 py-0.5 rounded bg-surface-container text-forest-ink text-[10px] font-bold border border-moss-border">
                  STANDBY
                </span>
              </div>
              <div className="grid grid-cols-2 gap-2 text-[11px] font-mono text-forest-ink/70">
                <div>Cluster: CD-PROD-HSM-MUM</div>
                <div>Firmware: v4.19-SEC</div>
                <div>Replication: 0.05s lag</div>
                <div>Keys In Sync: 100%</div>
              </div>
            </div>
          </div>
        </div>

        {/* Regulatory & Legal Admissibility Compliance Matrix */}
        <div className="bg-surface-bright border border-moss-border rounded-xl p-6 shadow-xs space-y-4">
          <h2 className="text-base font-serif font-bold text-primary">
            Statutory Forensic Compliance &amp; Standards
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <div className="p-4 rounded-lg border border-moss-border bg-surface-container-low space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-primary">Section 65B Indian Evidence Act</span>
                <span className="material-symbols-outlined text-secondary text-base">verified</span>
              </div>
              <p className="text-xs text-forest-ink/70">
                Electronic Records Admissibility: Cryptographic hash certificates produced lawfully without unauthorized alteration, certifying device custody and hash reproducibility.
              </p>
            </div>

            <div className="p-4 rounded-lg border border-moss-border bg-surface-container-low space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-primary">Bharatiya Sakshya Adhiniyam (BSA)</span>
                <span className="material-symbols-outlined text-secondary text-base">verified</span>
              </div>
              <p className="text-xs text-forest-ink/70">
                Digital Evidence Protocols: Primary and secondary evidence classification standards with continuous unbroken cryptographic chain of custody.
              </p>
            </div>

            <div className="p-4 rounded-lg border border-moss-border bg-surface-container-low space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-primary">ISO/IEC 27037:2012</span>
                <span className="material-symbols-outlined text-secondary text-base">verified</span>
              </div>
              <p className="text-xs text-forest-ink/70">
                Guidelines for identification, collection, acquisition, and preservation of digital forensic evidence under international zero-trust protocols.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Root Certificate Modal */}
      <CertificateViewer
        isOpen={isCertModalOpen}
        onClose={() => setIsCertModalOpen(false)}
      />
    </AppShell>
  );
};
