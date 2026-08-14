// ============================================================================
// Planejar Controller - Fase de Planejamento BPM
// Polícia Científica do Rio Grande do Norte
// ============================================================================

const { queryOne, queryMany, query } = require('../models/db');
const { isGlobalAdmin } = require('../services/roles');

const createError = (message, statusCode = 400, name = 'ValidationError') => {
    const error = new Error(message);
    error.statusCode = statusCode;
    error.name = name;
    return error;
};

const getUsuarioSetorId = async (usuarioId) => {
    const usuario = await queryOne('SELECT setor_id FROM usuarios WHERE id = $1', [usuarioId]);
    return usuario ? usuario.setor_id : null;
};

const validarAcessoProcesso = async (processoId, usuario) => {
    const processo = await queryOne(
        'SELECT id, setor_id FROM processos WHERE id = $1',
        [processoId]
    );

    if (!processo) {
        throw createError('Processo não encontrado', 404);
    }

    if (!isGlobalAdmin(usuario.perfil)) {
        const setorUsuario = usuario.setor_id || await getUsuarioSetorId(usuario.id);
        if (!setorUsuario || processo.setor_id !== setorUsuario) {
            throw createError('Acesso não autorizado ao processo', 403);
        }
    }

    return processo;
};

const getOrCreatePlanejar = async (processoId, usuario) => {
    let existing = await queryOne('SELECT * FROM planejar WHERE processo_id = $1', [processoId]);
    if (existing) {
        return existing;
    }

    const created = await queryOne(
        `INSERT INTO planejar (processo_id, responsavel_id) VALUES ($1, $2) RETURNING *`,
        [processoId, usuario.id]
    );

    return created;
};

const normalizePlanejarRow = (row) => {
    if (!row) return null;
    try {
        return {
            id: row.id,
            processo_id: row.processo_id,
            objetivo: row.objetivo || '',
            swot: typeof row.swot === 'string' ? JSON.parse(row.swot) : (row.swot || []),
            cronograma: typeof row.cronograma === 'string' ? JSON.parse(row.cronograma) : (row.cronograma || []),
            equipe: typeof row.equipe === 'string' ? JSON.parse(row.equipe) : (row.equipe || []),
            plano_projeto: typeof row.plano_projeto === 'string' ? JSON.parse(row.plano_projeto) : (row.plano_projeto || {}),
            checklist: typeof row.checklist === 'string' ? JSON.parse(row.checklist) : (row.checklist || []),
            aprovacao_checklist: typeof row.aprovacao_checklist === 'string' ? JSON.parse(row.aprovacao_checklist) : (row.aprovacao_checklist || []),
            status: row.status,
            responsavel_id: row.responsavel_id,
            devolucao_justificativa: row.devolucao_justificativa,
            aprovado_por: row.aprovado_por,
            aprovado_em: row.aprovado_em,
            criado_em: row.criado_em,
            atualizado_em: row.atualizado_em
        };
    } catch (e) {
        console.error('Erro ao normalizar planejar:', e);
        return row;
    }
};

// ============================================================================
// CRUD Projeto de Planejamento
// ============================================================================

const criarProjetoPlanejamento = async (processoId, dados, usuarioId, perfilUsuario) => {
    await validarAcessoProcesso(processoId, { id: usuarioId, perfil: perfilUsuario });
    
    const planejar = await getOrCreatePlanejar(processoId, { id: usuarioId, perfil: perfilUsuario });
    return normalizePlanejarRow(planejar);
};

const getPlanejar = async (processoId, usuario) => {
    await validarAcessoProcesso(processoId, usuario);
    const planejar = await getOrCreatePlanejar(processoId, usuario);
    return normalizePlanejarRow(planejar);
};

