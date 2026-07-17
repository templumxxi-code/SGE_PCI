// ============================================================================
// Mock Data para modo local sem banco de dados
// ============================================================================

const users = [
    {
        id: 1,
        nome: 'Admin NGE',
        email: 'admin@pci.rn.gov.br',
        senha: 'admin123',
        perfil: 'NGE',
        setor_id: null,
        ativo: true
    },
    {
        id: 2,
        nome: 'Setor Técnico',
        email: 'setor@pci.rn.gov.br',
        senha: 'setor123',
        perfil: 'SETOR',
        setor_id: 2,
        ativo: true
    }
];

const setores = [
    { id: 1, nome: 'Genética', descricao: 'Setor de genética forense' },
    { id: 2, nome: 'Química', descricao: 'Setor de análise química' },
    { id: 3, nome: 'Documentoscopia', descricao: 'Setor de documentos' },
    { id: 4, nome: 'Balística', descricao: 'Setor de balística' },
    { id: 5, nome: 'Fotografia', descricao: 'Setor de fotografia forense' }
];

const macroprocessos = [
    { id: 1, nome: 'Gestão de Casos', descricao: 'Gestão de ocorrências e documentos' },
    { id: 2, nome: 'Perícia Técnica', descricao: 'Análise técnica e laudos' },
    { id: 3, nome: 'Apoio Operacional', descricao: 'Suporte administrativo e logístico' }
];

const processos = [
    {
        id: 1,
        nome: 'Análise de DNA em amostras biológicas',
        setor_id: 1,
        macroprocesso_id: 2,
        status_fase: 'Analisar',
        percentual_conclusao: 68,
        responsavel_id: 2,
        data_inicio: '2026-05-01',
        data_fim: '2026-06-10',
        observacoes: 'Prioridade em casos de homicídio',
        criado_em: '2026-05-01T10:00:00Z'
    },
    {
        id: 2,
        nome: 'Validação de laudos periciais',
        setor_id: 2,
        macroprocesso_id: 2,
        status_fase: 'Planejar',
        percentual_conclusao: 92,
        responsavel_id: 2,
        data_inicio: '2026-04-15',
        data_fim: '2026-06-30',
        observacoes: 'Revisão dos processos internos',
        criado_em: '2026-04-15T08:30:00Z'
    },
    {
        id: 3,
        nome: 'Melhoria de rotinas administrativas',
        setor_id: 5,
        macroprocesso_id: 3,
        status_fase: 'Desenhar',
        percentual_conclusao: 45,
        responsavel_id: 2,
        data_inicio: '2026-05-12',
        data_fim: '2026-07-20',
        observacoes: 'Simplificar fluxos de aprovação',
        criado_em: '2026-05-12T14:20:00Z'
    },
    {
        id: 4,
        nome: 'Implementação de sistema de monitoramento',
        setor_id: 4,
        macroprocesso_id: 3,
        status_fase: 'Implementar',
        percentual_conclusao: 37,
        responsavel_id: 2,
        data_inicio: '2026-05-20',
        data_fim: '2026-08-05',
        observacoes: 'Integrar indicadores no dashboard',
        criado_em: '2026-05-20T09:45:00Z'
    },
    {
        id: 5,
        nome: 'Acompanhamento de prazos de perícias',
        setor_id: 1,
        macroprocesso_id: 1,
        status_fase: 'Monitorar',
        percentual_conclusao: 84,
        responsavel_id: 2,
        data_inicio: '2026-04-01',
        data_fim: '2026-06-20',
        observacoes: 'Alerta para prazos críticos',
        criado_em: '2026-04-01T11:15:00Z'
    }
];

