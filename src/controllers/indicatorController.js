// ============================================================================
// Indicator Controller
// ============================================================================

const { queryOne, queryMany, query } = require('../models/db');

const createAccessError = (message, statusCode = 403) => {
    const error = new Error(message);
    error.statusCode = statusCode;
    return error;
};

const getUsuarioSetorId = async (usuarioId) => {
    const usuario = await queryOne('SELECT setor_id FROM usuarios WHERE id = $1', [usuarioId]);
    return usuario ? usuario.setor_id : null;
};

const validarAcessoIndicador = async (indicadorId, usuarioId, perfilUsuario) => {
    const indicador = await queryOne('SELECT processo_id FROM indicadores WHERE id = $1', [indicadorId]);
    if (!indicador) {
        throw createAccessError('Indicador não encontrado', 404);
    }

    const processo = await queryOne('SELECT setor_id FROM processos WHERE id = $1', [indicador.processo_id]);
    if (!processo) {
        throw createAccessError('Processo não encontrado', 404);
    }

    if (perfilUsuario === 'SETOR') {
        const setorUsuario = await getUsuarioSetorId(usuarioId);
        if (!setorUsuario || processo.setor_id !== setorUsuario) {
            throw createAccessError('Acesso não autorizado ao indicador');
        }
    }

    return indicador;
};

/**
 * Listar indicadores de um processo
 * @param {number} processoId
 * @returns {Promise}
 */
const listarIndicadores = async (processoId, usuarioId, perfilUsuario) => {
    try {
        const processo = await queryOne('SELECT setor_id FROM processos WHERE id = $1', [processoId]);
        if (!processo) {
            throw createAccessError('Processo não encontrado', 404);
        }

        if (perfilUsuario === 'SETOR') {
            const setorUsuario = await getUsuarioSetorId(usuarioId);
            if (!setorUsuario || processo.setor_id !== setorUsuario) {
                throw createAccessError('Acesso não autorizado ao processo');
            }
        }

        const indicadores = await queryMany(
            `SELECT id, processo_id, nome, descricao, valor_meta, valor_atual, valor_anterior,
                    unidade_medida, tipo_indicador, periodicidade, atualizado_em
             FROM indicadores
             WHERE processo_id = $1
             ORDER BY atualizado_em DESC`,
            [processoId]
        );

        return indicadores;
    } catch (error) {
        if (error.statusCode) {
            throw error;
        }
        throw error;
    }
};

/**
 * Obter detalhes de um indicador
 * @param {number} indicadorId
 * @returns {Promise}
 */
const obterIndicador = async (indicadorId, usuarioId, perfilUsuario) => {
    try {
        await validarAcessoIndicador(indicadorId, usuarioId, perfilUsuario);

        const indicador = await queryOne(
            `SELECT id, processo_id, nome, descricao, valor_meta, valor_atual, valor_anterior,
                    unidade_medida, tipo_indicador, periodicidade, atualizado_em
             FROM indicadores
             WHERE id = $1`,
            [indicadorId]
        );

        return indicador;
    } catch (error) {
        throw error;
    }
};

/**
 * Criar indicador
 * @param {object} indicadorData
 * @param {number} usuarioId
 * @returns {Promise}
 */
const criarIndicador = async (indicadorData, usuarioId, perfilUsuario) => {
    try {
        const { processo_id, nome, descricao, valor_meta, tipo_indicador, periodicidade, unidade_medida } = indicadorData;

        if (!processo_id || !nome || !valor_meta) {
            throw new Error('Campos obrigatórios não preenchidos');
        }

        const processo = await queryOne('SELECT setor_id FROM processos WHERE id = $1', [processo_id]);
        if (!processo) {
            throw new Error('Processo não encontrado');
        }

        if (perfilUsuario === 'SETOR') {
            const setorUsuario = await getUsuarioSetorId(usuarioId);
            if (!setorUsuario || processo.setor_id !== setorUsuario) {
                throw createAccessError('Acesso não autorizado ao processo');
            }
        }

        const indicador = await queryOne(
            `INSERT INTO indicadores (processo_id, nome, descricao, valor_meta, tipo_indicador, periodicidade, unidade_medida, valor_atual)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
             RETURNING *`,
            [processo_id, nome, descricao, valor_meta, tipo_indicador, periodicidade, unidade_medida, 0]
        );

        // Registrar log
        await query(
            'INSERT INTO logs (usuario_id, acao, tabela_afetada, id_registro) VALUES ($1, $2, $3, $4)',
            [usuarioId, 'Indicador criado', 'indicadores', indicador.id]
        );

        return indicador;
    } catch (error) {
        throw error;
    }
};

/**
 * Atualizar valor do indicador
 * @param {number} indicadorId
 * @param {number} novoValor
 * @param {number} usuarioId
 * @returns {Promise}
 */
const atualizarValorIndicador = async (indicadorId, novoValor, usuarioId, perfilUsuario) => {
    try {
        await validarAcessoIndicador(indicadorId, usuarioId, perfilUsuario);

        const indicadorAntigo = await queryOne(
            'SELECT valor_atual FROM indicadores WHERE id = $1',
            [indicadorId]
        );

        const valorAnterior = indicadorAntigo.valor_atual;

        // Atualizar indicador
        const indicadorAtualizado = await queryOne(
            `UPDATE indicadores
             SET valor_anterior = $1,
                 valor_atual = $2,
                 atualizado_em = CURRENT_TIMESTAMP
             WHERE id = $3
             RETURNING *`,
            [valorAnterior, novoValor, indicadorId]
        );

        // Registrar log
        await query(
            'INSERT INTO logs (usuario_id, acao, tabela_afetada, id_registro, valores_antigos, valores_novos) VALUES ($1, $2, $3, $4, $5, $6)',
            [usuarioId, 'Indicador atualizado', 'indicadores', indicadorId, JSON.stringify({ valor: valorAnterior }), JSON.stringify({ valor: novoValor })]
        );

        return indicadorAtualizado;
    } catch (error) {
        throw error;
    }
};

/**
 * Obter indicadores agregados por setor
 * @param {number} setorId
 * @returns {Promise}
 */
const obterIndicadoresSetor = async (setorId, usuarioId, perfilUsuario) => {
    try {
        const setorIdAplicado = perfilUsuario === 'SETOR' ? await getUsuarioSetorId(usuarioId) : setorId;

        const indicadores = await queryMany(
            `SELECT i.*, COUNT(*) OVER (PARTITION BY i.tipo_indicador) as total_tipo
             FROM indicadores i
             INNER JOIN processos p ON i.processo_id = p.id
             WHERE p.setor_id = $1
             ORDER BY i.tipo_indicador, i.nome`,
            [setorIdAplicado]
        );

        return indicadores;
    } catch (error) {
        throw error;
    }
};

/**
 * Calcular percentual de conformidade
 * @param {number} processoId
 * @returns {Promise<number>}
 */
const calcularConformidade = async (processoId) => {
    try {
        const resultado = await queryOne(
            `SELECT COALESCE(AVG(
                CASE 
                    WHEN valor_meta > 0 THEN (valor_atual / valor_meta) * 100
                    ELSE 0
                END
            ), 0) as conformidade
             FROM indicadores
             WHERE processo_id = $1`,
            [processoId]
        );

        return Math.min(resultado.conformidade, 100);
    } catch (error) {
        throw error;
    }
};

module.exports = {
    listarIndicadores,
    obterIndicador,
    criarIndicador,
    atualizarValorIndicador,
    obterIndicadoresSetor,
    calcularConformidade
};
