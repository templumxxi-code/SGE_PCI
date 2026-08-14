// ============================================================================
// Process Controller
// ============================================================================

const { queryOne, queryMany, query, beginTransaction, commit, rollback } = require('../models/db');
const { isGlobalAdmin } = require('../services/roles');
const { addSectorScopeFilter } = require('../services/access');

const createAccessError = (message, statusCode = 403) => {
    const error = new Error(message);
    error.statusCode = statusCode;
    return error;
};

const getUsuarioSetorId = async (usuarioId) => {
    const usuario = await queryOne('SELECT setor_id FROM usuarios WHERE id = $1', [usuarioId]);
    return usuario ? usuario.setor_id : null;
};

/**
 * Criar, idempotentemente, o subprocesso 'Planejar' e suas atividades fixas para um processo
 * Será executado dentro de uma transação (client)
 */
const fixedPlanejarActivities = [
    { code: 'PLAN_A', descricao: 'A) Estabelecer objetivo do Projeto de Melhoria', ordem: 1 },
    { code: 'PLAN_B', descricao: 'B) Definir equipe de melhoria', ordem: 2 },
    { code: 'PLAN_C', descricao: 'C) Solicitar documentação existente do processo', ordem: 3 },
    { code: 'PLAN_D', descricao: 'D) Diagrama de Escopo e Interface (DEIP)', ordem: 4 },
    { code: 'PLAN_E', descricao: 'E) Elaborar Plano de Projeto', ordem: 5 },
    { code: 'PLAN_G', descricao: 'G) Aprovar Plano do Projeto de Melhoria', ordem: 6 }
];

const ensurePlanejarCreated = async (client, processoId, usuarioId) => {
    const existing = await client.query('SELECT id FROM subprocessos WHERE processo_id = $1 AND nome = $2 LIMIT 1', [processoId, 'Planejar']);
    if (existing.rowCount > 0) {
        const subprocessoId = existing.rows[0].id;
        await syncPlanejarActivities(client, subprocessoId, usuarioId);
        return subprocessoId;
    }

    const res = await client.query(
        `INSERT INTO subprocessos (processo_id, nome, descricao, status_fase, ordem, criado_em)
         VALUES ($1, $2, $3, $4, $5, CURRENT_TIMESTAMP)
         RETURNING id`,
        [processoId, 'Planejar', 'Fase Planejar automatizada', 'Planejar', 1]
    );
    const subprocessoId = res.rows[0].id;

    await syncPlanejarActivities(client, subprocessoId, usuarioId);
    await client.query('INSERT INTO logs (usuario_id, acao, tabela_afetada, id_registro) VALUES ($1, $2, $3, $4)', [usuarioId, 'Subprocesso Planejar criado', 'subprocessos', subprocessoId]);
    return subprocessoId;
};

