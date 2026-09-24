UPDATE users
SET password_hash = '$2a$12$CyPMWtvG7jpZZsHpj.xfROW/bxITSxRv0GKyOvr6drdajIc0HLNL.',
    must_change_password = FALSE,
    updated_at = CURRENT_TIMESTAMP
WHERE LOWER(email) = LOWER('admin@pci.rn.gov.br');