-- Suspend (not delete): users are never hard-deleted because cases.documents
-- and audit_log reference users(id) without ON DELETE CASCADE. Suspending
-- preserves referential integrity and the audit trail.
DO $$ BEGIN
  CREATE TYPE user_status AS ENUM ('active', 'suspended');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

ALTER TABLE users ADD COLUMN IF NOT EXISTS status user_status NOT NULL DEFAULT 'active';