const updatePlanejar = async (processoId, body, usuario) => {
    await validarAcessoProcesso(processoId, usuario);
    
    const planejar = await getOrCreatePlanejar(processoId, usuario);
    if (planejar.status === 'APROVADA') {
        throw createError('Alterações não são permitidas após aprovação', 403);
    }

    const setFields = [];
    const params = [];
    let paramCount = 1;

    if (body.objetivo !== undefined) {
        setFields.push(`objetivo = $${paramCount}`);
        params.push(String(body.objetivo).trim() || null);
        paramCount++;
    }

    if (body.swot !== undefined) {
        setFields.push(`swot = $${paramCount}`);
        params.push(typeof body.swot === 'string' ? body.swot : JSON.stringify(body.swot));
        paramCount++;
    }

    if (body.cronograma !== undefined) {
        setFields.push(`cronograma = $${paramCount}`);
        params.push(typeof body.cronograma === 'string' ? body.cronograma : JSON.stringify(body.cronograma));
        paramCount++;
    }

    if (body.equipe !== undefined) {
        setFields.push(`equipe = $${paramCount}`);
        params.push(typeof body.equipe === 'string' ? body.equipe : JSON.stringify(body.equipe));
        paramCount++;
    }

    if (body.plano_projeto !== undefined) {
        setFields.push(`plano_projeto = $${paramCount}`);
        params.push(typeof body.plano_projeto === 'string' ? body.plano_projeto : JSON.stringify(body.plano_projeto));
        paramCount++;
    }

    if (body.checklist !== undefined) {
        setFields.push(`checklist = $${paramCount}`);
        params.push(typeof body.checklist === 'string' ? body.checklist : JSON.stringify(body.checklist));
        paramCount++;
    }

    if (setFields.length === 0) {
        return normalizePlanejarRow(planejar);
    }

    setFields.push(`status = CASE WHEN status = 'NÃO_INICIADA' THEN 'EM_PREENCHIMENTO' ELSE status END`);
    setFields.push(`atualizado_em = CURRENT_TIMESTAMP`);

    params.push(processoId);

    const updated = await queryOne(
        `UPDATE planejar SET ${setFields.join(', ')} WHERE processo_id = $${paramCount} RETURNING *`,
        params
    );

    // Registrar na auditoria
    await query(
        `INSERT INTO logs (usuario_id, acao, tabela_afetada, id_registro, valores_novos)
         VALUES ($1, 'Atualizar Planejar', 'planejar', $2, $3)`,
        [usuario.id, updated.id, JSON.stringify(normalizePlanejarRow(updated))]
    );

    return normalizePlanejarRow(updated);
};

// ============================================================================
// SWOT Operations
// ============================================================================

const adicionarSwot = async (processoId, dados, usuarioId, perfilUsuario) => {
    const usuario = { id: usuarioId, perfil: perfilUsuario };
    await validarAcessoProcesso(processoId, usuario);

    const planejar = await getOrCreatePlanejar(processoId, usuario);
    
    if (!dados.tipo || !['FORCA', 'FRAQUEZA', 'OPORTUNIDADE', 'AMEACA'].includes(dados.tipo)) {
        throw createError('Tipo SWOT inválido');
    }

    if (!dados.descricao || dados.descricao.trim().length === 0) {
        throw createError('Descrição é obrigatória');
    }

    const swotAtual = typeof planejar.swot === 'string' ? JSON.parse(planejar.swot) : planejar.swot || [];
    const novoSwot = [
        ...swotAtual,
        {
            id: Math.max(0, ...swotAtual.map(s => s.id || 0)) + 1,
            tipo: dados.tipo,
            descricao: dados.descricao,
            criado_em: new Date().toISOString()
        }
    ];

    const updated = await queryOne(
        `UPDATE planejar SET swot = $1, atualizado_em = CURRENT_TIMESTAMP WHERE processo_id = $2 RETURNING *`,
        [JSON.stringify(novoSwot), processoId]
    );

    return normalizePlanejarRow(updated);
};

const obterSwot = async (processoId, usuarioId, perfilUsuario) => {
    const usuario = { id: usuarioId, perfil: perfilUsuario };
    const planejar = await getPlanejar(processoId, usuario);
    return planejar.swot || [];
};

const removerSwot = async (processoId, swotId, usuarioId, perfilUsuario) => {
    const usuario = { id: usuarioId, perfil: perfilUsuario };
    const planejar = await getPlanejar(processoId, usuario);

    const swotAtual = typeof planejar.swot === 'string' ? JSON.parse(planejar.swot) : planejar.swot || [];
    const novoSwot = swotAtual.filter(s => s.id !== swotId);

    const updated = await queryOne(
        `UPDATE planejar SET swot = $1, atualizado_em = CURRENT_TIMESTAMP WHERE processo_id = $2 RETURNING *`,
        [JSON.stringify(novoSwot), processoId]
    );

    return normalizePlanejarRow(updated);
};

// ============================================================================
// Cronograma Operations
// ============================================================================

