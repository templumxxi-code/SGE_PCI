const { query, queryOne } = require('../models/db');

const listActiveModules = async () => {
    const result = await query(
        `SELECT id, name, code, description, status, created_at, updated_at
         FROM modules
         WHERE status = 'ACTIVE'
         ORDER BY name`
    );
    return result.rows;
};

const listUserModules = async (userId) => {
    const result = await query(
        `SELECT m.id, m.name, m.code, m.description, m.status, um.created_at AS granted_at
         FROM user_modules um
         JOIN modules m ON m.id = um.module_id
         WHERE um.user_id = $1 AND m.status = 'ACTIVE'
         ORDER BY m.name`,
        [userId]
    );
    return result.rows;
};

const listUserModuleAccess = async (userId) => {
    const result = await query(
        `SELECT m.id, m.name, m.code, m.description, m.status,
                (um.id IS NOT NULL) AS enabled,
                um.created_at AS granted_at
         FROM modules m
         LEFT JOIN user_modules um ON um.module_id = m.id AND um.user_id = $1
         ORDER BY m.name`,
        [userId]
    );
    return result.rows;
};

const findModuleById = async (moduleId) => queryOne(
    `SELECT id, name, code, description, status FROM modules WHERE id = $1`,
    [moduleId]
);

const findModuleByCode = async (code) => queryOne(
    `SELECT id, name, code, description, status FROM modules WHERE code = $1 AND status = 'ACTIVE'`,
    [code]
);

const grantModule = async (userId, moduleId) => {
    const result = await query(
        `INSERT INTO user_modules (user_id, module_id)
         VALUES ($1, $2)
         ON CONFLICT (user_id, module_id) DO NOTHING
         RETURNING id, user_id, module_id, created_at`,
        [userId, moduleId]
    );
    if (result.rows[0]) return result.rows[0];
    return queryOne(
        `SELECT id, user_id, module_id, created_at
         FROM user_modules WHERE user_id = $1 AND module_id = $2`,
        [userId, moduleId]
    );
};

const revokeModule = async (userId, moduleId) => {
    const result = await query(
        'DELETE FROM user_modules WHERE user_id = $1 AND module_id = $2 RETURNING id',
        [userId, moduleId]
    );
    return Boolean(result.rows[0]);
};

const hasModuleAccess = async (userId, moduleCode) => {
    const row = await queryOne(
        `SELECT 1
         FROM user_modules um
         JOIN modules m ON m.id = um.module_id
         WHERE um.user_id = $1 AND m.code = $2 AND m.status = 'ACTIVE'`,
        [userId, moduleCode]
    );
    return Boolean(row);
};

module.exports = {
    listActiveModules,
    listUserModules,
    listUserModuleAccess,
    findModuleById,
    findModuleByCode,
    grantModule,
    revokeModule,
    hasModuleAccess
};
