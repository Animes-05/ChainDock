import React, { useState } from 'react';
import { FolderPlus } from 'lucide-react';
import { Modal } from '../ui/Modal';
import { Input } from '../ui/Input';
import { Button } from '../ui/Button';
import { Priority } from '../../types';

interface CaseFormProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: {
    title: string;
    case_number: string;
    description: string;
    priority: Priority;
    jurisdiction: string;
    lead_officer: string;
  }) => Promise<void>;
}

export const CaseForm: React.FC<CaseFormProps> = ({ isOpen, onClose, onSubmit }) => {
  const [title, setTitle] = useState('');
  const [caseNumber, setCaseNumber] = useState(`CD-2026-${Math.floor(100 + Math.random() * 900)}`);
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState<Priority>('HIGH');
  const [jurisdiction, setJurisdiction] = useState('Western Range Sanctuary');
  const [leadOfficer, setLeadOfficer] = useState('Officer S. Jenkins');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    setLoading(true);
    try {
      await onSubmit({
        title,
        case_number: caseNumber,
        description,
        priority,
        jurisdiction,
        lead_officer: leadOfficer,
      });
      onClose();
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Create New Case Docket"
      subtitle="Register an official evidentiary case container on the sovereign ledger"
      icon={<FolderPlus size={20} />}
    >
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <Input
          label="Case Reference Number"
          value={caseNumber}
          onChange={(e) => setCaseNumber(e.target.value)}
          required
          placeholder="e.g. CD-2026-104"
          helperText="Unique sovereign jurisdiction identifier"
        />

        <Input
          label="Docket Matter / Title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          required
          placeholder="e.g. Illegal Timber Felling in Sector 4 Reserve"
        />

        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-semibold uppercase tracking-wider text-forest-ink">
            Dossier Scope &amp; Preliminary Facts
          </label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={3}
            className="w-full p-3 bg-surface-container-low text-forest-ink placeholder:text-on-surface-variant/70 border border-moss-border/60 rounded-lg text-sm focus:outline-none focus:bg-surface-bright focus:border-secondary transition-colors"
            placeholder="Describe initial complaint, seized coordinates, or incident overview..."
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold uppercase tracking-wider text-forest-ink">
              Priority Tier
            </label>
            <select
              value={priority}
              onChange={(e) => setPriority(e.target.value as Priority)}
              className="h-10 px-3 bg-surface-container-low text-forest-ink border border-moss-border/60 rounded-lg text-sm focus:outline-none focus:bg-surface-bright focus:border-secondary"
            >
              <option value="LOW">Low</option>
              <option value="MEDIUM">Medium</option>
              <option value="HIGH">High (Magistrate Fast-Track)</option>
              <option value="CRITICAL">Critical (Active Encroachment)</option>
            </select>
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold uppercase tracking-wider text-forest-ink">
              Jurisdiction Sector
            </label>
            <input
              type="text"
              value={jurisdiction}
              onChange={(e) => setJurisdiction(e.target.value)}
              className="h-10 px-3 bg-surface-container-low text-forest-ink border border-moss-border/60 rounded-lg text-sm focus:outline-none focus:bg-surface-bright focus:border-secondary"
            />
          </div>
        </div>

        <Input
          label="Assigned Lead Investigator"
          value={leadOfficer}
          onChange={(e) => setLeadOfficer(e.target.value)}
          required
        />

        <div className="flex items-center justify-end gap-3 pt-3 border-t border-moss-border/40">
          <Button variant="secondary" type="button" onClick={onClose} disabled={loading}>
            Cancel
          </Button>
          <Button variant="primary" type="submit" loading={loading}>
            Commit Case to Ledger
          </Button>
        </div>
      </form>
    </Modal>
  );
};
