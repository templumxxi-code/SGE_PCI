-- Migration: criar tabelas para fase Planejar (módulo BPM)

BEGIN;

-- Tabela principal da fase Planejar
CREATE TABLE IF NOT EXISTS planejar_phases (
    id SERIAL PRIMARY KEY,
    processo_id INTEGER NOT NULL UNIQUE REFERENCES processos(id) ON DELETE CASCADE,
    objetivo TEXT,
    status VARCHAR(50) NOT NULL DEFAULT 'NAO_INICIADA',
    responsavel_id INTEGER REFERENCES usuarios(id),
    setor_id INTEGER REFERENCES setores(id),
    deip_anexo_id INTEGER REFERENCES anexos(id), -- Anexo I (DEIP)
    plano_anexo_id INTEGER REFERENCES anexos(id), -- Anexo II (Plano de Projeto)
    aprovado_por INTEGER REFERENCES usuarios(id),
    aprovado_em TIMESTAMP,
    rascunho BOOLEAN DEFAULT TRUE,
    criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    atualizado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- SWOT items
CREATE TABLE IF NOT EXISTS planejar_swot (
    id SERIAL PRIMARY KEY,
    planejar_id INTEGER NOT NULL REFERENCES planejar_phases(id) ON DELETE CASCADE,
    categoria VARCHAR(20) NOT NULL CHECK (categoria IN ('FORCA','FRAQUEZA','OPORTUNIDADE','AMEACA')),
    conteudo TEXT NOT NULL,
    ordem INTEGER DEFAULT 0
);

-- Cronograma (etapas)
CREATE TABLE IF NOT EXISTS planejar_cronograma (
    id SERIAL PRIMARY KEY,
    planejar_id INTEGER NOT NULL REFERENCES planejar_phases(id) ON DELETE CASCADE,
    atividade TEXT NOT NULL,
    responsavel_id INTEGER REFERENCES usuarios(id),
    data_inicio DATE,
    data_fim DATE,
    situacao VARCHAR(50),
    observacao TEXT,
    ordem INTEGER DEFAULT 0
);

-- Participantes / Equipe de Melhoria
CREATE TABLE IF NOT EXISTS planejar_participantes (
    id SERIAL PRIMARY KEY,
    planejar_id INTEGER NOT NULL REFERENCES planejar_phases(id) ON DELETE CASCADE,
    nome VARCHAR(200) NOT NULL,
    matricula VARCHAR(100),
    responsabilidades TEXT,
    setor_id INTEGER REFERENCES setores(id),
    criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Checklist de aprovação
CREATE TABLE IF NOT EXISTS planejar_checklist (
    id SERIAL PRIMARY KEY,
    planejar_id INTEGER NOT NULL REFERENCES planejar_phases(id) ON DELETE CASCADE,
    item TEXT NOT NULL,
    concluido BOOLEAN DEFAULT FALSE,
    observacao TEXT,
    validado_por INTEGER REFERENCES usuarios(id),
    validado_em TIMESTAMP
);

-- Histórico de alterações e auditoria (referência ao usuário que fez a alteração)
CREATE TABLE IF NOT EXISTS planejar_history (
    id SERIAL PRIMARY KEY,
    planejar_id INTEGER NOT NULL REFERENCES planejar_phases(id) ON DELETE CASCADE,
    usuario_id INTEGER REFERENCES usuarios(id),
    acao VARCHAR(100) NOT NULL,
    dados_antigos JSONB,
    dados_novos JSONB,
    criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

COMMIT;
