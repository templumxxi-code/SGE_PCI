// ============================================================================
// Auth Controller
// ============================================================================

const bcryptjs = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { verifyPassword, createUser, listUsers, findUserById, findUserByEmail, updateUser, changePassword } = require('../models/userStore');
const { normalizePerfil, isProfileAllowed } = require('../services/roles');

const createAuthError = (message, statusCode = 401) => {
    const error = new Error(message);
    error.statusCode = statusCode;
    return error;
};

/**
 * Login do usuário
 * @param {string} email
 * @param {string} senha
 * @param {string} perfil (opcional)
 * @returns {Promise}
 */
const login = async (email, senha, perfilSolicitado = null) => {
    try {
        const emailNormalizado = String(email || '').trim().toLowerCase();
        const senhaInformada = String(senha || '');

        if (!emailNormalizado || !senhaInformada || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailNormalizado)) {
            throw createAuthError('Credenciais inválidas.');
        }

        if (senhaInformada.length < 8) {
            throw createAuthError('Credenciais inválidas.');
        }

        const usuario = await verifyPassword(emailNormalizado, senhaInformada);

        if (!usuario || !usuario.active) {
            throw createAuthError('Credenciais inválidas.');
        }

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

        const usuarioExistente = await findUserByEmail(email);
        if (usuarioExistente) {
            throw new Error('E-mail já cadastrado');
        }

        const resultado = await createUser({
            nome,
            name: nome,
            registration,
            email,
            senha,
            perfis: perfisNormalizados,
            perfil: perfilPrincipal,
            role: perfilPrincipal,
            organizationType,
            organizationUnitId,
            instituteId,
            regionalId,
            advisoryId,
            nucleusId,
            sectorId: sectorId ?? setor_id,
            setor_id: sectorId ?? setor_id,
            active: active !== false,
            observations
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
        return listUsers().map((usuario) => ({
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
    return listUsers()
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
        const usuario = await findUserById(usuarioId);

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

        const usuarioAtualizado = await updateUser(usuarioId, {
            nome,
            email,
            perfil: perfilNormalizado,
            setor_id,
            active: ativo
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
        const usuario = await findUserById(usuarioId);

        if (!usuario) {
            throw new Error('Usuário não encontrado');
        }

        const senhaValida = await bcryptjs.compare(String(senhaAtual || ''), usuario.passwordHash || '');
        if (!senhaValida) {
            throw new Error('Senha atual inválida');
        }

        await changePassword(usuarioId, novaSenha);

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
        const usuario = await findUserById(usuarioId);

        if (!usuario) {
            const err = new Error('Usuário não encontrado');
            err.statusCode = 404;
            throw err;
        }

        // Soft delete - marcar como inativo
        const resultado = await updateUser(usuarioId, { active: false, deletedAt: new Date().toISOString() });
        
        if (!resultado) {
            const err = new Error('Erro ao atualizar usuário');
            err.statusCode = 400;
            throw err;
        }

        return { id: usuarioId, message: 'Usuário inativado com sucesso', usuario: resultado };
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
        const usuario = await findUserByEmail(emailNormalizado);

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
        const usuario = await findUserById(usuarioId);

        if (!usuario) {
            throw new Error('Usuário não encontrado');
        }

        await updateUser(usuarioId, { active: Boolean(active) });

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
};