const adicionarCronograma = async (processoId, dados, usuarioId, perfilUsuario) => {
    const usuario = { id: usuarioId, perfil: perfilUsuario };
    await validarAcessoProcesso(processoId, usuario);

    if (!dados.atividade || dados.atividade.trim().length === 0) {
        throw createError('Atividade é obrigatória');
    }

    if (!dados.data_inicial || !dados.data_final) {
        throw createError('Datas inicial e final são obrigatórias');
    }

    const planejar = await getOrCreatePlanejar(processoId, usuario);
    const cronogramaAtual = typeof planejar.cronograma === 'string' ? JSON.parse(planejar.cronograma) : planejar.cronograma || [];
    
    const novoCronograma = [
        ...cronogramaAtual,
        {
            id: Math.max(0, ...cronogramaAtual.map(c => c.id || 0)) + 1,
            atividade: dados.atividade,
            responsavel: dados.responsavel,
            data_inicial: dados.data_inicial,
            data_final: dados.data_final,
            situacao: dados.situacao || 'Planejada',
            observacao: dados.observacao,
            criado_em: new Date().toISOString()
        }
    ];

    const updated = await queryOne(
        `UPDATE planejar SET cronograma = $1, atualizado_em = CURRENT_TIMESTAMP WHERE processo_id = $2 RETURNING *`,
        [JSON.stringify(novoCronograma), processoId]
    );

    return normalizePlanejarRow(updated);
};

const obterCronogramas = async (processoId, usuarioId, perfilUsuario) => {
    const usuario = { id: usuarioId, perfil: perfilUsuario };
    const planejar = await getPlanejar(processoId, usuario);
    return planejar.cronograma || [];
};

const atualizarCronograma = async (processoId, cronogramaId, dados, usuarioId, perfilUsuario) => {
    const usuario = { id: usuarioId, perfil: perfilUsuario };
    const planejar = await getPlanejar(processoId, usuario);

    const cronogramaAtual = typeof planejar.cronograma === 'string' ? JSON.parse(planejar.cronograma) : planejar.cronograma || [];
    const novoCronograma = cronogramaAtual.map(c => c.id === cronogramaId ? { ...c, ...dados, atualizado_em: new Date().toISOString() } : c);

    const updated = await queryOne(
        `UPDATE planejar SET cronograma = $1, atualizado_em = CURRENT_TIMESTAMP WHERE processo_id = $2 RETURNING *`,
        [JSON.stringify(novoCronograma), processoId]
    );

    return normalizePlanejarRow(updated);
};

const removerCronograma = async (processoId, cronogramaId, usuarioId, perfilUsuario) => {
    const usuario = { id: usuarioId, perfil: perfilUsuario };
    const planejar = await getPlanejar(processoId, usuario);

    const cronogramaAtual = typeof planejar.cronograma === 'string' ? JSON.parse(planejar.cronograma) : planejar.cronograma || [];
    const novoCronograma = cronogramaAtual.filter(c => c.id !== cronogramaId);

    const updated = await queryOne(
        `UPDATE planejar SET cronograma = $1, atualizado_em = CURRENT_TIMESTAMP WHERE processo_id = $2 RETURNING *`,
        [JSON.stringify(novoCronograma), processoId]
    );

    return normalizePlanejarRow(updated);
};

// ============================================================================
// Equipe Operations
// ============================================================================

const adicionarEquipeMembro = async (processoId, dados, usuarioId, perfilUsuario) => {
    const usuario = { id: usuarioId, perfil: perfilUsuario };
    await validarAcessoProcesso(processoId, usuario);

    if (!dados.nome || dados.nome.trim().length === 0) {
        throw createError('Nome é obrigatório');
    }

    const planejar = await getOrCreatePlanejar(processoId, usuario);
    const equipeAtual = typeof planejar.equipe === 'string' ? JSON.parse(planejar.equipe) : planejar.equipe || [];
    
    const novaEquipe = [
        ...equipeAtual,
        {
            id: Math.max(0, ...equipeAtual.map(e => e.id || 0)) + 1,
            nome: dados.nome,
            matricula: dados.matricula,
            responsabilidades: dados.responsabilidades,
            setor: dados.setor,
            criado_em: new Date().toISOString()
        }
    ];

    const updated = await queryOne(
        `UPDATE planejar SET equipe = $1, atualizado_em = CURRENT_TIMESTAMP WHERE processo_id = $2 RETURNING *`,
        [JSON.stringify(novaEquipe), processoId]
    );

    return normalizePlanejarRow(updated);
};

const obterEquipe = async (processoId, usuarioId, perfilUsuario) => {
    const usuario = { id: usuarioId, perfil: perfilUsuario };
    const planejar = await getPlanejar(processoId, usuario);
    return planejar.equipe || [];
};