const syncPlanejarActivities = async (client, subprocessoId, usuarioId) => {
    const fixedCodes = fixedPlanejarActivities.map((activity) => activity.code);
    const existingRows = await client.query(
        `SELECT id, nome, descricao, ordem
         FROM atividades
         WHERE subprocesso_id = $1`,
        [subprocessoId]
    );

    const existingByCode = new Map();
    const duplicateRowsByCode = new Map();

    for (const row of existingRows.rows) {
        if (fixedCodes.includes(row.nome)) {
            if (existingByCode.has(row.nome)) {
                if (!duplicateRowsByCode.has(row.nome)) {
                    duplicateRowsByCode.set(row.nome, []);
                }
                duplicateRowsByCode.get(row.nome).push(row);
            } else {
                existingByCode.set(row.nome, row);
            }
        } else {
            await client.query('DELETE FROM atividades WHERE id = $1', [row.id]);
            await client.query('INSERT INTO logs (usuario_id, acao, tabela_afetada, id_registro) VALUES ($1, $2, $3, $4)', [usuarioId, 'Atividade Planejar antiga removida', 'atividades', row.id]);
        }
    }

    for (const [code, duplicates] of duplicateRowsByCode.entries()) {
        const kept = existingByCode.get(code);
        if (!kept) {
            continue;
        }
        for (const duplicate of duplicates) {
            await client.query('UPDATE anexos SET atividade_id = $1 WHERE atividade_id = $2', [kept.id, duplicate.id]);
            await client.query('UPDATE tarefas SET atividade_id = $1 WHERE atividade_id = $2', [kept.id, duplicate.id]);
            await client.query('DELETE FROM atividades WHERE id = $1', [duplicate.id]);
            await client.query('INSERT INTO logs (usuario_id, acao, tabela_afetada, id_registro) VALUES ($1, $2, $3, $4)', [usuarioId, 'Atividade duplicada removida', 'atividades', duplicate.id]);
        }
    }

    for (const activity of fixedPlanejarActivities) {
        const existing = existingByCode.get(activity.code);
        if (existing) {
            if (existing.descricao !== activity.descricao || existing.ordem !== activity.ordem) {
                await client.query(
                    `UPDATE atividades
                     SET descricao = $1,
                         ordem = $2,
                         responsavel_id = COALESCE(responsavel_id, $3)
                     WHERE id = $4`,
                    [activity.descricao, activity.ordem, usuarioId, existing.id]
                );
                await client.query('INSERT INTO logs (usuario_id, acao, tabela_afetada, id_registro) VALUES ($1, $2, $3, $4)', [usuarioId, 'Atividade Planejar atualizada', 'atividades', existing.id]);
            }
            continue;
        }

        const insertAct = await client.query(
            `INSERT INTO atividades (subprocesso_id, nome, descricao, status, responsavel_id, data_inicio, ordem, criado_em)
             VALUES ($1, $2, $3, $4, $5, CURRENT_TIMESTAMP, $6, CURRENT_TIMESTAMP)
             RETURNING id`,
            [subprocessoId, activity.code, activity.descricao, 'Pendente', usuarioId, activity.ordem]
        );

        const atividadeId = insertAct.rows[0].id;
        await client.query('INSERT INTO logs (usuario_id, acao, tabela_afetada, id_registro) VALUES ($1, $2, $3, $4)', [usuarioId, 'Atividade PLAN criada', 'atividades', atividadeId]);
    }
};

const validarAcessoProcesso = async (processoId, usuarioId, perfilUsuario) => {
    const processo = await queryOne(
        `SELECT p.id, p.setor_id, p.nome, p.ativo FROM processos p WHERE p.id = $1`,
        [processoId]
    );

    if (!processo) {
        throw createAccessError('Processo não encontrado', 404);
    }

    if (processo.ativo === false) {
        throw createAccessError('Processo não encontrado', 404);
    }

    if (!isGlobalAdmin(perfilUsuario)) {
        const setorUsuario = await getUsuarioSetorId(usuarioId);
        if (!setorUsuario || processo.setor_id !== setorUsuario) {
            throw createAccessError('Acesso não autorizado ao processo');
        }
    }

    return processo;
};

/**
 * Listar processos (com filtros)
 * @param {object} filtros - { setor_id, macroprocesso_id, status_fase, page, limit }
 * @param {number} usuarioId
 * @param {string} perfilUsuario
 * @returns {Promise}
 */
