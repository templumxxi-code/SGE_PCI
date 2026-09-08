// ============================================================================
// Auth Controller
// ============================================================================

const bcryptjs = require('bcryptjs');
const jwt = require('jsonwebtoken');
const userRepository = require('../repositories/userRepository');
const { createSession } = require('../repositories/sessionRepository');
const { query } = require('../models/db');
const { getPermissions, recordLoginAttempt, failedAttemptsSince } = require('../repositories/securityRepository');
const { normalizePerfil, isProfileAllowed } = require('../services/roles');

const createAuthError = (message, statusCode = 401) => {
    const error = new Error(message);
    error.statusCode = statusCode;
    return error;
};

const recordAuthAudit = async (userId, action, request = null) => {
    try {
        await query(
            `INSERT INTO audit_logs (user_id, action, entity, entity_id, new_data, ip)
             VALUES ($1, $2, 'authentication', $3, $4, $5)`,
            [userId || null, action, userId ? String(userId) : null, JSON.stringify({}), request?.ip || null]
        );
    } catch (error) {
        console.error('Falha ao registrar auditoria de autenticacao:', error.message);
    }
};

/**
 * Login do usuário
 * @param {string} email
 * @param {string} senha
 * @param {string} perfil (opcional)
 * @returns {Promise}
 */
const login = async (email, senha, perfilSolicitado = null, request = null) => {
    const emailNormalizado = String(email || '').trim().toLowerCase();
    try {
        const senhaInformada = String(senha || '');

        if (!emailNormalizado || !senhaInformada || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailNormalizado)) {
            throw createAuthError('Credenciais inválidas.');
        }

        if (senhaInformada.length < 8) {
            await recordLoginAttempt(emailNormalizado, request?.ip, false, 'INVALID_CREDENTIALS');
            throw createAuthError('Credenciais inválidas.');
        }

        if (await failedAttemptsSince(emailNormalizado) >= 5) {
            throw createAuthError('Usuário temporariamente bloqueado', 423);
        }

        const usuarioEncontrado = await userRepository.findUserByEmail(emailNormalizado);
        const usuario = usuarioEncontrado && await bcryptjs.compare(senhaInformada, usuarioEncontrado.passwordHash)
            ? usuarioEncontrado
            : null;

        if (!usuario || !usuario.active) {
            await recordLoginAttempt(emailNormalizado, request?.ip, false, 'INVALID_CREDENTIALS');
            await recordAuthAudit(usuario?.id, 'LOGIN_FAILED', request);
            throw createAuthError('Credenciais inválidas.');
        }

        const permissions = await getPermissions(usuario.id);

        // Se um perfil foi solicitado, validar se o usuário tem esse perfil
        let perfilNormalizado = normalizePerfil(usuario.perfil || usuario.role);
        
        if (perfilSolicitado) {
            const perfilSolicitadoNormalizado = normalizePerfil(perfilSolicitado);
            const perfisDoUsuario = usuario.perfis || [usuario.perfil || usuario.role];
            
            // Verificar se o perfil solicitado está na lista de perfis do usuário
            const temPerfilSolicitado = perfisDoUsuario.some(p => normalizePerfil(p) === perfilSolicitadoNormalizado);
            
            if (!temPerfilSolicitado) {
                throw createAuthError('Perfil não disponível para este usuário.');
            }
            
            perfilNormalizado = perfilSolicitadoNormalizado;
        }

        const token = jwt.sign(
            {
                id: usuario.id,
                email: usuario.email,
                nome: usuario.nome,
                perfil: perfilNormalizado,
                setor_id: usuario.setor_id || usuario.sectorId || null
                ,permissions
            },
            process.env.JWT_SECRET,
            { expiresIn: process.env.JWT_EXPIRES_IN || '15m' }
        );
        const expiresAt = new Date(Date.now() + 15 * 60 * 1000);
        await createSession(usuario.id, token, expiresAt);
        await recordLoginAttempt(emailNormalizado, request?.ip, true, 'LOGIN_SUCCESS');
        await recordAuthAudit(usuario.id, 'LOGIN_SUCCESS', request);

        return {
            token,
            usuario: {
                id: usuario.id,
                nome: usuario.nome,
                email: usuario.email,
                perfil: perfilNormalizado,
                setor_id: usuario.setor_id || usuario.sectorId || null,
                organizationType: usuario.organizationType || 'SETOR',
                organizationUnitId: usuario.organizationUnitId || null,
                instituteId: usuario.instituteId || null,
                regionalId: usuario.regionalId || null,
                advisoryId: usuario.advisoryId || null,
                nucleusId: usuario.nucleusId || null,
                sectorId: usuario.sectorId || usuario.setor_id || null,
                active: usuario.active
            }
        };
    } catch (error) {
        if (error.statusCode) {
            throw error;
        }
        await recordLoginAttempt(emailNormalizado, request?.ip, false, 'INVALID_CREDENTIALS').catch(() => {});
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
        const { nome, email, senha, perfil, perfis, setor_id, registration, organizationType, organizationUnitId, instituteId, regionalId, advisoryId, nucleusId, sectorId, active, observations } = userData;

        if (!nome || !email || !senha) {
            throw new Error('Campos obrigatórios não preenchidos');
        }

        const perfisSelecionados = Array.isArray(perfis) && perfis.length > 0 ? perfis : (perfil ? [perfil] : []);
        if (perfisSelecionados.length === 0) {
            throw new Error('Selecione pelo menos um perfil');
        }

        const perfisNormalizados = perfisSelecionados.map((item) => normalizePerfil(item)).filter(Boolean);
        const perfilPrincipal = perfisNormalizados[0];

        const allowedProfiles = ['NGE', 'DIRETOR_INSTITUTO', 'SUBCOORDENADOR_REGIONAL', 'SUBCOORDENADOR_INSTITUTO', 'SUBCOORDENADOR_FINANCEIRA', 'SUBCOORDENADOR_ADMINISTRATIVA', 'ASSESSOR', 'CHEFE_NUCLEO', 'CHEFE_SETOR', 'OPERACIONAL'];
        const perfisValidos = perfisNormalizados.every((item) => isProfileAllowed(item, allowedProfiles));
        if (!perfisValidos || !perfilPrincipal) {
            throw new Error('Perfil inválido');
        }

        if (String(senha).length < 8) {
            throw new Error('A senha deve ter pelo menos 8 caracteres');
        }

        const usuarioExistente = await userRepository.findUserByEmail(email);
        if (usuarioExistente) {
            throw new Error('E-mail já cadastrado');
        }

        const passwordHash = await bcryptjs.hash(String(senha), 12);
        const resultado = await userRepository.createUser({
            nome,
            matricula: registration,
            email,
            passwordHash,
            roleCode: perfilPrincipal,
            organizationalUnitId: organizationUnitId,
            mustChangePassword: true
        });

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
        return (await userRepository.findAllUsers()).map((usuario) => ({
            ...usuario,
            perfil: normalizePerfil(usuario.perfil)
        }));
    } catch (error) {
        throw error;
    }
};

