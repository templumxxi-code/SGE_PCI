-- Sprint 5: procedimento de verificação dos processos sem fase.
-- A correção dos registros identificados foi executada pela API autenticada,
-- conforme PROCESS_ORPHANS_AUDIT.md. Este SQL não deve ser usado para inserir
-- fases manualmente ou mascarar a trilha de auditoria.

BEGIN;

SELECT COUNT(*) AS orphan_processes_before
FROM processes p
LEFT JOIN process_phases ph ON ph.process_id = p.id
WHERE ph.id IS NULL;

-- Correção controlada: executar POST /api/bpm/processes/:processId/phases
-- para cada registro aprovado no relatório de auditoria.

SELECT COUNT(*) AS orphan_processes_after
FROM processes p
LEFT JOIN process_phases ph ON ph.process_id = p.id
WHERE ph.id IS NULL;

COMMIT;
