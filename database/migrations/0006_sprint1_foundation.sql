-- Sprint 1: fundacao canonica de dados, RBAC, auditoria e workflow
CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code VARCHAR(60) NOT NULL UNIQUE,
    name VARCHAR(120) NOT NULL,
    active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS permissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code VARCHAR(80) NOT NULL UNIQUE,
    name VARCHAR(160) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS roles_permissions (
    role_id UUID NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
    permission_id UUID NOT NULL REFERENCES permissions(id) ON DELETE CASCADE,
    PRIMARY KEY (role_id, permission_id)
);

CREATE TABLE IF NOT EXISTS organizational_units_v2 (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nome VARCHAR(150) NOT NULL,
    tipo VARCHAR(30) NOT NULL CHECK (tipo IN ('INSTITUTO', 'REGIONAL', 'ASSESSORIA', 'NUCLEO', 'SETOR')),
    parent_id UUID REFERENCES organizational_units_v2(id),
    ativo BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nome VARCHAR(150) NOT NULL,
    matricula VARCHAR(60),
    email VARCHAR(150) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    ativo BOOLEAN NOT NULL DEFAULT TRUE,
    role_id UUID NOT NULL REFERENCES roles(id),
    organizational_unit_id UUID REFERENCES organizational_units_v2(id),
    must_change_password BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (matricula)
);

CREATE TABLE IF NOT EXISTS processes_v2 (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nome VARCHAR(200) NOT NULL,
    descricao TEXT,
    organizational_unit_id UUID REFERENCES organizational_units_v2(id),
    created_by UUID NOT NULL REFERENCES users(id),
    responsible_user_id UUID REFERENCES users(id),
    current_phase VARCHAR(20) NOT NULL CHECK (current_phase IN ('Planejar', 'Analisar', 'Desenhar', 'Implementar', 'Monitorar')),
    status VARCHAR(40) NOT NULL DEFAULT 'EM_ELABORACAO' CHECK (status IN ('EM_ELABORACAO', 'EM_ANDAMENTO', 'AGUARDANDO_APROVACAO', 'DEVOLVIDO', 'HOMOLOGADO')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS process_phases (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    process_id UUID NOT NULL REFERENCES processes_v2(id) ON DELETE CASCADE,
    phase_name VARCHAR(20) NOT NULL CHECK (phase_name IN ('Planejar', 'Analisar', 'Desenhar', 'Implementar', 'Monitorar')),
    order_number SMALLINT NOT NULL,
    status VARCHAR(30) NOT NULL DEFAULT 'PENDENTE',
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (process_id, phase_name),
    UNIQUE (process_id, order_number)
);

CREATE TABLE IF NOT EXISTS process_activities (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    phase_id UUID NOT NULL REFERENCES process_phases(id) ON DELETE CASCADE,
    codigo VARCHAR(80) NOT NULL,
    titulo VARCHAR(200) NOT NULL,
    descricao TEXT,
    responsible_user_id UUID REFERENCES users(id),
    status VARCHAR(30) NOT NULL DEFAULT 'PENDENTE',
    progress NUMERIC(5,2) NOT NULL DEFAULT 0 CHECK (progress >= 0 AND progress <= 100),
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (phase_id, codigo)
);

CREATE TABLE IF NOT EXISTS checklist_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    activity_id UUID NOT NULL REFERENCES process_activities(id) ON DELETE CASCADE,
    descricao VARCHAR(500) NOT NULL,
    required BOOLEAN NOT NULL DEFAULT TRUE,
    completed BOOLEAN NOT NULL DEFAULT FALSE,
    completed_by UUID REFERENCES users(id),
    completed_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS process_members (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    process_id UUID NOT NULL REFERENCES processes_v2(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id),
    responsibility VARCHAR(160) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (process_id, user_id)
);

CREATE TABLE IF NOT EXISTS attachments_v2 (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    process_id UUID NOT NULL REFERENCES processes_v2(id) ON DELETE CASCADE,
    activity_id UUID REFERENCES process_activities(id) ON DELETE CASCADE,
    original_name VARCHAR(255) NOT NULL,
    stored_name VARCHAR(255) NOT NULL UNIQUE,
    mime_type VARCHAR(120) NOT NULL,
    size BIGINT NOT NULL CHECK (size >= 0),
    uploaded_by UUID NOT NULL REFERENCES users(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS approvals (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    process_id UUID NOT NULL REFERENCES processes_v2(id) ON DELETE CASCADE,
    step VARCHAR(80) NOT NULL,
    approver_user_id UUID REFERENCES users(id),
    status VARCHAR(30) NOT NULL,
    comment TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS approval_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    process_id UUID NOT NULL REFERENCES processes_v2(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id),
    action VARCHAR(80) NOT NULL,
    observation TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id),
    title VARCHAR(200) NOT NULL,
    message TEXT NOT NULL,
    type VARCHAR(50) NOT NULL,
    read BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id),
    action VARCHAR(100) NOT NULL,
    entity VARCHAR(100) NOT NULL,
    entity_id VARCHAR(100),
    old_data JSONB,
    new_data JSONB,
    ip INET,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_users_role ON users(role_id);
CREATE INDEX IF NOT EXISTS idx_users_unit ON users(organizational_unit_id);
CREATE INDEX IF NOT EXISTS idx_processes_v2_unit ON processes_v2(organizational_unit_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_entity ON audit_logs(entity, entity_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON audit_logs(created_at);

INSERT INTO roles (code, name) VALUES
    ('NGE_ADMIN', 'Administrador NGE'),
    ('NGE', 'NGE'),
    ('DIRETOR', 'Diretor de Instituto'),
    ('SUBCOORDENADOR_INSTITUTO', 'Subcoordenador de Instituto'),
    ('SUBCOORDENADOR_REGIONAL', 'Subcoordenador de Regional'),
    ('ASSESSOR', 'Assessor'),
    ('CHEFE_NUCLEO', 'Chefe de Núcleo'),
    ('CHEFE_SETOR', 'Chefe de Setor'),
    ('OPERACIONAL', 'Operacional')
ON CONFLICT (code) DO NOTHING;

INSERT INTO permissions (code, name) VALUES
    ('process.view', 'Visualizar processo'),
    ('process.edit', 'Editar processo'),
    ('process.approve', 'Aprovar processo'),
    ('users.manage', 'Gerenciar usuários'),
    ('dashboard.global.view', 'Visualizar dashboard global')
ON CONFLICT (code) DO NOTHING;

INSERT INTO roles_permissions (role_id, permission_id)
SELECT r.id, p.id FROM roles r CROSS JOIN permissions p
WHERE r.code IN ('NGE_ADMIN', 'NGE')
ON CONFLICT DO NOTHING;

REVOKE UPDATE, DELETE ON audit_logs FROM PUBLIC;
