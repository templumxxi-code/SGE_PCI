-- ============================================================================
-- Migration 0003: Fase Planejar - BPM
-- Polícia Científica do Rio Grande do Norte
-- ============================================================================

-- Tabela de Projetos de Melhoria (Fase Planejar)
CREATE TABLE planejar_projetos (
    id SERIAL PRIMARY KEY,
    processo_id INT NOT NULL REFERENCES processos(id) ON DELETE CASCADE,
    setor_id INT NOT NULL REFERENCES setores(id),
    objetivo TEXT NOT NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'NÃO_INICIADA' CHECK (status IN ('NÃO_INICIADA', 'EM_PREENCHIMENTO', 'AGUARDANDO_VALIDACAO', 'APROVADA', 'DEVOLVIDA_PARA_CORRECAO')),
    criado_por INT NOT NULL REFERENCES usuarios(id),
    criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    atualizado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    atualizado_por INT REFERENCES usuarios(id),
    aprovado_por INT REFERENCES usuarios(id),
    data_aprovacao TIMESTAMP,
    motivo_devolucao TEXT,
    observacoes TEXT
);

-- Tabela de Análise SWOT
CREATE TABLE planejar_swot (
    id SERIAL PRIMARY KEY,
    planejar_projeto_id INT NOT NULL REFERENCES planejar_projetos(id) ON DELETE CASCADE,
    tipo VARCHAR(20) NOT NULL CHECK (tipo IN ('FORCA', 'FRAQUEZA', 'OPORTUNIDADE', 'AMEACA')),
    descricao TEXT NOT NULL,
    criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    atualizado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tabela de Cronograma
CREATE TABLE planejar_cronogramas (
    id SERIAL PRIMARY KEY,
    planejar_projeto_id INT NOT NULL REFERENCES planejar_projetos(id) ON DELETE CASCADE,
    atividade VARCHAR(255) NOT NULL,
    responsavel_id INT NOT NULL REFERENCES usuarios(id),
    data_inicial DATE NOT NULL,
    data_final DATE NOT NULL,
    situacao VARCHAR(50) NOT NULL DEFAULT 'Planejada' CHECK (situacao IN ('Planejada', 'Em Progresso', 'Concluída', 'Adiada', 'Cancelada')),
    observacao TEXT,
    ordem INT,
    criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    atualizado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tabela de Equipe de Melhoria
CREATE TABLE planejar_equipes (
    id SERIAL PRIMARY KEY,
    planejar_projeto_id INT NOT NULL REFERENCES planejar_projetos(id) ON DELETE CASCADE,
    nome VARCHAR(150) NOT NULL,
    matricula VARCHAR(50),
    responsabilidades TEXT,
    setor_id INT NOT NULL REFERENCES setores(id),
    usuario_id INT REFERENCES usuarios(id),
    criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    atualizado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tabela de Documentação do Processo
CREATE TABLE planejar_documentacao (
    id SERIAL PRIMARY KEY,
    planejar_projeto_id INT NOT NULL REFERENCES planejar_projetos(id) ON DELETE CASCADE,
    anexo_id INT NOT NULL REFERENCES anexos(id),
    descricao TEXT,
    criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tabela DEIP (Diagrama de Escopo e Interface)
CREATE TABLE planejar_deip (
    id SERIAL PRIMARY KEY,
    planejar_projeto_id INT NOT NULL REFERENCES planejar_projetos(id) ON DELETE CASCADE,
    anexo_id INT NOT NULL REFERENCES anexos(id),
    versao INT DEFAULT 1,
    criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tabela de Plano de Projeto
CREATE TABLE planejar_plano_projeto (
    id SERIAL PRIMARY KEY,
    planejar_projeto_id INT NOT NULL REFERENCES planejar_projetos(id) ON DELETE CASCADE,
    identificacao TEXT,
    objetivo TEXT,
    justificativa TEXT,
    escopo TEXT,
    equipe TEXT,
    cronograma TEXT,
    riscos TEXT,
    entregas_previstas TEXT,
    responsaveis TEXT,
    observacoes TEXT,
    anexo_id INT REFERENCES anexos(id),
    rascunho BOOLEAN DEFAULT TRUE,
    criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    atualizado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tabela de Checklist de Aprovação
CREATE TABLE planejar_checklists (
    id SERIAL PRIMARY KEY,
    planejar_projeto_id INT NOT NULL REFERENCES planejar_projetos(id) ON DELETE CASCADE,
    item_numero INT NOT NULL,
    descricao TEXT NOT NULL,
    concluido BOOLEAN DEFAULT FALSE,
    observacao TEXT,
    validado_por INT REFERENCES usuarios(id),
    data_validacao TIMESTAMP,
    criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tabela de Ata de Validação
CREATE TABLE planejar_ata_validacao (
    id SERIAL PRIMARY KEY,
    planejar_projeto_id INT NOT NULL REFERENCES planejar_projetos(id) ON DELETE CASCADE,
    anexo_id INT NOT NULL REFERENCES anexos(id),
    versao INT DEFAULT 1,
    criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tabela de Histórico da Fase Planejar
CREATE TABLE planejar_historico (
    id SERIAL PRIMARY KEY,
    planejar_projeto_id INT NOT NULL REFERENCES planejar_projetos(id) ON DELETE CASCADE,
    status_anterior VARCHAR(50),
    status_novo VARCHAR(50),
    mudado_por INT NOT NULL REFERENCES usuarios(id),
    comentario TEXT,
    valores_antigos JSONB,
    valores_novos JSONB,
    data_mudanca TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Índices para performance
CREATE INDEX idx_planejar_projetos_processo ON planejar_projetos(processo_id);
CREATE INDEX idx_planejar_projetos_setor ON planejar_projetos(setor_id);
CREATE INDEX idx_planejar_projetos_status ON planejar_projetos(status);
CREATE INDEX idx_planejar_swot_projeto ON planejar_swot(planejar_projeto_id);
CREATE INDEX idx_planejar_cronogramas_projeto ON planejar_cronogramas(planejar_projeto_id);
CREATE INDEX idx_planejar_equipes_projeto ON planejar_equipes(planejar_projeto_id);
CREATE INDEX idx_planejar_documentacao_projeto ON planejar_documentacao(planejar_projeto_id);
CREATE INDEX idx_planejar_deip_projeto ON planejar_deip(planejar_projeto_id);
CREATE INDEX idx_planejar_plano_projeto_projeto ON planejar_plano_projeto(planejar_projeto_id);
CREATE INDEX idx_planejar_checklists_projeto ON planejar_checklists(planejar_projeto_id);
CREATE INDEX idx_planejar_ata_validacao_projeto ON planejar_ata_validacao(planejar_projeto_id);
CREATE INDEX idx_planejar_historico_projeto ON planejar_historico(planejar_projeto_id);

-- Triggers para atualizar timestamp
CREATE TRIGGER trigger_planejar_projetos_timestamp BEFORE UPDATE ON planejar_projetos
    FOR EACH ROW EXECUTE FUNCTION atualizar_timestamp();

CREATE TRIGGER trigger_planejar_swot_timestamp BEFORE UPDATE ON planejar_swot
    FOR EACH ROW EXECUTE FUNCTION atualizar_timestamp();

CREATE TRIGGER trigger_planejar_cronogramas_timestamp BEFORE UPDATE ON planejar_cronogramas
    FOR EACH ROW EXECUTE FUNCTION atualizar_timestamp();

CREATE TRIGGER trigger_planejar_equipes_timestamp BEFORE UPDATE ON planejar_equipes
    FOR EACH ROW EXECUTE FUNCTION atualizar_timestamp();

CREATE TRIGGER trigger_planejar_plano_projeto_timestamp BEFORE UPDATE ON planejar_plano_projeto
    FOR EACH ROW EXECUTE FUNCTION atualizar_timestamp();

-- ============================================================================
-- Fim da Migration 0003