const listarProcessos = async (filtros, usuarioId, perfilUsuario) => {
    try {
        let query_text = `
            SELECT p.id, p.nome, p.setor_id, s.nome as setor_nome,
                   p.macroprocesso_id, m.nome as macroprocesso_nome,
                   p.status_fase, p.percentual_conclusao,
                   p.data_inicio, p.data_fim, p.responsavel_id,
                   u.nome as responsavel_nome, p.observacoes,
                   p.criado_em, p.atualizado_em
            FROM processos p
            LEFT JOIN setores s ON p.setor_id = s.id
            LEFT JOIN macroprocessos m ON p.macroprocesso_id = m.id
            LEFT JOIN usuarios u ON p.responsavel_id = u.id
            WHERE COALESCE(p.ativo, true) = true
        `;
        const params = [];
        let paramCount = 1;

        const requestedSetorId = filtros.setor_id || null;
        const applied = addSectorScopeFilter(query_text, params, { perfil: perfilUsuario, setor_id: await getUsuarioSetorId(usuarioId) }, requestedSetorId, paramCount, 'p');
        query_text = applied.queryText;
        params.splice(0, params.length, ...applied.params);
        paramCount = applied.paramCount;

        if (filtros.macroprocesso_id) {
            query_text += ` AND p.macroprocesso_id = $${paramCount}`;
            params.push(filtros.macroprocesso_id);
            paramCount++;
        }

        if (filtros.status_fase) {
            query_text += ` AND p.status_fase = $${paramCount}`;
            params.push(filtros.status_fase);
            paramCount++;
        }

        query_text += ' ORDER BY p.atualizado_em DESC';

        // Paginação
        const limit = filtros.limit || 20;
        const offset = ((filtros.page || 1) - 1) * limit;

        query_text += ` LIMIT $${paramCount} OFFSET $${paramCount + 1}`;
        params.push(limit, offset);

        let processos = await queryMany(query_text, params);

        // Para compatibilidade, garantir criação idempotente da fase Planejar
        // e recuperar as atividades da fase Planejar para cada processo retornado.
        for (const p of processos) {
            try {
                // criar Planejar quando ausente
                const client = await beginTransaction();
                try {
                    await ensurePlanejarCreated(client, p.id, usuarioId);
                    await commit(client);
                } catch (e) {
                    if (client) await rollback(client);
                }
            } catch (e) {
                // ignore connectivity issues for individual processes
            }

            // Obter atividades da fase Planejar
            try {
                const atividades = await queryMany(
                    `SELECT a.id, a.nome as codigo, a.descricao, a.ordem, a.responsavel_id, u.nome as responsavel_nome,
                            COALESCE((SELECT json_agg(json_build_object('id', an.id, 'filename', an.nome_arquivo, 'criado_em', an.data_envio))
                                      FROM anexos an WHERE an.atividade_id = a.id AND an.excluido_em IS NULL), '[]'::json) as attachments
                     FROM subprocessos sp
                     JOIN atividades a ON a.subprocesso_id = sp.id
                     LEFT JOIN usuarios u ON a.responsavel_id = u.id
                     WHERE sp.processo_id = $1 AND sp.nome = $2
                     ORDER BY a.ordem`,
                    [p.id, 'Planejar']
                );
                // map to frontend shape
                p.atividades = (atividades || []).map(a => ({
                    id: a.id,
                    fase: 'Planejar',
                    codigo: a.codigo,
                    descricao: a.descricao,
                    responsavel_id: a.responsavel_id,
                    responsavel_nome: a.responsavel_nome,
                    attachments: a.attachments || []
                }));
            } catch (e) {
                p.atividades = [];
            }
        }

        return processos;
    } catch (error) {
        throw error;
    }
};

/**
 * Obter detalhes de um processo
 * @param {number} processoId
 * @returns {Promise}
 */
const obterProcesso = async (processoId, usuarioId, perfilUsuario) => {
    try {
        await validarAcessoProcesso(processoId, usuarioId, perfilUsuario);

        // Ensure Planejar subprocesso and activities exist for legacy processes
        let client;
        try {
            client = await beginTransaction();
            try {
                await ensurePlanejarCreated(client, processoId, usuarioId);
            } catch (e) {
                // log and continue
                console.warn('ensurePlanejarCreated failed on obterProcesso:', e.message);
            }
            await commit(client);
        } catch (e) {
            if (client) await rollback(client);
        }

        const processo = await queryOne(
            `SELECT p.id, p.nome, p.setor_id, s.nome as setor_nome,
                    p.macroprocesso_id, m.nome as macroprocesso_nome,
                    p.status_fase, p.percentual_conclusao,
                    p.data_inicio, p.data_fim, p.responsavel_id,
                    u.nome as responsavel_nome, p.observacoes,
                    p.criado_em, p.atualizado_em
             FROM processos p
             LEFT JOIN setores s ON p.setor_id = s.id
             LEFT JOIN macroprocessos m ON p.macroprocesso_id = m.id
             LEFT JOIN usuarios u ON p.responsavel_id = u.id
             WHERE p.id = $1`,
            [processoId]
        );

        // Também anexar atividades da fase Planejar ao retorno
        try {
            const atividades = await queryMany(
                `SELECT a.id, a.nome as codigo, a.descricao, a.ordem, a.responsavel_id, u.nome as responsavel_nome,
                        COALESCE((SELECT json_agg(json_build_object('id', an.id, 'filename', an.nome_arquivo, 'criado_em', an.data_envio))
                                  FROM anexos an WHERE an.atividade_id = a.id AND an.excluido_em IS NULL), '[]'::json) as attachments
                 FROM subprocessos sp
                 JOIN atividades a ON a.subprocesso_id = sp.id
                 LEFT JOIN usuarios u ON a.responsavel_id = u.id
                 WHERE sp.processo_id = $1 AND sp.nome = $2
                 ORDER BY a.ordem`,
                [processoId, 'Planejar']
            );

            processo.atividades = (atividades || []).map(a => ({
                id: a.id,
                fase: 'Planejar',
                codigo: a.codigo,
                descricao: a.descricao,
                responsavel_id: a.responsavel_id,
                responsavel_nome: a.responsavel_nome,
                attachments: a.attachments || []
            }));
        } catch (e) {
            processo.atividades = processo.atividades || [];
        }

        return processo;
    } catch (error) {
        if (error.statusCode) {
            throw error;
        }
        throw error;
    }
};

