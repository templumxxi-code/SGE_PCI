-- Conta demonstrativa no modelo canonico de autenticacao.
INSERT INTO users (
    nome,
    email,
    password_hash,
    ativo,
    role_id,
    must_change_password
)
SELECT
    'Usuario Demonstrativo',
    'demo.setor@pci.rn.gov.br',
    crypt('demo12345', gen_salt('bf')),
    TRUE,
    r.id,
    FALSE
FROM roles r
WHERE r.code = 'OPERACIONAL'
ON CONFLICT (email) DO NOTHING;
