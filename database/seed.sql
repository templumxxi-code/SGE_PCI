-- ============================================================================
-- SMP PCI - Dados Iniciais (Seed Data)
-- Execute este arquivo após o schema.sql para popular o banco
-- ============================================================================

-- Inserir setores/núcleos adicionais
INSERT INTO setores (nome, descricao) VALUES
('Núcleo de Criminalística', 'Análises de criminalistaica geral'),
('Núcleo de Latentes', 'Análise de impressões digitais'),
('Núcleo de Perícia Técnica', 'Perícia técnica geral'),
('Administrativo', 'Setor administrativo')
ON CONFLICT (nome) DO NOTHING;

-- Inserir macroprocessos adicionais
INSERT INTO macroprocessos (nome, descricao) VALUES
('Atendimento ao Cliente', 'Macroprocesso de atendimento'),
('Gestão Orçamentária', 'Gerenciamento de orçamento'),
('Conformidade Regulatória', 'Atendimento a regulamentações')
ON CONFLICT (nome) DO NOTHING;

-- Inserir usuários de teste (senhas hasheadas: admin123 e setor123)
INSERT INTO usuarios (nome, email, senha_hash, perfil, setor_id) VALUES
('Administrador Sistema', 'admin@pci.rn.gov.br', '$2a$10$BQvHKJFxZKxQKKdHgbqHd.F6L2v2SfSZPaMxHJfFmX2lYrCsJ6QfS', 'NGE', 6),
('Representante Setor', 'setor@pci.rn.gov.br', '$2a$10$BQvHKJFxZKxQKKdHgbqHd.F6L2v2SfSZPaMxHJfFmX2lYrCsJ6QfS', 'SETOR', 1),
('João da Silva', 'joao.silva@pci.rn.gov.br', '$2a$10$BQvHKJFxZKxQKKdHgbqHd.F6L2v2SfSZPaMxHJfFmX2lYrCsJ6QfS', 'SETOR', 2),
('Maria Santos', 'maria.santos@pci.rn.gov.br', '$2a$10$BQvHKJFxZKxQKKdHgbqHd.F6L2v2SfSZPaMxHJfFmX2lYrCsJ6QfS', 'SETOR', 3),
('Pedro Costa', 'pedro.costa@pci.rn.gov.br', '$2a$10$BQvHKJFxZKxQKKdHgbqHd.F6L2v2SfSZPaMxHJfFmX2lYrCsJ6QfS', 'SETOR', 1)
ON CONFLICT (email) DO NOTHING;

-- Inserir processos de exemplo
INSERT INTO processos (nome, setor_id, macroprocesso_id, status_fase, percentual_conclusao, responsavel_id) VALUES
('Análise de DNA - Caso 001', 1, 1, 'Implementar', 75, 2),
('Análise de Documentos - Caso 002', 2, 1, 'Monitorar', 90, 3),
('Perícia em Cena de Crime', 3, 1, 'Analisar', 45, 4),
('Implementação de Novo Equipamento', 1, 5, 'Redesenhar', 30, 5),
('Treinamento de Pessoal', 4, 3, 'Implementar', 60, 2)
ON CONFLICT DO NOTHING;

-- Inserir indicadores de exemplo
INSERT INTO indicadores (processo_id, nome, valor_meta, valor_atual, unidade_medida, tipo_indicador, periodicidade) VALUES
(1, 'Taxa de Conclusão de Análises', 100, 85, '%', 'Eficiência', 'Mensal'),
(1, 'Conformidade Legal', 100, 95, '%', 'Conformidade', 'Mensal'),
(2, 'Tempo Médio de Análise', 5, 4.2, 'dias', 'Eficiência', 'Semanal'),
(3, 'Taxa de Satisfação', 90, 88, '%', 'Qualidade', 'Mensal'),
(4, 'Equipamentos Operacionais', 100, 70, '%', 'Eficiência', 'Quinzenal');

-- Inserir histórico de processos
INSERT INTO historico_processos (processo_id, status_anterior, status_novo, mudado_por) VALUES
(1, 'Planejar', 'Analisar', 2),
(1, 'Analisar', 'Redesenhar', 2),
(1, 'Redesenhar', 'Implementar', 2),
(2, 'Planejar', 'Analisar', 3),
(2, 'Analisar', 'Implementar', 3),
(2, 'Implementar', 'Monitorar', 3);

-- Exibir resumo dos dados inseridos
SELECT 'Setores' as tabela, COUNT(*) as total FROM setores
UNION ALL
SELECT 'Usuários', COUNT(*) FROM usuarios
UNION ALL
SELECT 'Processos', COUNT(*) FROM processos
UNION ALL
SELECT 'Indicadores', COUNT(*) FROM indicadores
UNION ALL
SELECT 'Histórico', COUNT(*) FROM historico_processos;