/**
 * Criar novo processo
 * @param {object} processoData
 * @param {number} usuarioId
 * @returns {Promise}
 */
const criarProcesso = async (processoData, usuarioId, perfilUsuario) => {
    const client = await beginTransaction();
    try {
        const { nome, setor_id, macroprocesso_id, responsavel_id, observacoes } = processoData;

        const usuarioSetorId = await getUsuarioSetorId(usuarioId);
        const setorId = isGlobalAdmin(perfilUsuario) ? setor_id : usuarioSetorId;

        if (!nome || !setorId || !macroprocesso_id) {
            throw new Error('Campos obrigatórios não preenchidos');
        }

        // Inserir processo
        const processo = await client.query(
            `INSERT INTO processos (nome, setor_id, macroprocesso_id, responsavel_id, observacoes)
             VALUES ($1, $2, $3, $4, $5)
             RETURNING id`,
            [nome, setorId, macroprocesso_id, responsavel_id || usuarioId, observacoes]
        );

        const processoId = processo.rows[0].id;
        const createdProcess = {
            id: processoId,
            nome,
            setor_id: setorId,
            macroprocesso_id,
            responsavel_id: responsavel_id || usuarioId,
            observacoes
        };

        // Registrar log
        await client.query(
            'INSERT INTO logs (usuario_id, acao, tabela_afetada, id_registro) VALUES ($1, $2, $3, $4)',
            [usuarioId, 'Processo criado', 'processos', processoId]
        );

        // Garantir criação idempotente da fase Planejar e atividades fixas
        try {
            await ensurePlanejarCreated(client, processoId, usuarioId);
        } catch (e) {
            console.warn('Falha ao criar fase Planejar automaticamente:', e.message);
            // não abortar a criação do processo por falha secundária na criação da fase Planejar
        }

        await commit(client);
        return {
            id: processoId,
            nome,
            setor_id: setorId,
            macroprocesso_id,
            responsavel_id: responsavel_id || usuarioId,
            observacoes
        };
    } catch (error) {
        await rollback(client);
        throw error;
    }
};

/**
 * Atualizar processo
 * @param {number} processoId
 * @param {object} dadosAtualizacao
 * @param {number} usuarioId
 * @returns {Promise}
 */
