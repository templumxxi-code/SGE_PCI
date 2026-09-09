-- Bootstrap seguro do primeiro administrador da aplicacao.
-- O seed completo continua reservado para desenvolvimento/testes.
INSERT INTO users (
    nome,
    email,
    password_hash,
    ativo,
    role_id,
    must_change_password
)
SELECT
    'Administrador Sistema',
    'admin@pci.rn.gov.br',
    crypt('admin123', gen_salt('bf')),
    TRUE,
    r.id,
    FALSE
FROM roles r
WHERE r.code = 'NGE_ADMIN'
ON CONFLICT (email) DO NOTHING;