const indicadores = [
    {
        id: 1,
        processo_id: 1,
        nome: 'Tempo de resposta',
        valor_meta: 48,
        valor_atual: 52,
        tipo_indicador: 'Eficiência',
        periodicidade: 'Mensal',
        atualizado_em: '2026-06-01T12:00:00Z'
    },
    {
        id: 2,
        processo_id: 1,
        nome: 'Taxa de conformidade',
        valor_meta: 95,
        valor_atual: 88,
        tipo_indicador: 'Conformidade',
        periodicidade: 'Mensal',
        atualizado_em: '2026-06-01T12:00:00Z'
    },
    {
        id: 3,
        processo_id: 2,
        nome: 'Qualidade dos laudos',
        valor_meta: 90,
        valor_atual: 93,
        tipo_indicador: 'Qualidade',
        periodicidade: 'Trimestral',
        atualizado_em: '2026-06-01T12:00:00Z'
    },
    {
        id: 4,
        processo_id: 3,
        nome: 'Satisfação interna',
        valor_meta: 85,
        valor_atual: 78,
        tipo_indicador: 'Eficácia',
        periodicidade: 'Mensal',
        atualizado_em: '2026-06-01T12:00:00Z'
    },
    {
        id: 5,
        processo_id: 4,
        nome: 'Execução de entregas',
        valor_meta: 100,
        valor_atual: 40,
        tipo_indicador: 'Eficiência',
        periodicidade: 'Mensal',
        atualizado_em: '2026-06-01T12:00:00Z'
    }
];

const alerts = [
    { id: 1, processo_id: 1, tipo: 'Atraso', severidade: 'Alta', lido: false },
    { id: 2, processo_id: 4, tipo: 'Alerta de implementação', severidade: 'Média', lido: false }
];

const logs = [
    {
        id: 1,
        usuario_id: 1,
        acao: 'Login realizado',
        tabela_afetada: 'usuarios',
        id_registro: 1,
        criado_em: '2026-06-07T00:00:00Z'
    }
];

