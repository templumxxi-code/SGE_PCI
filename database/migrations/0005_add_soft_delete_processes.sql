-- Migration: Adiciona soft-delete em processos
ALTER TABLE processos
    ADD COLUMN IF NOT EXISTS ativo BOOLEAN DEFAULT TRUE;

ALTER TABLE processos
    ADD COLUMN IF NOT EXISTS excluido_em TIMESTAMP;

ALTER TABLE processos
    ADD COLUMN IF NOT EXISTS excluido_por INT REFERENCES usuarios(id);

-- Garantir valor padrão para registros existentes
UPDATE processos SET ativo = TRUE WHERE ativo IS NULL;
