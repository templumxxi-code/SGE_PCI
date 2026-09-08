INSERT INTO permissions (code, name) VALUES
    ('PROCESS_VIEW', 'Visualizar processos BPM'),
    ('PROCESS_CREATE', 'Criar processos BPM'),
    ('PROCESS_UPDATE', 'Atualizar processos BPM'),
    ('CHECKLIST_UPDATE', 'Atualizar checklist BPM'),
    ('ATTACHMENT_CREATE', 'Enviar anexos BPM'),
    ('INDICATOR_MANAGE', 'Gerenciar indicadores BPM')
ON CONFLICT (code) DO NOTHING;

INSERT INTO roles_permissions (role_id, permission_id)
SELECT r.id, p.id FROM roles r CROSS JOIN permissions p
WHERE r.code IN ('NGE_ADMIN', 'NGE')
  AND p.code IN ('PROCESS_VIEW', 'PROCESS_CREATE', 'PROCESS_UPDATE', 'CHECKLIST_UPDATE', 'ATTACHMENT_CREATE', 'INDICATOR_MANAGE')
ON CONFLICT DO NOTHING;

INSERT INTO roles_permissions (role_id, permission_id)
SELECT r.id, p.id FROM roles r CROSS JOIN permissions p
WHERE r.code IN ('CHEFE_SETOR', 'CHEFE_NUCLEO', 'OPERACIONAL')
  AND p.code IN ('PROCESS_VIEW', 'PROCESS_CREATE', 'PROCESS_UPDATE', 'CHECKLIST_UPDATE', 'ATTACHMENT_CREATE', 'INDICATOR_MANAGE')
ON CONFLICT DO NOTHING;