/**
 * Listar somente os dados necessários para o seletor de login.
 */
const listarOpcoesLogin = async () => {
    return userRepository.findAllUsers()
        .filter((usuario) => usuario.active !== false)
        .map((usuario) => ({
            id: usuario.id,
            nome: usuario.nome,
            email: usuario.email,
            perfil: normalizePerfil(usuario.perfil)
        }));
};

/**
 * Obter detalhes do usuário
 * @param {number} usuarioId
 * @returns {Promise}
 */
const obterUsuario = async (usuarioId) => {
    try {
        const usuario = await userRepository.findUserById(usuarioId);

        if (!usuario) {
            return null;
        }

        return {
            ...usuario,
            perfil: normalizePerfil(usuario.perfil)
        };
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
        const perfilNormalizado = perfil ? normalizePerfil(perfil) : null;

        const usuarioAtualizado = await userRepository.updateUser(usuarioId, {
            nome,
            matricula: userData.matricula,
            email,
            roleCode: perfilNormalizado,
            organizationalUnitId: userData.organizationUnitId,
            ativo
        });

        if (!usuarioAtualizado) {
            return null;
        }

        return {
            ...usuarioAtualizado,
            perfil: normalizePerfil(usuarioAtualizado.perfil)
        };
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
        const usuario = await userRepository.findUserById(usuarioId);

        if (!usuario) {
            throw new Error('Usuário não encontrado');
        }

        const senhaValida = await bcryptjs.compare(String(senhaAtual || ''), usuario.passwordHash || '');
        if (!senhaValida) {
            throw new Error('Senha atual inválida');
        }

        const passwordHash = await bcryptjs.hash(String(novaSenha), 12);
        await userRepository.changePassword(usuarioId, passwordHash);
        await recordAuthAudit(usuarioId, 'PASSWORD_CHANGED');

        return { mensagem: 'Senha alterada com sucesso' };
    } catch (error) {
        throw error;
    }
};

/**
 * Deletar usuário (soft delete)
 * @param {number} usuarioId
 * @returns {Promise}
 */
const deletarUsuario = async (usuarioId) => {
    try {
        const usuario = await userRepository.findUserById(usuarioId);

        if (!usuario) {
            const err = new Error('Usuário não encontrado');
            err.statusCode = 404;
            throw err;
        }

        const resultado = await userRepository.disableUser(usuarioId);

        if (!resultado) {
            const err = new Error('Erro ao remover usuário');
            err.statusCode = 400;
            throw err;
        }

        return { id: usuarioId, message: 'Usuário removido com sucesso', usuario: resultado };
    } catch (error) {
        throw error;
    }
};

/**
 * Obter perfis disponíveis para um email
 * @param {string} email
 * @returns {Promise}
 */
const obterPerfisDisponíveis = async (email) => {
    try {
        const emailNormalizado = String(email || '').trim().toLowerCase();
        const usuario = await userRepository.findUserByEmail(emailNormalizado);

        if (!usuario || !usuario.active) {
            return { perfis: [], encontrado: false };
        }

        // Retornar os perfis do usuário
        const perfis = usuario.perfis || [usuario.perfil || 'OPERACIONAL'];
        return {
            perfis: perfis.map((p) => ({
                id: p,
                nome: normalizePerfil(p)
            })),
            encontrado: true,
            usuario: {
                id: usuario.id,
                nome: usuario.nome,
                email: usuario.email
            }
        };
    } catch (error) {
        return { perfis: [], encontrado: false, erro: error.message };
    }
};

/**
 * Atualizar status do usuário
 * @param {number} usuarioId
 * @param {boolean} active
 * @returns {Promise}
 */
const atualizarStatusUsuario = async (usuarioId, active) => {
    try {
        const usuario = await userRepository.findUserById(usuarioId);

        if (!usuario) {
            throw new Error('Usuário não encontrado');
        }

        await userRepository.updateUser(usuarioId, { ativo: Boolean(active) });

        return { id: usuarioId, active: Boolean(active), message: 'Status atualizado com sucesso' };
    } catch (error) {
        throw error;
    }
};

module.exports = {
    login,
    registrar,
    listarUsuarios,
    listarOpcoesLogin,
    obterUsuario,
    atualizarUsuario,
    alterarSenha,
    deletarUsuario,
    obterPerfisDisponíveis,
    atualizarStatusUsuario
    ,recordAuthAudit
};
