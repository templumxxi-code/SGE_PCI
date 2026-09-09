-- Completa o catalogo BPM legado para cada processo demonstrativo.

INSERT INTO process_activities (
    phase_id, activity_code, codigo, title, titulo, description, descricao, status, progress
)
SELECT ph.id, v.code, v.code, v.title, v.title, v.title, v.title,
       CASE WHEN ph.status = 'CONCLUIDA' THEN 'COMPLETED' ELSE 'PENDING' END,
       CASE WHEN ph.status = 'CONCLUIDA' THEN 100 ELSE ph.progress_percent END
FROM process_phases ph
JOIN processes p ON p.id = ph.process_id
JOIN (VALUES
    ('PLANEJAR', 'PLAN_A', 'A) Definir equipe de melhoria'),
    ('PLANEJAR', 'PLAN_B', 'B) Estabelecer objetivo do Projeto de Melhoria'),
    ('PLANEJAR', 'PLAN_C', 'C) Solicitar documentação existente do processo'),
    ('PLANEJAR', 'PLAN_D', 'D) Diagrama de Escopo e Interface - DEIP'),
    ('PLANEJAR', 'PLAN_E', 'E) Elaborar Plano de Projeto com todas as informações adquiridas'),
    ('PLANEJAR', 'PLAN_G', 'G) Aprovar Plano do Projeto de Melhoria'),
    ('ANALISAR', 'ANAL_A', 'a) Analisar documentação do processo'),
    ('ANALISAR', 'ANAL_B', 'b) Desenhar fluxo AS IS do processo'),
    ('ANALISAR', 'ANAL_C', 'c) Levantar desconexões e oportunidades de melhoria'),
    ('ANALISAR', 'ANAL_D', 'd) Priorizar desconexões e analisar melhorias'),
    ('ANALISAR', 'ANAL_E', 'e) Levantar indicadores atuais dos processos'),
    ('DESENHAR', 'DES_A', 'a) Redefinir escopo do processo'),
    ('DESENHAR', 'DES_B', 'b) Modelagem do processo otimizado: fluxo TO BE'),
    ('DESENHAR', 'DES_C', 'c) Identificar tarefas críticas do fluxo'),
    ('DESENHAR', 'DES_D', 'd) Levantar riscos das tarefas críticas'),
    ('DESENHAR', 'DES_E', 'e) Definir indicadores do processo'),
    ('DESENHAR', 'DES_F', 'f) Elaborar documentação descritiva do processo'),
    ('DESENHAR', 'DES_G', 'g) Elaborar plano de implementação'),
    ('IMPLEMENTAR', 'IMPL_A', 'a) Acompanhar execução das ações'),
    ('IMPLEMENTAR', 'IMPL_B', 'b) Acompanhar implantação dos indicadores'),
    ('MONITORAR', 'MON_A', 'a) Acompanhar gestão do dia a dia do processo'),
    ('MONITORAR', 'MON_B', 'b) Acompanhar resultados dos indicadores'),
    ('MONITORAR', 'MON_C', 'c) Identificar oportunidades de melhorias'),
    ('MONITORAR', 'MON_D', 'd) Repassar informações às instâncias de governança')
) AS v(phase_code, code, title)
    ON v.phase_code = ph.phase_code
WHERE p.name IN (
    'Pericia de documentos oficiais',
    'Atendimento a solicitacoes externas',
    'Inventario de equipamentos'
)
  AND NOT EXISTS (
      SELECT 1
      FROM process_activities existing
      WHERE existing.phase_id = ph.id
        AND existing.activity_code = v.code
  );

INSERT INTO activity_checklists (activity_id, description, required, completed)
SELECT a.id, 'Registrar evidencias da atividade', TRUE, FALSE
FROM process_activities a
WHERE a.activity_code IN (
    'PLAN_A', 'PLAN_B', 'PLAN_C', 'PLAN_D', 'PLAN_E', 'PLAN_G',
    'ANAL_A', 'ANAL_B', 'ANAL_C', 'ANAL_D', 'ANAL_E',
    'DES_A', 'DES_B', 'DES_C', 'DES_D', 'DES_E', 'DES_F', 'DES_G',
    'IMPL_A', 'IMPL_B', 'MON_A', 'MON_B', 'MON_C', 'MON_D'
)
  AND NOT EXISTS (
      SELECT 1 FROM activity_checklists c
      WHERE c.activity_id = a.id
  );
