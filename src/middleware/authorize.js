const { normalizePerfil, isGlobalAdmin } = require('../services/roles');
const { getPermissions } = require('../repositories/securityRepository');
const { query } = require('../models/db');

const authorize = ({ roles = [], permissions = [], allowSelf = false } = {}) => async (req, res, next) => {
    const user = req.user;
    const profile = normalizePerfil(user?.perfil);

    if (!user) return res.status(401).json({ error: 'Autenticação obrigatória' });
    if (allowSelf && String(req.params.id) === String(user.id)) return next();
    if (roles.length > 0 && roles.map(normalizePerfil).includes(profile)) return next();
    if (permissions.length > 0) {
        const granted = user.permissions || await getPermissions(user.id);
        if (isGlobalAdmin(profile) || permissions.some((permission) => granted.includes(permission))) return next();
    }

    await query(
        `INSERT INTO audit_logs (user_id, action, entity, entity_id, new_data, ip)
         VALUES ($1, 'UNAUTHORIZED_ACCESS_ATTEMPT', 'authorization', $2, $3, $4)`,
        [user.id, req.originalUrl, JSON.stringify({ method: req.method }), req.ip]
    ).catch(() => {});
    return res.status(403).json({ error: 'Acesso não autorizado' });
};

module.exports = { authorize };
