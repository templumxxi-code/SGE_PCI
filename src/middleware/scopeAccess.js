const { query, queryOne } = require('../models/db');
const { isGlobalAdmin, normalizePerfil } = require('../services/roles');

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const getUserScope = async (user) => {
    if (!user) return { global: false, unitIds: [] };
    if (isGlobalAdmin(user.perfil)) return { global: true, unitIds: [] };

    const result = await query(`
        WITH RECURSIVE descendants AS (
            SELECT id FROM organizational_units_v2 WHERE id = $1 AND ativo = TRUE
            UNION ALL
            SELECT child.id
            FROM organizational_units_v2 child
            JOIN descendants parent ON child.parent_id = parent.id
            WHERE child.ativo = TRUE
        )
        SELECT id FROM descendants
    `, [user.organizationUnitId]);
    return { global: false, unitIds: result.rows.map((row) => row.id) };
};

const getAllowedUnits = async (user) => (await getUserScope(user)).unitIds;

const canAccessUnit = async (user, unitId) => {
    const scope = await getUserScope(user);
    return scope.global || (Boolean(unitId) && scope.unitIds.includes(unitId));
};

const canAccessResource = async (user, getResourceUnitId) => {
    const unitId = await getResourceUnitId();
    return canAccessUnit(user, unitId);
};

const checkScopeAccess = (getResourceUnitId) => async (req, res, next) => {
    try {
        const scope = await getUserScope(req.user);
        if (scope.global) return next();
        const unitId = await getResourceUnitId(req);
        if (unitId && scope.unitIds.includes(unitId)) {
            await query(
                `INSERT INTO audit_logs (user_id, action, entity, entity_id, new_data, ip)
                 VALUES ($1, 'DATA_ACCESS_GRANTED', 'scope', $2, $3, $4)`,
                [req.user?.id || null, req.originalUrl, JSON.stringify({ unitId }), req.ip]
            ).catch(() => {});
            return next();
        }

        await query(
            `INSERT INTO audit_logs (user_id, action, entity, entity_id, new_data, ip)
             VALUES ($1, 'DATA_ACCESS_DENIED', 'scope', $2, $3, $4)`,
            [req.user?.id || null, req.originalUrl, JSON.stringify({ profile: normalizePerfil(req.user?.perfil) }), req.ip]
        ).catch(() => {});
        return res.status(403).json({ error: 'Acesso não autorizado à lotação' });
    } catch (error) {
        return next(error);
    }
};

const getUserUnitId = async (userId) => {
    const row = await queryOne('SELECT organizational_unit_id FROM users WHERE id = $1 AND ativo = TRUE', [userId]);
    return row?.organizational_unit_id || null;
};

module.exports = { getUserScope, getAllowedUnits, canAccessUnit, canAccessResource, checkScopeAccess, getUserUnitId, UUID_PATTERN };