const atualizarEquipeMembro = async (processoId, membroId, dados, usuarioId, perfilUsuario) => {
    const usuario = { id: usuarioId, perfil: perfilUsuario };
    const planejar = await getPlanejar(processoId, usuario);

    const equipeAtual = typeof planejar.equipe === 'string' ? JSON.parse(planejar.equipe) : planejar.equipe || [];
    const novaEquipe = equipeAtual.map(e => e.id === membroId ? { ...e, ...dados, atualizado_em: new Date().toISOString() } : e);

    const updated = await queryOne(
        `UPDATE planejar SET equipe = $1, atualizado_em = CURRENT_TIMESTAMP WHERE processo_id = $2 RETURNING *`,
        [JSON.stringify(novaEquipe), processoId]
    );

    return normalizePlanejarRow(updated);
};

const removerEquipeMembro = async (processoId, membroId, usuarioId, perfilUsuario) => {
    const usuario = { id: usuarioId, perfil: perfilUsuario };
    const planejar = await getPlanejar(processoId, usuario);

    const equipeAtual = typeof planejar.equipe === 'string' ? JSON.parse(planejar.equipe) : planejar.equipe || [];
    const novaEquipe = equipeAtual.filter(e => e.id !== membroId);

    const updated = await queryOne(
        `UPDATE planejar SET equipe = $1, atualizado_em = CURRENT_TIMESTAMP WHERE processo_id = $2 RETURNING *`,
        [JSON.stringify(novaEquipe), processoId]
    );

    return normalizePlanejarRow(updated);
};

// ============================================================================
// Plano de Projeto Operations
// ============================================================================

const salvarPlanoProjetoDraft = async (processoId, dados, usuarioId, perfilUsuario) => {
    const usuario = { id: usuarioId, perfil: perfilUsuario };
    await validarAcessoProcesso(processoId, usuario);

    const planejar = await getOrCreatePlanejar(processoId, usuario);

    const planoProjetoAtual = typeof planejar.plano_projeto === 'string' ? JSON.parse(planejar.plano_projeto) : planejar.plano_projeto || {};
    const novoPlano = {
        ...planoProjetoAtual,
        ...dados,
        rascunho: true,
        atualizado_em: new Date().toISOString()
    };

    const updated = await queryOne(
        `UPDATE planejar SET plano_projeto = $1, atualizado_em = CURRENT_TIMESTAMP WHERE processo_id = $2 RETURNING *`,
        [JSON.stringify(novoPlano), processoId]
    );

    return normalizePlanejarRow(updated);
};

const obterPlanoProjeto = async (processoId, usuarioId, perfilUsuario) => {
    const usuario = { id: usuarioId, perfil: perfilUsuario };
    const planejar = await getPlanejar(processoId, usuario);
    return planejar.plano_projeto || {};
};

// ============================================================================
// Approval Operations
// ============================================================================

const obterChecklist = async (processoId, usuarioId, perfilUsuario) => {
    const usuario = { id: usuarioId, perfil: perfilUsuario };
    const planejar = await getPlanejar(processoId, usuario);
    return planejar.checklist || [];
};

const atualizarChecklistItem = async (processoId, checklistIndex, dados, usuarioId, perfilUsuario) => {
    const usuario = { id: usuarioId, perfil: perfilUsuario };
    const planejar = await getPlanejar(processoId, usuario);

    const checklistAtual = typeof planejar.checklist === 'string' ? JSON.parse(planejar.checklist) : planejar.checklist || [];
    const novoChecklist = [...checklistAtual];
    
    if (novoChecklist[checklistIndex]) {
        novoChecklist[checklistIndex] = { ...novoChecklist[checklistIndex], ...dados };
    }

    const updated = await queryOne(
        `UPDATE planejar SET checklist = $1, atualizado_em = CURRENT_TIMESTAMP WHERE processo_id = $2 RETURNING *`,
        [JSON.stringify(novoChecklist), processoId]
    );

    return normalizePlanejarRow(updated);
};

