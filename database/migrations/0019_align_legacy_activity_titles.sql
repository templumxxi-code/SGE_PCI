-- Alinha os dados demonstrativos aos titulos e checklists oficiais do catalogo legado.

UPDATE process_activities a
SET title = v.title,
    titulo = v.title,
    description = v.title,
    descricao = v.title
FROM (VALUES
    ('PLAN_A', 'A) Definir equipe de melhoria'),
    ('PLAN_B', 'B) Estabelecer objetivo do Projeto de Melhoria'),
    ('PLAN_C', 'C) Solicitar documentação existente do processo'),
    ('PLAN_D', 'D) Diagrama de Escopo e Interface — DEIP'),
    ('PLAN_E', 'E) Elaborar Plano de Projeto com todas as informações adquiridas (Referente à etapa E e F do Manual)'),
    ('PLAN_G', 'G) Aprovar Plano do Projeto de Melhoria'),
    ('ANAL_A', 'a) Analisar documentação do processo'),
    ('ANAL_B', 'b) Desenhar fluxo AS IS do processo'),
    ('ANAL_C', 'c) Levantar Desconexões ou oportunidades de melhoria, identificadas no DEIP e fluxo do processo'),
    ('ANAL_D', 'd) Priorizar desconexões ou oportunidades de melhoria e analisar as melhorias, priorização de causas e geração de ideias (ESSA ETAPA É REFERENTE ÀS ETAPAS “D” e “E” DO MANUAL'),
    ('ANAL_E', 'e) Levantar indicadores atuais dos processos.'),
    ('DES_A', 'a) Redefinir escopo do processo'),
    ('DES_B', 'b) Modelagem do processo otimizado: fluxo TO BE'),
    ('DES_C', 'c) Tarefas Críticas do fluxo identificadas'),
    ('DES_D', 'd) Levantamento de riscos das Tarefas Críticas'),
    ('DES_E', 'e) Definir Indicadores do processo'),
    ('DES_F', 'f) Documentação Descritiva do Processo (Guia do Processo)'),
    ('DES_G', 'g) Elaborar plano de implementação (ESSA ETAPA É REFERENTE AS ETAPAS G E H DO MANUAL)'),
    ('IMPL_A', 'a) Acompanhamento da execução das ações por meio das reuniões da sistemática de acompanhamento'),
    ('IMPL_B', 'b) Acompanhamento da implantação dos indicadores do processo e identificação de contramedidas caso o não atingimento das metas escalonadas dos indicadores dos processos'),
    ('MON_A', 'a) Acompanhar a gestão do dia a dia do processo'),
    ('MON_B', 'b) Acompanhar os resultados dos indicadores do processo'),
    ('MON_C', 'c) Identificar oportunidades de melhorias'),
    ('MON_D', 'd) Repassar periodicamente as informações de monitoramento às instâncias de governança de processos estabelecidas no órgão.')
) AS v(code, title)
WHERE a.activity_code = v.code
  AND EXISTS (
      SELECT 1
      FROM process_phases ph
      JOIN processes p ON p.id = ph.process_id
      WHERE ph.id = a.phase_id
        AND p.name IN (
            'Pericia de documentos oficiais',
            'Atendimento a solicitacoes externas',
            'Inventario de equipamentos'
        )
  );

UPDATE activity_checklists c
SET description = v.description
FROM process_activities a
JOIN (VALUES
    ('ANAL_A', 'Atividade concluída'),
    ('ANAL_B', 'Fluxograma AS-IS elaborado'),
    ('ANAL_C', 'Brainstorming conduzido'),
    ('ANAL_D', 'Brainstorming concluído e informações registradas'),
    ('ANAL_E', 'Indicadores atuais levantados'),
    ('DES_A', 'Atividade concluída'),
    ('DES_B', 'Atividade concluída'),
    ('DES_C', 'Tarefas Críticas do fluxo identificadas'),
    ('DES_D', 'Levantamento de riscos das Tarefas Críticas concluído'),
    ('DES_E', 'Indicadores do processo definidos'),
    ('DES_F', 'Documentação Descritiva do Processo concluída'),
    ('DES_G', 'Plano de implementação elaborado'),
    ('IMPL_A', 'Relatório de Acompanhamento anexado'),
    ('IMPL_B', 'Implantação dos indicadores acompanhada'),
    ('MON_A', 'Gestão do dia a dia do processo acompanhada'),
    ('MON_B', 'Resultados dos indicadores acompanhados'),
    ('MON_C', 'Oportunidades de melhoria identificadas'),
    ('MON_D', 'Relatório Situacional inserido')
) AS v(code, description) ON v.code = a.activity_code
WHERE c.activity_id = a.id
  AND EXISTS (
      SELECT 1
      FROM process_phases ph
      JOIN processes p ON p.id = ph.process_id
      WHERE ph.id = a.phase_id
        AND p.name IN (
            'Pericia de documentos oficiais',
            'Atendimento a solicitacoes externas',
            'Inventario de equipamentos'
        )
  );
