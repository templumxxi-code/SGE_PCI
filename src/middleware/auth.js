// ============================================================================
// Middleware de Autenticação
// ============================================================================

const jwt = require('jsonwebtoken');
const { queryOne } = require('../models/db');
const { findUserById, findUserByEmail } = require('../models/userStore');
const { normalizePerfil, isGlobalAdmin, isAnySectorRole } = require('../services/roles');

const getJwtSecret = () => {
    const secret = process.env.JWT_SECRET;
    if (!secret) {
        throw new Error('JWT_SECRET não configurado');
    }
    return secret;
};

/**
 * Middleware para verificar token JWT
 * @param {object} req - Request object
 * @param {object} res - Response object
 * @param {function} next - Próximo middleware
 */
const verifyToken = async (req, res, next) => {
    try {
        const authHeader = req.headers.authorization || '';
        const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;

        if (!token) {
            return res.status(401).json({ error: 'Token não fornecido' });
        }

        const decoded = jwt.verify(token, getJwtSecret());

        const authMode = req.app?.locals?.authMode || (process.env.USE_MOCK_API === 'true' ? 'mock' : 'database');
        if (authMode === 'mock') {
            const logoutTimestamp = global.mockLogoutTimestamp;
            if (logoutTimestamp && decoded.iat * 1000 <= logoutTimestamp.getTime()) {
                return res.status(401).json({ error: 'Sessão inválida. Faça login novamente.' });
            }
            req.user = {
                ...decoded,
                perfil: normalizePerfil(decoded.perfil),
                setor_id: decoded.setor_id
            };
            return next();
        }

        try {
            const usuario = await queryOne('SELECT id, ativo, perfil, setor_id, ultimo_logout_em FROM usuarios WHERE id = $1', [decoded.id]);
            if (!usuario || !usuario.ativo) {
                return res.status(401).json({ error: 'Sessão inválida. Faça login novamente.' });
            }

            if (usuario.ultimo_logout_em) {
                const tokenIssuedAt = decoded.iat * 1000;
                const lastLogoutAt = usuario.ultimo_logout_em.getTime();
                if (tokenIssuedAt <= lastLogoutAt) {
                    return res.status(401).json({ error: 'Sessão inválida. Faça login novamente.' });
                }
            }

            req.user = {
                ...decoded,
                perfil: normalizePerfil(usuario.perfil),
                setor_id: usuario.setor_id,
                ativo: usuario.ativo
            };
            return next();
        } catch (error) {
            const localUser = decoded.id ? findUserById(decoded.id) : (decoded.email ? findUserByEmail(decoded.email) : null);
            if (localUser && localUser.active !== false) {
                req.user = {
                    ...decoded,
                    id: Number(localUser.id),
                    email: localUser.email,
                    nome: localUser.nome || localUser.name,
                    perfil: normalizePerfil(localUser.perfil || localUser.role),
                    setor_id: localUser.setor_id || localUser.sectorId || decoded.setor_id || null,
                    ativo: localUser.active !== false
                };
                return next();
            }

            console.warn('Erro ao validar usuário autenticado:', error.message);
            return res.status(401).json({ error: 'Token inválido ou expirado' });
        }
    } catch (error) {
        res.status(401).json({ error: 'Token inválido ou expirado' });
    }
};

/**
 * Middleware para verificar se é administrador
 * @param {object} req - Request object
 * @param {object} res - Response object
 * @param {function} next - Próximo middleware
 */
const requireAdmin = (req, res, next) => {
    if (!isGlobalAdmin(req.user?.perfil)) {
        return res.status(403).json({
            error: 'Acesso restrito a administradores'
        });
    }
    next();
};

/**
 * Middleware para verificar acesso ao setor
 * @param {object} req - Request object
 * @param {object} res - Response object
 * @param {function} next - Próximo middleware
 */
const requireSetor = (req, res, next) => {
    if (!isGlobalAdmin(req.user?.perfil) && !isAnySectorRole(req.user?.perfil)) {
        return res.status(403).json({
            error: 'Acesso restrito'
        });
    }
    next();
};

module.exports = {
    verifyToken,
    requireAdmin,
    requireSetor
};
