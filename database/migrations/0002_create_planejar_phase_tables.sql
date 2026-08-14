-- ============================================================================
-- Migration 0002: Create BPM Planejar phase support
-- ============================================================================

CREATE TABLE planejar (
    id SERIAL PRIMARY KEY,
    processo_id INT NOT NULL REFERENCES processos(id) ON DELETE CASCADE,
    objetivo TEXT,
    swot JSONB DEFAULT '[]',
    cronograma JSONB DEFAULT '[]',
    equipe JSONB DEFAULT '[]',
    checklist JSONB DEFAULT '[]',
    aprovacao_checklist JSONB DEFAULT '[]',
    status VARCHAR(50) NOT NULL DEFAULT 'NÃO_INICIADA' CHECK (status IN ('NÃO_INICIADA', 'EM_PREENCHIMENTO', 'AGUARDANDO_VALIDACAO', 'APROVADA', 'DEVOLVIDA_PARA_CORRECAO')),
    responsavel_id INT REFERENCES usuarios(id),
    devolucao_justificativa TEXT,
    aprovado_por INT REFERENCES usuarios(id),
    aprovado_em TIMESTAMP,
    criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    atualizado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_planejar_processo ON planejar(processo_id);
