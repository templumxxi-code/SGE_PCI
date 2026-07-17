// ============================================================================
// Process Controller
// ============================================================================

const { queryOne, queryMany, query, beginTransaction, commit, rollback } = require('../models/db');

const createAccessError = (message, statusCode = 403) => {
    const error = new Error(message);
    error.statusCode = statusCode;
    return error;
};

const getUsuarioSetorId = async (usuarioId) => {
    const usuario = await queryOne('SELECT setor_id FROM usuarios WHERE id = $1', [usuarioId]);
    return usuario ? usuario.setor_id : null;
};

const validarAcessoProcesso = async (processoId, usuarioId, perfilUsuario) => {
    const processo = await queryOne(
        `SELECT p.id, p.setor_id, p.nome FROM processos p WHERE p.id = $1`,
        [processoId]
    );

    if (!processo) {
        throw createAccessError('Processo não encontrado', 404);
    }

    if (perfilUsuario === 'SETOR') {
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
            WHERE 1=1
        `;
        const params = [];
        let paramCount = 1;

        if (perfilUsuario === 'SETOR') {
            const usuario = await queryOne('SELECT setor_id FROM usuarios WHERE id = $1', [usuarioId]);
            query_text += ` AND p.setor_id = $${paramCount}`;
            params.push(usuario.setor_id);
            paramCount++;
        } else if (filtros.setor_id) {
            query_text += ` AND p.setor_id = $${paramCount}`;
            params.push(filtros.setor_id);
            paramCount++;
        }

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

        const processos = await queryMany(query_text, params);
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

        const setorId = perfilUsuario === 'SETOR' ? await getUsuarioSetorId(usuarioId) : setor_id;

        if (!nome || !setorId || !macroprocesso_id) {
            throw new Error('Campos obrigatórios não preenchidos');
        }

        if (perfilUsuario === 'SETOR' && processoData.setor_id) {
            delete processoData.setor_id;
        }

        // Inserir processo
        const processo = await client.query(
            `INSERT INTO processos (nome, setor_id, macroprocesso_id, responsavel_id, observacoes)
             VALUES ($1, $2, $3, $4, $5)
             RETURNING id`,
            [nome, setorId, macroprocesso_id, responsavel_id || usuarioId, observacoes]
        );

        const processoId = processo.rows[0].id;

        // Registrar log
        await client.query(
            'INSERT INTO logs (usuario_id, acao, tabela_afetada, id_registro) VALUES ($1, $2, $3, $4)',
            [usuarioId, 'Processo criado', 'processos', processoId]
        );

        await commit(client);
        return { id: processoId, ...processoData };
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

        if (perfilUsuario === 'SETOR' && processoAntigo.setor_id !== await getUsuarioSetorId(usuarioId)) {
            throw createAccessError('Acesso não autorizado ao processo');
        }

        const setorId = perfilUsuario === 'SETOR' ? processoAntigo.setor_id : setor_id || processoAntigo.setor_id;

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
const deletarProcesso = async (processoId, usuarioId) => {
    const client = await beginTransaction();
    try {
        await client.query('DELETE FROM processos WHERE id = $1', [processoId]);

        // Registrar log
        await client.query(
            'INSERT INTO logs (usuario_id, acao, tabela_afetada, id_registro) VALUES ($1, $2, $3, $4)',
            [usuarioId, 'Processo deletado', 'processos', processoId]
        );

        await commit(client);
        return { mensagem: 'Processo deletado com sucesso' };
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

        if (perfilUsuario === 'SETOR' && usuarioId) {
            const setorUsuario = await getUsuarioSetorId(usuarioId);
            query_text += ' AND setor_id = $1';
            params.push(setorUsuario);
        } else if (setorId) {
            query_text += ' AND setor_id = $1';
            params.push(setorId);
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