const atividades = [
    // Atividades para processo 1
    { id: 1, processo_id: 1, fase: 'Analisar', descricao: 'Receber amostras e registrar entrada', concluido: true, responsavel_id: 2, criado_em: '2026-05-01T10:30:00Z' },
    { id: 2, processo_id: 1, fase: 'Analisar', descricao: 'Extração de DNA', concluido: false, responsavel_id: 2, criado_em: '2026-05-02T09:20:00Z' },
    { id: 3, processo_id: 1, fase: 'Analisar', descricao: 'Amplificação e análise eletroferograma', concluido: false, responsavel_id: 2, criado_em: '2026-05-05T11:00:00Z' },
    // Atividades para processo 2 (Planejar o Processo)
    { id: 4, processo_id: 2, fase: 'Planejar', descricao: 'Estabelecer objetivo do Projeto de Melhoria', concluido: true, responsavel_id: 1, criado_em: '2026-04-16T08:00:00Z', attachments: [{ id: 1, filename: 'Diagnóstico situacional.pdf', url: null, criado_em: '2026-04-16T08:05:00Z', usuario_id: 1 }], checklist: [{ id: 1, descricao: 'Definir objetivo do projeto de melhoria', concluido: true }, { id: 2, descricao: 'Realizar diagnóstico situacional e análise SWOT', concluido: true }, { id: 3, descricao: 'Registrar escopo inicial e contexto do processo', concluido: true }] },
    { id: 5, processo_id: 2, fase: 'Planejar', descricao: 'Definir equipe de melhoria e responsabilidades (Matriz Raci)', concluido: true, responsavel_id: 1, criado_em: '2026-04-16T10:00:00Z', attachments: [{ id: 2, filename: 'Matriz Raci.xlsx', url: null, criado_em: '2026-04-16T10:05:00Z', usuario_id: 1 }], checklist: [{ id: 4, descricao: 'Identificar participantes do projeto', concluido: true }, { id: 5, descricao: 'Definir papéis e responsabilidades na Matriz RACI', concluido: true }] },
    { id: 6, processo_id: 2, fase: 'Planejar', descricao: 'Solicitar documentação existente do processo via SEI', concluido: true, responsavel_id: 1, criado_em: '2026-04-17T09:00:00Z', attachments: [{ id: 3, filename: 'Documentação_ATUAL_SEI.zip', url: null, criado_em: '2026-04-17T09:10:00Z', usuario_id: 1 }], checklist: [{ id: 6, descricao: 'Solicitar procedimentos operacionais', concluido: true }, { id: 7, descricao: 'Reunir normas institucionais e documentos AS-IS', concluido: true }] },
    { id: 7, processo_id: 2, fase: 'Planejar', descricao: 'Criar Diagrama de Escopo e Interface (DEIP) da situação atual', concluido: false, responsavel_id: 1, criado_em: '2026-04-18T14:00:00Z', attachments: [{ id: 4, filename: 'DEIP_Atual.pdf', url: null, criado_em: '2026-04-18T14:10:00Z', usuario_id: 1 }], checklist: [{ id: 8, descricao: 'Mapear fluxos atuais de processo', concluido: false }, { id: 9, descricao: 'Identificar interfaces entre áreas', concluido: false }] },
    { id: 8, processo_id: 2, fase: 'Planejar', descricao: 'Definir escopo do projeto de melhoria, restrições, premissas e metas', concluido: false, responsavel_id: 1, criado_em: '2026-04-19T11:00:00Z', attachments: [{ id: 5, filename: 'Escopo_Premissas_Metas.docx', url: null, criado_em: '2026-04-19T11:05:00Z', usuario_id: 1 }], checklist: [{ id: 10, descricao: 'Identificar restrições do projeto', concluido: false }, { id: 11, descricao: 'Definir premissas e metas da melhoria', concluido: false }] },
    { id: 9, processo_id: 2, fase: 'Planejar', descricao: 'Elaborar cronograma do projeto', concluido: false, responsavel_id: 1, criado_em: '2026-04-20T09:30:00Z', attachments: [{ id: 6, filename: 'Cronograma_Projeto.xlsx', url: null, criado_em: '2026-04-20T09:35:00Z', usuario_id: 1 }], checklist: [{ id: 12, descricao: 'Definir marcos e entregas', concluido: false }, { id: 13, descricao: 'Alinhar responsáveis e prazos no cronograma', concluido: false }] },
    { id: 10, processo_id: 2, fase: 'Planejar', descricao: 'Elaborar Plano de Projeto com informações adquiridas', concluido: false, responsavel_id: 1, criado_em: '2026-04-21T08:45:00Z', attachments: [{ id: 7, filename: 'Plano_de_Projeto_Melhoria.docx', url: null, criado_em: '2026-04-21T08:50:00Z', usuario_id: 1 }], checklist: [{ id: 14, descricao: 'Consolidar objetivos, equipe e escopo no plano', concluido: false }, { id: 15, descricao: 'Incluir metodologia e etapas de implementação', concluido: false }] },
    { id: 11, processo_id: 2, fase: 'Planejar', descricao: 'Aprovar Plano do Projeto de Melhoria em reunião presencial do NGE', concluido: false, responsavel_id: 1, criado_em: '2026-04-22T10:00:00Z', attachments: [{ id: 8, filename: 'Ata_Aprovação_NGE.pdf', url: null, criado_em: '2026-04-22T10:05:00Z', usuario_id: 1 }], checklist: [{ id: 16, descricao: 'Agendar reunião de aprovação com NGE', concluido: false }, { id: 17, descricao: 'Registrar ata de aprovação', concluido: false }] },
    // Atividades para processo 2 (Analisar - Fase 2)
    { id: 12, processo_id: 2, fase: 'Analisar', descricao: 'Analisar documentação do processo (DEIP, manuais e portarias)', concluido: false, responsavel_id: 1, criado_em: '2026-04-23T08:00:00Z', attachments: [{ id: 9, filename: 'Panorama_Situacional_Processo.pdf', url: null, criado_em: '2026-04-23T08:10:00Z', usuario_id: 1 }], checklist: [{ id: 18, descricao: 'Revisar DEIP, manuais operacionais e portarias institucionais', concluido: false }, { id: 19, descricao: 'Identificar informações críticas do processo', concluido: false }, { id: 20, descricao: 'Documentar panorama situacional do processo', concluido: false }] },
    { id: 13, processo_id: 2, fase: 'Analisar', descricao: 'Desenhar fluxo AS-IS do processo com Bizagi Modeler', concluido: false, responsavel_id: 1, criado_em: '2026-04-24T10:30:00Z', attachments: [{ id: 10, filename: 'Fluxograma_AS-IS_Bizagi.bpmn', url: null, criado_em: '2026-04-24T10:40:00Z', usuario_id: 1 }, { id: 11, filename: 'Fluxograma_AS-IS.pdf', url: null, criado_em: '2026-04-24T10:40:00Z', usuario_id: 1 }], checklist: [{ id: 21, descricao: 'Mapear atividades atuais do processo', concluido: false }, { id: 22, descricao: 'Criar fluxograma detalhado do AS-IS em Bizagi', concluido: false }, { id: 23, descricao: 'Validar fluxo com participantes do processo', concluido: false }] },
    { id: 14, processo_id: 2, fase: 'Analisar', descricao: 'Levantar desconexões e oportunidades de melhoria (Brainstorming)', concluido: false, responsavel_id: 1, criado_em: '2026-04-25T14:00:00Z', attachments: [{ id: 12, filename: 'Relatório_Oportunidades_Melhoria.docx', url: null, criado_em: '2026-04-25T14:10:00Z', usuario_id: 1 }, { id: 13, filename: 'Anexo_IV_Brainstorming.xlsx', url: null, criado_em: '2026-04-25T14:10:00Z', usuario_id: 1 }], checklist: [{ id: 24, descricao: 'Conduzir sessão de brainstorming com equipe', concluido: false }, { id: 25, descricao: 'Identificar gargalos, ineficiências e falhas', concluido: false }, { id: 26, descricao: 'Registrar oportunidades de melhoria encontradas', concluido: false }] },
    { id: 15, processo_id: 2, fase: 'Analisar', descricao: 'Priorizar desconexões e oportunidades de melhoria (Matriz GUT)', concluido: false, responsavel_id: 1, criado_em: '2026-04-26T09:00:00Z', attachments: [{ id: 14, filename: 'Plano_Prioridade_Melhorias.xlsx', url: null, criado_em: '2026-04-26T09:10:00Z', usuario_id: 1 }, { id: 15, filename: 'Matriz_GUT.pdf', url: null, criado_em: '2026-04-26T09:10:00Z', usuario_id: 1 }], checklist: [{ id: 27, descricao: 'Aplicar Matriz GUT nas oportunidades identificadas', concluido: false }, { id: 28, descricao: 'Ranquear melhorias por importância e impacto', concluido: false }, { id: 29, descricao: 'Definir plano de prioridade das ações', concluido: false }] },
    { id: 16, processo_id: 2, fase: 'Analisar', descricao: 'Análise de melhorias, priorização de causas e geração de ideias', concluido: false, responsavel_id: 1, criado_em: '2026-04-27T11:00:00Z', attachments: [{ id: 16, filename: 'Relatório_Análise_Causas_Ideias.docx', url: null, criado_em: '2026-04-27T11:10:00Z', usuario_id: 1 }, { id: 17, filename: 'Causas_Raíz_5Porquês.pdf', url: null, criado_em: '2026-04-27T11:10:00Z', usuario_id: 1 }], checklist: [{ id: 30, descricao: 'Aplicar técnica de análise de causas raiz (5 Porquês)', concluido: false }, { id: 31, descricao: 'Gerar ideias de soluções para cada causa', concluido: false }, { id: 32, descricao: 'Documentar análise e ideias no relatório', concluido: false }] },
    { id: 17, processo_id: 2, fase: 'Analisar', descricao: 'Levantar indicadores atuais dos processos (Ficha de Indicador)', concluido: false, responsavel_id: 1, criado_em: '2026-04-28T13:30:00Z', attachments: [{ id: 18, filename: 'Relatório_Indicadores_Atuais.pdf', url: null, criado_em: '2026-04-28T13:40:00Z', usuario_id: 1 }, { id: 19, filename: 'Anexo_V_Ficha_Indicadores.xlsx', url: null, criado_em: '2026-04-28T13:40:00Z', usuario_id: 1 }], checklist: [{ id: 33, descricao: 'Coletar dados dos indicadores atuais', concluido: false }, { id: 34, descricao: 'Preencher Ficha de Indicador (Anexo V)', concluido: false }, { id: 35, descricao: 'Consolidar relatório de indicadores', concluido: false }] },
    // Atividades para processo 3
    { id: 18, processo_id: 3, fase: 'Desenhar', descricao: 'Mapear etapas manuais existentes', concluido: false, responsavel_id: 2, criado_em: '2026-05-13T14:50:00Z' }
];

const generateId = (items) => Math.max(0, ...items.map(item => item.id)) + 1;

module.exports = {
    users,
    setores,
    macroprocessos,
    processos,
    indicadores,
    alerts,
    atividades,
    logs,
    generateId
};
