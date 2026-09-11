-- Sedes regionais da Polícia Científica do Rio Grande do Norte.
-- Migration idempotente: nao altera usuarios, permissoes, processos ou modulos.
INSERT INTO organizational_units_v2 (
    nome,
    sigla,
    tipo,
    parent_id,
    nivel_hierarquico,
    codigo_hierarquico,
    descricao,
    status,
    ativo
)
VALUES
    (
        'Regional Natal',
        NULL,
        'REGIONAL',
        (SELECT id FROM organizational_units_v2 WHERE codigo_hierarquico = '0'),
        2,
        '3',
        'Sede regional de Natal',
        'ACTIVE',
        TRUE
    ),
    (
        'Regional Pau dos Ferros',
        NULL,
        'REGIONAL',
        (SELECT id FROM organizational_units_v2 WHERE codigo_hierarquico = '0'),
        2,
        '4',
        'Sede regional de Pau dos Ferros',
        'ACTIVE',
        TRUE
    ),
    (
        'Regional Mossoró',
        NULL,
        'REGIONAL',
        (SELECT id FROM organizational_units_v2 WHERE codigo_hierarquico = '0'),
        2,
        '5',
        'Sede regional de Mossoró',
        'ACTIVE',
        TRUE
    ),
    (
        'Regional Caicó',
        NULL,
        'REGIONAL',
        (SELECT id FROM organizational_units_v2 WHERE codigo_hierarquico = '0'),
        2,
        '6',
        'Sede regional de Caicó',
        'ACTIVE',
        TRUE
    )
ON CONFLICT (codigo_hierarquico) DO UPDATE SET
    nome = EXCLUDED.nome,
    sigla = EXCLUDED.sigla,
    tipo = EXCLUDED.tipo,
    parent_id = EXCLUDED.parent_id,
    nivel_hierarquico = EXCLUDED.nivel_hierarquico,
    descricao = EXCLUDED.descricao,
    status = EXCLUDED.status,
    ativo = TRUE;