const submitPlanejar = async (processoId, body, usuario) => {
    await validarAcessoProcesso(processoId, usuario);

    const planejar = await getOrCreatePlanejar(processoId, usuario);
    if (planejar.status === 'APROVADA') {
        throw createError('Já aprovado. Não é possível enviar para validação novamente.', 403);
    }

    // Validações de campos obrigatórios antes de enviar para validação
    const objetivo = String(planejar.objetivo || '').trim();
    const swot = Array.isArray(planejar.swot) ? planejar.swot : (typeof planejar.swot === 'string' ? JSON.parse(planejar.swot || '[]') : []);
    const cronograma = Array.isArray(planejar.cronograma) ? planejar.cronograma : (typeof planejar.cronograma === 'string' ? JSON.parse(planejar.cronograma || '[]') : []);
    const equipe = Array.isArray(planejar.equipe) ? planejar.equipe : (typeof planejar.equipe === 'string' ? JSON.parse(planejar.equipe || '[]') : []);
    const plano = planejar.plano_projeto || (typeof planejar.plano_projeto === 'string' ? JSON.parse(planejar.plano_projeto || '{}') : {});

    if (!objetivo) {
        throw createError('Objetivo do Projeto de Melhoria é obrigatório.', 400);
    }

    if (!swot || swot.length === 0) {
        throw createError('A análise SWOT deve conter pelo menos um item.', 400);
    }

    if (!cronograma || cronograma.length === 0) {
        throw createError('O cronograma deve conter pelo menos uma etapa.', 400);
    }

    if (!equipe || equipe.length === 0) {
        throw createError('A equipe de melhoria deve conter pelo menos um participante.', 400);
    }

    if (!plano || !String(plano.objetivo || '').trim()) {
        throw createError('O Plano de Projeto (Anexo II) deve conter objetivo.', 400);
    }

    const updated = await queryOne(
        `UPDATE planejar SET status = 'AGUARDANDO_VALIDACAO', atualizado_em = CURRENT_TIMESTAMP WHERE processo_id = $1 RETURNING *`,
        [processoId]
    );

    // Registrar na auditoria
    await query(
        `INSERT INTO logs (usuario_id, acao, tabela_afetada, id_registro)
         VALUES ($1, 'Enviar para Validacao', 'planejar', $2)`,
        [usuario.id, updated.id]
    );

    return normalizePlanejarRow(updated);
};

const approvePlanejar = async (processoId, usuario) => {
    await validarAcessoProcesso(processoId, usuario);

    const planejar = await getOrCreatePlanejar(processoId, usuario);
    if (planejar.status !== 'AGUARDANDO_VALIDACAO') {
        throw createError('O plano deve estar aguardando validação para ser aprovado.', 400);
    }

    const updated = await queryOne(
        `UPDATE planejar SET status = 'APROVADA', aprovado_por = $1, aprovado_em = CURRENT_TIMESTAMP, atualizado_em = CURRENT_TIMESTAMP WHERE processo_id = $2 RETURNING *`,
        [usuario.id, processoId]
    );

    // Registrar na auditoria
    await query(
        `INSERT INTO logs (usuario_id, acao, tabela_afetada, id_registro)
         VALUES ($1, 'Aprovar Planejar', 'planejar', $2)`,
        [usuario.id, updated.id]
    );

    return normalizePlanejarRow(updated);
};

const rejectPlanejar = async (processoId, body, usuario) => {
    await validarAcessoProcesso(processoId, usuario);

    const justificativa = String(body.justificativa || '').trim();
    if (!justificativa) {
        throw createError('Justificativa é obrigatória para devolução.', 400);
    }

    const planejar = await getOrCreatePlanejar(processoId, usuario);
    if (planejar.status !== 'AGUARDANDO_VALIDACAO') {
        throw createError('O plano deve estar aguardando validação para ser devolvido.', 400);
    }

    const updated = await queryOne(
        `UPDATE planejar SET status = 'DEVOLVIDA_PARA_CORRECAO', devolucao_justificativa = $1, atualizado_em = CURRENT_TIMESTAMP WHERE processo_id = $2 RETURNING *`,
        [justificativa, processoId]
    );

    // Registrar na auditoria
    await query(
        `INSERT INTO logs (usuario_id, acao, tabela_afetada, id_registro)
         VALUES ($1, 'Devolver para Correcao', 'planejar', $2)`,
        [usuario.id, updated.id]
    );

    return normalizePlanejarRow(updated);
};

const obterHistoricoProjeto = async (processoId, usuarioId, perfilUsuario) => {
    const usuario = { id: usuarioId, perfil: perfilUsuario };
    await validarAcessoProcesso(processoId, usuario);

    const historico = await queryMany(
        `SELECT * FROM logs WHERE tabela_afetada = 'planejar' AND id_registro IN (SELECT id FROM planejar WHERE processo_id = $1) ORDER BY data_acao DESC LIMIT 50`,
        [processoId]
    );

    return historico || [];
};

module.exports = {
    criarProjetoPlanejamento,
    getPlanejar,
    updatePlanejar,
    adicionarSwot,
    obterSwot,
    removerSwot,
    adicionarCronograma,
    obterCronogramas,
    atualizarCronograma,
    removerCronograma,
    adicionarEquipeMembro,
    obterEquipe,
    atualizarEquipeMembro,
    removerEquipeMembro,
    salvarPlanoProjetoDraft,
    obterPlanoProjeto,
    obterChecklist,
    atualizarChecklistItem,
    submitPlanejar,
    approvePlanejar,
    rejectPlanejar,
    obterHistoricoProjeto
};
