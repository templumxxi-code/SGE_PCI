// ============================================================================
// Auth Controller
// ============================================================================

const bcryptjs = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { queryOne, queryMany, query } = require('../models/db');

const createAuthError = (message, statusCode = 401) => {
    const error = new Error(message);
    error.statusCode = statusCode;
    return error;
};

/**
 * Login do usuário
 * @param {string} email
 * @param {string} senha
 * @returns {Promise}
 */
const login = async (email, senha) => {
    try {
        const emailNormalizado = String(email || '').trim().toLowerCase();
        const senhaInformada = String(senha || '');

        if (!emailNormalizado || !senhaInformada || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailNormalizado)) {
            throw createAuthError('Credenciais inválidas.');
        }

        if (senhaInformada.length < 8) {
            throw createAuthError('Credenciais inválidas.');
        }

        const usuario = await queryOne(
            'SELECT id, nome, email, senha_hash, perfil, setor_id FROM usuarios WHERE email = $1 AND ativo = true',
            [emailNormalizado]
        );

        if (!usuario) {
            throw createAuthError('Credenciais inválidas.');
        }

        const senhaValida = await bcryptjs.compare(senhaInformada, usuario.senha_hash);
        if (!senhaValida) {
            throw createAuthError('Credenciais inválidas.');
        }

        await query(
            'UPDATE usuarios SET ultimo_acesso = CURRENT_TIMESTAMP WHERE id = $1',
            [usuario.id]
        );

        await query(
            'INSERT INTO logs (usuario_id, acao, tabela_afetada) VALUES ($1, $2, $3)',
            [usuario.id, 'Login realizado', 'usuarios']
        );

        const token = jwt.sign(
            {
                id: usuario.id,
                email: usuario.email,
                nome: usuario.nome,
                perfil: usuario.perfil,
                setor_id: usuario.setor_id
            },
            process.env.JWT_SECRET,
            { expiresIn: process.env.JWT_EXPIRES_IN || '15m' }
        );

        return {
            token,
            usuario: {
                id: usuario.id,
                nome: usuario.nome,
                email: usuario.email,
                perfil: usuario.perfil,
                setor_id: usuario.setor_id
            }
        };
    } catch (error) {
        if (error.statusCode) {
            throw error;
        }
        throw createAuthError('Credenciais inválidas.');
    }
};

/**
 * Registrar novo usuário (apenas admin)
 * @param {object} userData
 * @returns {Promise}
 */
const registrar = async (userData) => {
    try {
        const { nome, email, senha, perfil, setor_id } = userData;

        // Validações
        if (!nome || !email || !senha || !perfil) {
            throw new Error('Campos obrigatórios não preenchidos');
        }

        if (!['NGE', 'SETOR'].includes(perfil)) {
            throw new Error('Perfil inválido');
        }

        if (senha.length < 8) {
            throw new Error('A senha deve ter pelo menos 8 caracteres');
        }

        // Verificar se usuário já existe
        const usuarioExistente = await queryOne(
            'SELECT id FROM usuarios WHERE email = $1',
            [email]
        );

        if (usuarioExistente) {
            throw new Error('E-mail já cadastrado');
        }

        // Hash da senha
        const senhaHash = await bcryptjs.hash(senha, 12);

        // Inserir usuário
        const resultado = await queryOne(
            `INSERT INTO usuarios (nome, email, senha_hash, perfil, setor_id) 
             VALUES ($1, $2, $3, $4, $5) 
             RETURNING id, nome, email, perfil, setor_id`,
            [nome, email, senhaHash, perfil, setor_id || null]
        );

        return resultado;
    } catch (error) {
        throw error;
    }
};

/**
 * Listar todos os usuários (apenas admin)
 * @returns {Promise}
 */
const listarUsuarios = async () => {
    try {
        const usuarios = await queryMany(
            `SELECT u.id, u.nome, u.email, u.perfil, u.setor_id, s.nome as setor_nome, 
                    u.ativo, u.ultimo_acesso, u.criado_em
             FROM usuarios u
             LEFT JOIN setores s ON u.setor_id = s.id
             ORDER BY u.criado_em DESC`
        );

        return usuarios;
    } catch (error) {
        throw error;
    }
};

/**
 * Obter detalhes do usuário
 * @param {number} usuarioId
 * @returns {Promise}
 */
const obterUsuario = async (usuarioId) => {
    try {
        const usuario = await queryOne(
            `SELECT u.id, u.nome, u.email, u.perfil, u.setor_id, s.nome as setor_nome,
                    u.ativo, u.ultimo_acesso, u.criado_em
             FROM usuarios u
             LEFT JOIN setores s ON u.setor_id = s.id
             WHERE u.id = $1`,
            [usuarioId]
        );

        return usuario;
    } catch (error) {
        throw error;
    }
};

/**
 * Atualizar usuário
 * @param {number} usuarioId
 * @param {object} userData
 * @returns {Promise}
 */
const atualizarUsuario = async (usuarioId, userData) => {
    try {
        const { nome, email, perfil, setor_id, ativo } = userData;

        const usuarioAtualizado = await queryOne(
            `UPDATE usuarios 
             SET nome = COALESCE($1, nome),
                 email = COALESCE($2, email),
                 perfil = COALESCE($3, perfil),
                 setor_id = COALESCE($4, setor_id),
                 ativo = COALESCE($5, ativo)
             WHERE id = $6
             RETURNING id, nome, email, perfil, setor_id, ativo`,
            [nome || null, email || null, perfil || null, setor_id || null, ativo !== undefined ? ativo : null, usuarioId]
        );

        return usuarioAtualizado;
    } catch (error) {
        throw error;
    }
};

/**
 * Alterar senha
 * @param {number} usuarioId
 * @param {string} senhaAtual
 * @param {string} novaSenha
 * @returns {Promise}
 */
const alterarSenha = async (usuarioId, senhaAtual, novaSenha) => {
    try {
        // Buscar usuário
        const usuario = await queryOne(
            'SELECT id, senha_hash FROM usuarios WHERE id = $1',
            [usuarioId]
        );

        if (!usuario) {
            throw new Error('Usuário não encontrado');
        }

        // Verificar senha atual
        const senhaValida = await bcryptjs.compare(senhaAtual, usuario.senha_hash);
        if (!senhaValida) {
            throw new Error('Senha atual inválida');
        }

        // Hash da nova senha
        const novaHash = await bcryptjs.hash(novaSenha, 12);

        // Atualizar senha
        await query(
            'UPDATE usuarios SET senha_hash = $1 WHERE id = $2',
            [novaHash, usuarioId]
        );

        // Registrar log
        await query(
            'INSERT INTO logs (usuario_id, acao, tabela_afetada) VALUES ($1, $2, $3)',
            [usuarioId, 'Senha alterada', 'usuarios']
        );

        return { mensagem: 'Senha alterada com sucesso' };
    } catch (error) {
        throw error;
    }
};

module.exports = {
    login,
    registrar,
    listarUsuarios,
    obterUsuario,
    atualizarUsuario,
    alterarSenha
};
