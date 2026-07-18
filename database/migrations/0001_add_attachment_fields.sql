-- ============================================================================
-- Migration: adicionar campos de anexo para armazenamento seguro e exclusão lógica
-- ============================================================================

ALTER TABLE anexos
    ADD COLUMN IF NOT EXISTS nome_armazenado TEXT NOT NULL DEFAULT '';

ALTER TABLE anexos
    ADD COLUMN IF NOT EXISTS hash_sha256 VARCHAR(64) NOT NULL DEFAULT '';

ALTER TABLE anexos
    ADD COLUMN IF NOT EXISTS excluido_em TIMESTAMP;

ALTER TABLE anexos
    ADD COLUMN IF NOT EXISTS excluido_por INT REFERENCES usuarios(id);
