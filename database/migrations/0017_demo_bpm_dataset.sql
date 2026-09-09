-- Espelho demonstrativo na estrutura BPM canonica consumida pela interface.

INSERT INTO organizational_units_v2 (nome, tipo)
SELECT 'Unidade Demonstrativa', 'SETOR'
WHERE NOT EXISTS (
    SELECT 1 FROM organizational_units_v2 WHERE nome = 'Unidade Demonstrativa'
);

INSERT INTO processes (
    name, description, organizational_unit_id, created_by,
    responsible_user_id, status, current_phase, progress_percent
)
SELECT v.name, v.description, ou.id, u.id, u.id, v.status, v.current_phase, v.progress
FROM (VALUES
    ('Pericia de documentos oficiais', 'Processo demonstrativo de analise documental', 'ACTIVE', 'Analisar', 35::numeric),
    ('Atendimento a solicitacoes externas', 'Processo demonstrativo de atendimento', 'ACTIVE', 'Implementar', 70::numeric),
    ('Inventario de equipamentos', 'Processo demonstrativo de monitoramento', 'COMPLETED', 'Monitorar', 90::numeric)
) AS v(name, description, status, current_phase, progress)
JOIN organizational_units_v2 ou ON ou.nome = 'Unidade Demonstrativa'
JOIN users u ON u.email = 'demo.setor@pci.rn.gov.br'
WHERE NOT EXISTS (
    SELECT 1 FROM processes p WHERE p.name = v.name
);

INSERT INTO process_phases (
    process_id, phase_name, order_number, phase_code, phase_order,
    status, progress_percent
)
SELECT p.id, phase.phase_name, phase.order_number, UPPER(phase.phase_name),
       phase.order_number, CASE
           WHEN phase.order_number < 3 THEN 'CONCLUIDA'
           ELSE 'PENDENTE'
       END, CASE
           WHEN phase.order_number < 3 THEN 100
           ELSE p.progress_percent
       END
FROM processes p
CROSS JOIN (VALUES
    ('Planejar', 1),
    ('Analisar', 2),
    ('Desenhar', 3),
    ('Implementar', 4),
    ('Monitorar', 5)
) AS phase(phase_name, order_number)
WHERE p.name IN (
    'Pericia de documentos oficiais',
    'Atendimento a solicitacoes externas',
    'Inventario de equipamentos'
)
  AND NOT EXISTS (
      SELECT 1 FROM process_phases existing
      WHERE existing.process_id = p.id
        AND existing.phase_name = phase.phase_name
  );

INSERT INTO process_activities (
    phase_id, activity_code, title, description, status, progress
)
SELECT ph.id, 'DEMO-' || ph.phase_code,
       'Atividade demonstrativa - ' || ph.phase_name,
       'Atividade criada para demonstracao do ciclo BPM',
       CASE WHEN ph.status = 'CONCLUIDA' THEN 'COMPLETED' ELSE 'PENDING' END,
       ph.progress_percent
FROM process_phases ph
JOIN processes p ON p.id = ph.process_id
WHERE p.name IN (
    'Pericia de documentos oficiais',
    'Atendimento a solicitacoes externas',
    'Inventario de equipamentos'
)
  AND NOT EXISTS (
      SELECT 1 FROM process_activities existing
      WHERE existing.phase_id = ph.id
        AND existing.activity_code = 'DEMO-' || ph.phase_code
  );

INSERT INTO process_indicators (
    process_id, name, description, target, current_value, unit, status
)
SELECT p.id, v.name, 'Indicador demonstrativo do processo',
       v.target, v.current_value, v.unit,
       CASE WHEN v.current_value >= v.target THEN 'META_ATINGIDA' ELSE 'ATENCAO' END
FROM (VALUES
    ('Prazo medio de atendimento', 10::numeric, 7::numeric, 'dias'),
    ('Conformidade documental', 95::numeric, 88::numeric, '%'),
    ('Satisfacao dos usuarios', 90::numeric, 84::numeric, '%')
) AS v(name, target, current_value, unit)
JOIN processes p ON p.name = CASE v.name
    WHEN 'Prazo medio de atendimento' THEN 'Atendimento a solicitacoes externas'
    WHEN 'Conformidade documental' THEN 'Pericia de documentos oficiais'
    ELSE 'Inventario de equipamentos'
END
WHERE NOT EXISTS (
    SELECT 1 FROM process_indicators existing
    WHERE existing.process_id = p.id AND existing.name = v.name
);
