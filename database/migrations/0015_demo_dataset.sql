-- Dados demonstrativos idempotentes para validacao visual do sistema.
-- Nao remove nem altera registros existentes.

INSERT INTO setores (nome, descricao) VALUES
    ('Nucleo de Criminalistica', 'Analises criminais demonstrativas'),
    ('Nucleo de Pericia Tecnica', 'Pericias tecnicas demonstrativas'),
    ('Setor Administrativo', 'Atividades administrativas demonstrativas')
ON CONFLICT (nome) DO NOTHING;

INSERT INTO macroprocessos (nome, descricao) VALUES
    ('Atendimento ao Cidadao', 'Fluxos demonstrativos de atendimento'),
    ('Pericia Tecnica', 'Fluxos demonstrativos de pericia'),
    ('Gestao Administrativa', 'Fluxos demonstrativos administrativos')
ON CONFLICT (nome) DO NOTHING;

INSERT INTO usuarios (nome, email, senha_hash, perfil, setor_id)
SELECT 'Usuario Demonstrativo', 'demo.setor@pci.rn.gov.br',
       crypt('demo12345', gen_salt('bf')), 'SETOR', s.id
FROM setores s
WHERE s.nome = 'Nucleo de Criminalistica'
ON CONFLICT (email) DO NOTHING;

INSERT INTO processos (
    nome, setor_id, macroprocesso_id, status_fase, percentual_conclusao,
    responsavel_id, observacoes
)
SELECT v.nome, s.id, m.id, v.status_fase, v.percentual, u.id, v.observacoes
FROM (VALUES
    ('Pericia de documentos oficiais', 'Analisar', 35::numeric, 'Caso demonstrativo em analise'),
    ('Atendimento a solicitacoes externas', 'Implementar', 70::numeric, 'Fluxo demonstrativo em execucao'),
    ('Inventario de equipamentos', 'Monitorar', 90::numeric, 'Acompanhamento demonstrativo')
) AS v(nome, status_fase, percentual, observacoes)
JOIN setores s ON s.nome = CASE v.nome
    WHEN 'Pericia de documentos oficiais' THEN 'Nucleo de Pericia Tecnica'
    WHEN 'Atendimento a solicitacoes externas' THEN 'Nucleo de Criminalistica'
    ELSE 'Setor Administrativo'
END
JOIN macroprocessos m ON m.nome = CASE v.nome
    WHEN 'Pericia de documentos oficiais' THEN 'Pericia Tecnica'
    WHEN 'Atendimento a solicitacoes externas' THEN 'Atendimento ao Cidadao'
    ELSE 'Gestao Administrativa'
END
JOIN usuarios u ON u.email = 'demo.setor@pci.rn.gov.br'
WHERE NOT EXISTS (SELECT 1 FROM processos p WHERE p.nome = v.nome);

INSERT INTO subprocessos (processo_id, nome, descricao, status_fase, ordem)
SELECT p.id, 'Preparacao demonstrativa', 'Subprocesso para apresentacao do sistema',
       p.status_fase, 1
FROM processos p
WHERE p.nome IN (
    'Pericia de documentos oficiais',
    'Atendimento a solicitacoes externas',
    'Inventario de equipamentos'
)
  AND NOT EXISTS (
      SELECT 1 FROM subprocessos s
      WHERE s.processo_id = p.id AND s.nome = 'Preparacao demonstrativa'
  );

INSERT INTO atividades (
    subprocesso_id, nome, descricao, status, responsavel_id,
    data_inicio, data_vencimento, ordem
)
SELECT s.id, 'Revisar documentos e evidencias',
       'Atividade demonstrativa para validacao do fluxo',
       'Em Andamento', u.id, CURRENT_TIMESTAMP,
       CURRENT_TIMESTAMP + INTERVAL '14 days', 1
FROM subprocessos s
JOIN processos p ON p.id = s.processo_id
JOIN usuarios u ON u.email = 'demo.setor@pci.rn.gov.br'
WHERE s.nome = 'Preparacao demonstrativa'
  AND NOT EXISTS (
      SELECT 1 FROM atividades a
      WHERE a.subprocesso_id = s.id
        AND a.nome = 'Revisar documentos e evidencias'
  );

INSERT INTO tarefas (
    atividade_id, nome, descricao, status, responsavel_id,
    percentual_conclusao, data_criacao, data_vencimento
)
SELECT a.id, 'Conferir checklist', 'Tarefa demonstrativa de conferência',
       'Pendente', u.id, 25, CURRENT_TIMESTAMP,
       CURRENT_TIMESTAMP + INTERVAL '7 days'
FROM atividades a
JOIN subprocessos s ON s.id = a.subprocesso_id
JOIN processos p ON p.id = s.processo_id
JOIN usuarios u ON u.email = 'demo.setor@pci.rn.gov.br'
WHERE a.nome = 'Revisar documentos e evidencias'
  AND NOT EXISTS (
      SELECT 1 FROM tarefas t
      WHERE t.atividade_id = a.id AND t.nome = 'Conferir checklist'
  );

INSERT INTO indicadores (
    processo_id, nome, descricao, valor_meta, valor_atual,
    unidade_medida, tipo_indicador, periodicidade
)
SELECT p.id, v.nome, 'KPI demonstrativo para apresentacao',
       v.meta, v.atual, v.unidade, v.tipo, v.periodicidade
FROM (VALUES
    ('Prazo medio de atendimento', 'dias', 10::numeric, 7::numeric, 'Eficiência', 'Mensal'),
    ('Conformidade documental', '%', 95::numeric, 88::numeric, 'Conformidade', 'Mensal'),
    ('Satisfacao dos usuarios', '%', 90::numeric, 84::numeric, 'Qualidade', 'Trimestral')
) AS v(nome, unidade, meta, atual, tipo, periodicidade)
JOIN processos p ON p.nome = CASE v.nome
    WHEN 'Prazo medio de atendimento' THEN 'Atendimento a solicitacoes externas'
    WHEN 'Conformidade documental' THEN 'Pericia de documentos oficiais'
    ELSE 'Inventario de equipamentos'
END
WHERE NOT EXISTS (
    SELECT 1 FROM indicadores i
    WHERE i.processo_id = p.id AND i.nome = v.nome
);

INSERT INTO alertas (tipo, processo_id, descricao, severidade)
SELECT 'Meta Não Atingida', p.id,
       'Alerta demonstrativo para revisao do indicador',
       'Média'
FROM processos p
WHERE p.nome = 'Pericia de documentos oficiais'
  AND NOT EXISTS (
      SELECT 1 FROM alertas a
      WHERE a.processo_id = p.id
        AND a.descricao = 'Alerta demonstrativo para revisao do indicador'
  );

INSERT INTO historico_processos (
    processo_id, status_anterior, status_novo, mudado_por, comentario
)
SELECT p.id, 'Planejar', p.status_fase, u.id,
       'Historico demonstrativo criado para apresentacao'
FROM processos p
JOIN usuarios u ON u.email = 'demo.setor@pci.rn.gov.br'
WHERE p.nome IN (
    'Pericia de documentos oficiais',
    'Atendimento a solicitacoes externas',
    'Inventario de equipamentos'
)
  AND NOT EXISTS (
      SELECT 1 FROM historico_processos h
      WHERE h.processo_id = p.id
        AND h.comentario = 'Historico demonstrativo criado para apresentacao'
  );
