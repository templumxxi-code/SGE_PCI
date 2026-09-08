CREATE TABLE IF NOT EXISTS processes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    organizational_unit_id UUID NOT NULL REFERENCES organizational_units_v2(id),
    created_by UUID NOT NULL REFERENCES users(id),
    responsible_user_id UUID REFERENCES users(id),
    status VARCHAR(50) NOT NULL DEFAULT 'DRAFT' CHECK (status IN ('DRAFT', 'ACTIVE', 'COMPLETED', 'CANCELLED')),
    current_phase VARCHAR(50) NOT NULL DEFAULT 'PLAN',
    progress_percent NUMERIC(5,2) NOT NULL DEFAULT 0 CHECK (progress_percent >= 0 AND progress_percent <= 100),
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

ALTER TABLE process_phases ADD COLUMN IF NOT EXISTS phase_code VARCHAR(50);
ALTER TABLE process_phases ADD COLUMN IF NOT EXISTS phase_order INTEGER;
ALTER TABLE process_phases ADD COLUMN IF NOT EXISTS progress_percent NUMERIC(5,2) NOT NULL DEFAULT 0 CHECK (progress_percent >= 0 AND progress_percent <= 100);
ALTER TABLE process_phases ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP;

ALTER TABLE process_activities ADD COLUMN IF NOT EXISTS activity_code VARCHAR(50);
ALTER TABLE process_activities ADD COLUMN IF NOT EXISTS title VARCHAR(255);
ALTER TABLE process_activities ADD COLUMN IF NOT EXISTS description TEXT;

CREATE TABLE IF NOT EXISTS activity_responsibles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    activity_id UUID NOT NULL REFERENCES process_activities(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id),
    assigned_by UUID NOT NULL REFERENCES users(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (activity_id, user_id)
);

CREATE TABLE IF NOT EXISTS activity_checklists (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    activity_id UUID NOT NULL REFERENCES process_activities(id) ON DELETE CASCADE,
    description TEXT NOT NULL,
    required BOOLEAN NOT NULL DEFAULT TRUE,
    completed BOOLEAN NOT NULL DEFAULT FALSE,
    completed_by UUID REFERENCES users(id),
    completed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS attachments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    process_id UUID NOT NULL,
    activity_id UUID REFERENCES process_activities(id) ON DELETE CASCADE,
    file_name VARCHAR(255) NOT NULL,
    storage_path TEXT NOT NULL,
    attachment_type VARCHAR(100) NOT NULL,
    required BOOLEAN NOT NULL DEFAULT FALSE,
    uploaded_by UUID NOT NULL REFERENCES users(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS process_indicators (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    process_id UUID NOT NULL,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    target NUMERIC,
    current_value NUMERIC,
    unit VARCHAR(50),
    status VARCHAR(50),
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_processes_unit ON processes(organizational_unit_id);
CREATE INDEX IF NOT EXISTS idx_processes_created_by ON processes(created_by);
CREATE INDEX IF NOT EXISTS idx_processes_status ON processes(status);
CREATE INDEX IF NOT EXISTS idx_process_phases_process ON process_phases(process_id);
CREATE INDEX IF NOT EXISTS idx_process_phases_code ON process_phases(phase_code);
CREATE INDEX IF NOT EXISTS idx_process_activities_phase ON process_activities(phase_id);
CREATE INDEX IF NOT EXISTS idx_process_activities_code ON process_activities(activity_code);
CREATE INDEX IF NOT EXISTS idx_activity_checklists_activity ON activity_checklists(activity_id);
CREATE INDEX IF NOT EXISTS idx_activity_checklists_completed ON activity_checklists(completed);
CREATE INDEX IF NOT EXISTS idx_activity_responsibles_user ON activity_responsibles(user_id);