-- Controle de acesso modular sobre a autenticação e o RBAC existentes.
CREATE TABLE IF NOT EXISTS modules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(150) NOT NULL,
    code VARCHAR(80) NOT NULL UNIQUE,
    description TEXT NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'INACTIVE')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS user_modules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    module_id UUID NOT NULL REFERENCES modules(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (user_id, module_id)
);

CREATE INDEX IF NOT EXISTS idx_modules_status ON modules(status);
CREATE INDEX IF NOT EXISTS idx_user_modules_user ON user_modules(user_id);
CREATE INDEX IF NOT EXISTS idx_user_modules_module ON user_modules(module_id);

INSERT INTO modules (name, code, description, status)
VALUES
    ('Gestão de Processos', 'PROCESS_MANAGEMENT', 'Gerenciamento de processos organizacionais', 'ACTIVE'),
    ('Planejamento Estratégico', 'STRATEGIC_PLANNING', 'Planejamento estratégico institucional', 'ACTIVE')
ON CONFLICT (code) DO UPDATE
SET name = EXCLUDED.name,
    description = EXCLUDED.description,
    status = EXCLUDED.status,
    updated_at = CURRENT_TIMESTAMP;

INSERT INTO user_modules (user_id, module_id)
SELECT u.id, m.id
FROM users u
JOIN modules m ON m.code = 'PROCESS_MANAGEMENT'
WHERE u.ativo = TRUE
ON CONFLICT (user_id, module_id) DO NOTHING;