const atualizarProcesso = async (processoId, dadosAtualizacao, usuarioId, perfilUsuario) => {
    try {
        const { nome, status_fase, percentual_conclusao, responsavel_id, observacoes, setor_id } = dadosAtualizacao;

        const processoAntigo = await queryOne('SELECT * FROM processos WHERE id = $1', [processoId]);

        if (!processoAntigo) {
            throw createAccessError('Processo não encontrado', 404);
        }

        const usuarioSetorId = await getUsuarioSetorId(usuarioId);
        if (!isGlobalAdmin(perfilUsuario) && processoAntigo.setor_id !== usuarioSetorId) {
            throw createAccessError('Acesso não autorizado ao processo');
        }

        if (!isGlobalAdmin(perfilUsuario) && setor_id && setor_id !== processoAntigo.setor_id) {
            throw createAccessError('Acesso não autorizado ao setor do processo');
        }

        const setorId = isGlobalAdmin(perfilUsuario) ? setor_id || processoAntigo.setor_id : processoAntigo.setor_id;

        // Atualizar
        const processoAtualizado = await queryOne(
            `UPDATE processos
             SET nome = COALESCE($1, nome),
                 status_fase = COALESCE($2, status_fase),
                 percentual_conclusao = COALESCE($3, percentual_conclusao),
                 responsavel_id = COALESCE($4, responsavel_id),
                 observacoes = COALESCE($5, observacoes),
                 setor_id = $6,
                 atualizado_em = CURRENT_TIMESTAMP
             WHERE id = $7
             RETURNING *`,
            [nome || null, status_fase || null, percentual_conclusao || null, responsavel_id || null, observacoes || null, setorId, processoId]
        );

        // Registrar no histórico
        if (status_fase && status_fase !== processoAntigo.status_fase) {
            await query(
                `INSERT INTO historico_processos (processo_id, status_anterior, status_novo, mudado_por)
                 VALUES ($1, $2, $3, $4)`,
                [processoId, processoAntigo.status_fase, status_fase, usuarioId]
            );
        }

        // Registrar log
        await query(
            'INSERT INTO logs (usuario_id, acao, tabela_afetada, id_registro) VALUES ($1, $2, $3, $4)',
            [usuarioId, 'Processo atualizado', 'processos', processoId]
        );

        return processoAtualizado;
    } catch (error) {
        throw error;
    }
};

/**
 * Deletar processo
 * @param {number} processoId
 * @param {number} usuarioId
 * @returns {Promise}
 */
const deletarProcesso = async (processoId, usuarioId, perfilUsuario, motivo = null) => {
    const client = await beginTransaction();
    try {
        const processo = await client.query('SELECT id, setor_id, criado_em FROM processos WHERE id = $1 FOR UPDATE', [processoId]);
        if (processo.rowCount === 0) {
            throw createAccessError('Processo não encontrado', 404);
        }

        const proc = processo.rows[0];

        // Permissões: NGE pode remover, SETOR apenas se for do mesmo setor
        if (!isGlobalAdmin(perfilUsuario)) {
            const setorUsuario = await getUsuarioSetorId(usuarioId);
            if (!setorUsuario || proc.setor_id !== setorUsuario) {
                throw createAccessError('Acesso não autorizado para remover este processo', 403);
            }
        }

        // Soft delete
        await client.query(
            `UPDATE processos SET ativo = FALSE, excluido_em = CURRENT_TIMESTAMP, excluido_por = $1 WHERE id = $2`,
            [usuarioId, processoId]
        );

        // Registrar auditoria com motivo e estado anterior
        await client.query(
            `INSERT INTO logs (usuario_id, acao, tabela_afetada, id_registro, valores_antigos, valores_novos)
             VALUES ($1, $2, $3, $4, $5, $6)`,
            [usuarioId, 'REMOCAO_PROCESSO', 'processos', processoId, JSON.stringify({ ativo: true }), JSON.stringify({ ativo: false, motivo })]
        );

        await commit(client);
        return { mensagem: 'Processo removido logicamente' };
    } catch (error) {
        await rollback(client);
        throw error;
    }
};

/**
 * Obter estatísticas de processos
 * @param {number} setorId - ID do setor (nulo para NGE)
 * @returns {Promise}
 */
const obterEstatisticas = async (setorId = null, usuarioId = null, perfilUsuario = 'NGE') => {
    try {
        let query_text = 'SELECT status_fase, COUNT(*) as total FROM processos WHERE 1=1';
        const params = [];

        const usuarioSetorId = usuarioId ? await getUsuarioSetorId(usuarioId) : null;
        const setorIdAplicado = isGlobalAdmin(perfilUsuario) ? setorId : usuarioSetorId;

        if (setorIdAplicado) {
            query_text += ' AND setor_id = $1';
            params.push(setorIdAplicado);
        }

        query_text += ' GROUP BY status_fase';

        const estatisticas = await queryMany(query_text, params);
        return estatisticas;
    } catch (error) {
        throw error;
    }
};

module.exports = {
    listarProcessos,
    obterProcesso,
    criarProcesso,
    atualizarProcesso,
    deletarProcesso,
    obterEstatisticas
};
