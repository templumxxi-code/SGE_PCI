-- ============================================================================
-- SMP PCI - Schema PostgreSQL
-- Polícia Científica do Rio Grande do Norte
-- ============================================================================

-- Tabela de Setores/Núcleos
CREATE TABLE setores (
    id SERIAL PRIMARY KEY,
    nome VARCHAR(100) NOT NULL UNIQUE,
    descricao TEXT,
    criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tabela de Usuários
CREATE TABLE usuarios (
    id SERIAL PRIMARY KEY,
    nome VARCHAR(150) NOT NULL,
    email VARCHAR(150) UNIQUE NOT NULL,
    senha_hash VARCHAR(256) NOT NULL,
    perfil VARCHAR(50) NOT NULL CHECK (perfil IN ('NGE', 'SETOR')),
    setor_id INT REFERENCES setores(id),
    ativo BOOLEAN DEFAULT TRUE,
    ultimo_acesso TIMESTAMP,
    ultimo_logout_em TIMESTAMP,
    criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    atualizado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tabela de Macroprocessos
CREATE TABLE macroprocessos (
    id SERIAL PRIMARY KEY,
    nome VARCHAR(150) NOT NULL UNIQUE,
    descricao TEXT,
    criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tabela de Processos
CREATE TABLE processos (
    id SERIAL PRIMARY KEY,
    nome VARCHAR(150) NOT NULL,
    setor_id INT NOT NULL REFERENCES setores(id),
    macroprocesso_id INT NOT NULL REFERENCES macroprocessos(id),
    status_fase VARCHAR(50) DEFAULT 'Planejar' CHECK (status_fase IN ('Planejar', 'Analisar', 'Redesenhar', 'Implementar', 'Monitorar', 'Avaliar')),
    percentual_conclusao NUMERIC(5,2) DEFAULT 0,
    data_inicio TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    data_fim TIMESTAMP,
    responsavel_id INT REFERENCES usuarios(id),
    observacoes TEXT,
    ativo BOOLEAN DEFAULT TRUE,
    excluido_em TIMESTAMP,
    excluido_por INT REFERENCES usuarios(id),
    criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    atualizado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tabela de Subprocessos
CREATE TABLE subprocessos (
    id SERIAL PRIMARY KEY,
    processo_id INT NOT NULL REFERENCES processos(id) ON DELETE CASCADE,
    nome VARCHAR(150) NOT NULL,
    descricao TEXT,
    status_fase VARCHAR(50) DEFAULT 'Planejar' CHECK (status_fase IN ('Planejar', 'Analisar', 'Redesenhar', 'Implementar', 'Monitorar', 'Avaliar')),
    ordem INT,
    criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tabela de Atividades
CREATE TABLE atividades (
    id SERIAL PRIMARY KEY,
    subprocesso_id INT NOT NULL REFERENCES subprocessos(id) ON DELETE CASCADE,
    nome VARCHAR(150) NOT NULL,
    descricao TEXT,
    status VARCHAR(50) DEFAULT 'Pendente' CHECK (status IN ('Pendente', 'Em Andamento', 'Concluída', 'Bloqueada')),
    responsavel_id INT REFERENCES usuarios(id),
    data_inicio TIMESTAMP,
    data_vencimento TIMESTAMP,
    ordem INT,
    criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tabela de Tarefas
CREATE TABLE tarefas (
    id SERIAL PRIMARY KEY,
    atividade_id INT NOT NULL REFERENCES atividades(id) ON DELETE CASCADE,
    nome VARCHAR(150) NOT NULL,
    descricao TEXT,
    status VARCHAR(50) DEFAULT 'Pendente' CHECK (status IN ('Pendente', 'Em Andamento', 'Concluída', 'Bloqueada')),
    responsavel_id INT REFERENCES usuarios(id),
    conclusao BOOLEAN DEFAULT FALSE,
    observacoes TEXT,
    percentual_conclusao NUMERIC(5,2) DEFAULT 0,
    data_criacao TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    data_inicio TIMESTAMP,
    data_vencimento TIMESTAMP,
    data_conclusao TIMESTAMP
);

-- Tabela de Indicadores (KPIs)
CREATE TABLE indicadores (
    id SERIAL PRIMARY KEY,
    processo_id INT NOT NULL REFERENCES processos(id) ON DELETE CASCADE,
    nome VARCHAR(150) NOT NULL,
    descricao TEXT,
    valor_meta NUMERIC(10,2),
    valor_atual NUMERIC(10,2) DEFAULT 0,
    valor_anterior NUMERIC(10,2),
    unidade_medida VARCHAR(50),
    tipo_indicador VARCHAR(50) CHECK (tipo_indicador IN ('Eficiência', 'Eficácia', 'Conformidade', 'Qualidade')),
    periodicidade VARCHAR(50) CHECK (periodicidade IN ('Diária', 'Semanal', 'Mensal', 'Trimestral', 'Anual')),
    atualizado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tabela de Anexos
CREATE TABLE anexos (
    id SERIAL PRIMARY KEY,
    processo_id INT REFERENCES processos(id) ON DELETE CASCADE,
    atividade_id INT REFERENCES atividades(id) ON DELETE CASCADE,
    tipo VARCHAR(50) NOT NULL CHECK (tipo IN ('POP', 'PAP', 'BPMN', 'Outro')),
    nome_arquivo VARCHAR(255) NOT NULL,
    nome_armazenado TEXT NOT NULL,
    caminho_arquivo TEXT NOT NULL,
    hash_sha256 VARCHAR(64) NOT NULL,
    tamanho_bytes INT,
    mime_type VARCHAR(100),
    enviado_por INT NOT NULL REFERENCES usuarios(id),
    descricao TEXT,
    data_envio TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    excluido_em TIMESTAMP,
    excluido_por INT REFERENCES usuarios(id)
);

-- Tabela de Logs de Ações (Auditoria)
CREATE TABLE logs (
    id SERIAL PRIMARY KEY,
    usuario_id INT NOT NULL REFERENCES usuarios(id),
    acao VARCHAR(200) NOT NULL,
    tabela_afetada VARCHAR(100),
    id_registro INT,
    valores_antigos JSONB,
    valores_novos JSONB,
    endereco_ip VARCHAR(50),
    user_agent TEXT,
    data_acao TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tabela de Unidades Organizacionais
CREATE TABLE organizational_units (
    id SERIAL PRIMARY KEY,
    nome VARCHAR(150) NOT NULL,
    sigla VARCHAR(50) NOT NULL UNIQUE,
    tipo VARCHAR(50) NOT NULL CHECK (tipo IN ('DIRETORIA', 'NUCLEO', 'SETOR', 'ASSESSORIA', 'REGIONAL')),
    unidade_superior_id INT REFERENCES organizational_units(id),
    setor_legado_id INT UNIQUE REFERENCES setores(id),
    ativo BOOLEAN DEFAULT TRUE,
    criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    atualizado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_organizational_units_unidade_superior ON organizational_units(unidade_superior_id);
CREATE INDEX idx_organizational_units_tipo ON organizational_units(tipo);
CREATE INDEX idx_organizational_units_ativo ON organizational_units(ativo);

-- Tabela de Alertas
CREATE TABLE alertas (
    id SERIAL PRIMARY KEY,
    tipo VARCHAR(100) NOT NULL CHECK (tipo IN ('Atraso', 'Não Conformidade', 'Meta Não Atingida', 'Tarefa Vencida')),
    processo_id INT REFERENCES processos(id) ON DELETE CASCADE,
    atividade_id INT REFERENCES atividades(id) ON DELETE CASCADE,
    tarefa_id INT REFERENCES tarefas(id) ON DELETE CASCADE,
    descricao TEXT,
    severidade VARCHAR(20) CHECK (severidade IN ('Baixa', 'Média', 'Alta', 'Crítica')),
    lido BOOLEAN DEFAULT FALSE,
    data_criacao TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    data_resolucao TIMESTAMP
);

-- Tabela de Histórico de Processos
CREATE TABLE historico_processos (
    id SERIAL PRIMARY KEY,
    processo_id INT NOT NULL REFERENCES processos(id) ON DELETE CASCADE,
    status_anterior VARCHAR(50),
    status_novo VARCHAR(50),
    mudado_por INT REFERENCES usuarios(id),
    comentario TEXT,
    data_mudanca TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Índices para melhor performance
CREATE INDEX idx_usuario_email ON usuarios(email);
CREATE INDEX idx_usuario_setor ON usuarios(setor_id);
CREATE INDEX idx_processo_setor ON processos(setor_id);
CREATE INDEX idx_processo_macroprocesso ON processos(macroprocesso_id);
CREATE INDEX idx_processo_status ON processos(status_fase);
CREATE INDEX idx_subprocesso_processo ON subprocessos(processo_id);
CREATE INDEX idx_atividade_subprocesso ON atividades(subprocesso_id);
CREATE INDEX idx_atividade_status ON atividades(status);
CREATE INDEX idx_tarefa_atividade ON tarefas(atividade_id);
CREATE INDEX idx_tarefa_status ON tarefas(status);
CREATE INDEX idx_indicador_processo ON indicadores(processo_id);
CREATE INDEX idx_anexo_processo ON anexos(processo_id);
CREATE INDEX idx_log_usuario ON logs(usuario_id);
CREATE INDEX idx_log_data ON logs(data_acao);
CREATE INDEX idx_alerta_processo ON alertas(processo_id);
CREATE INDEX idx_alerta_lido ON alertas(lido);

-- ============================================================================
-- Dados Iniciais
-- ============================================================================

-- Inserir setores padrão
INSERT INTO setores (nome, descricao) VALUES
('Núcleo de Genética', 'Responsável por análises de DNA e genética forense'),
('Núcleo de Química', 'Análises químicas e toxicológicas'),
('Núcleo de Documentoscopia', 'Análise de documentos e assinaturas'),
('Núcleo de Balística', 'Análises de armas de fogo e munições'),
('Núcleo de Fotografia', 'Documentação fotográfica e visual de cenas de crime'),
('Coordenação Geral (NGE)', 'Núcleo de Gestão Estratégica');

-- Inserir macroprocessos padrão
INSERT INTO macroprocessos (nome, descricao) VALUES
('Análise Forense', 'Macroprocesso de análise e investigação forense'),
('Gestão de Qualidade', 'Macroprocesso de asseguração e gestão de qualidade'),
('Gestão de Recursos', 'Macroprocesso de gestão de recursos humanos e materiais'),
('Monitoramento e Controle', 'Macroprocesso de monitoramento e controle de processos'),
('Pesquisa e Desenvolvimento', 'Macroprocesso de pesquisa e desenvolvimento de metodologias');

-- ============================================================================
-- Função para atualizar timestamp de modificação
-- ============================================================================

CREATE OR REPLACE FUNCTION atualizar_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.atualizado_em = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers para atualizar timestamp
CREATE TRIGGER trigger_usuarios_timestamp BEFORE UPDATE ON usuarios
    FOR EACH ROW EXECUTE FUNCTION atualizar_timestamp();

CREATE TRIGGER trigger_processos_timestamp BEFORE UPDATE ON processos
    FOR EACH ROW EXECUTE FUNCTION atualizar_timestamp();

CREATE TRIGGER trigger_indicadores_timestamp BEFORE UPDATE ON indicadores
    FOR EACH ROW EXECUTE FUNCTION atualizar_timestamp();

CREATE TRIGGER trigger_organizational_units_timestamp BEFORE UPDATE ON organizational_units
    FOR EACH ROW EXECUTE FUNCTION atualizar_timestamp();

-- ============================================================================
-- Fim do Schema
-- ============================================================================
