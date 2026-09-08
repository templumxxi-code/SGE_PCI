CREATE TABLE IF NOT EXISTS login_attempts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(150) NOT NULL,
    ip INET,
    success BOOLEAN NOT NULL,
    reason VARCHAR(120),
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_login_attempts_email_time ON login_attempts(email, created_at);

INSERT INTO permissions (code, name) VALUES
    ('USERS_CREATE', 'Criar usuarios'),
    ('USERS_EDIT', 'Editar usuarios'),
    ('USERS_DELETE', 'Desativar usuarios'),
    ('ROLES_MANAGE', 'Gerenciar perfis'),
    ('PROCESS_VIEW_ALL', 'Visualizar todos os processos'),
    ('PROCESS_APPROVE', 'Aprovar processos'),
    ('PROCESS_MONITOR', 'Monitorar processos'),
    ('INDICATORS_VIEW', 'Visualizar indicadores'),
    ('REPORTS_VIEW', 'Visualizar relatorios'),
    ('DASHBOARD_GLOBAL', 'Visualizar dashboard global'),
    ('AUDIT_VIEW', 'Visualizar auditoria'),
    ('SYSTEM_CONFIG', 'Configurar sistema'),
    ('PROCESS_VIEW_SETOR', 'Visualizar processos do setor'),
    ('PROCESS_MANAGE_SETOR', 'Gerenciar processos do setor'),
    ('PROCESS_VIEW_ASSIGNED', 'Visualizar processos atribuidos'),
    ('PROCESS_UPDATE_ASSIGNED', 'Atualizar processos atribuidos')
ON CONFLICT (code) DO NOTHING;

INSERT INTO roles_permissions (role_id, permission_id)
SELECT r.id, p.id FROM roles r CROSS JOIN permissions p
WHERE r.code = 'NGE_ADMIN'
  AND p.code IN ('USERS_CREATE', 'USERS_EDIT', 'USERS_DELETE', 'ROLES_MANAGE', 'PROCESS_VIEW_ALL', 'DASHBOARD_GLOBAL', 'AUDIT_VIEW', 'SYSTEM_CONFIG')
ON CONFLICT DO NOTHING;

INSERT INTO roles_permissions (role_id, permission_id)
SELECT r.id, p.id FROM roles r CROSS JOIN permissions p
WHERE r.code = 'NGE'
  AND p.code IN ('PROCESS_VIEW_ALL', 'PROCESS_APPROVE', 'PROCESS_MONITOR', 'INDICATORS_VIEW', 'REPORTS_VIEW')
ON CONFLICT DO NOTHING;

INSERT INTO roles_permissions (role_id, permission_id)
SELECT r.id, p.id FROM roles r CROSS JOIN permissions p
WHERE r.code IN ('CHEFE_SETOR', 'OPERACIONAL')
  AND p.code IN ('PROCESS_VIEW_SETOR', 'PROCESS_MANAGE_SETOR', 'PROCESS_VIEW_ASSIGNED', 'PROCESS_UPDATE_ASSIGNED')
ON CONFLICT DO NOTHING;