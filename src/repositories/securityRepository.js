const { query, queryOne } = require('../models/db');

const getPermissions = async (userId) => {
    const result = await query(`
        SELECT DISTINCT p.code
        FROM user_roles ur
        JOIN roles_permissions rp ON rp.role_id = ur.role_id
        JOIN permissions p ON p.id = rp.permission_id
        JOIN roles r ON r.id = ur.role_id
        WHERE ur.user_id = $1 AND r.active = TRUE
    `, [userId]);
    return result.rows.map((row) => row.code);
};

const recordLoginAttempt = async (email, ip, success, reason) => {
    await query(
        'INSERT INTO login_attempts (email, ip, success, reason) VALUES ($1, $2, $3, $4)',
        [String(email || '').trim().toLowerCase(), ip || null, success, reason || null]
    );
};

const failedAttemptsSince = async (email, minutes = 15) => {
    const row = await queryOne(
        `SELECT COUNT(*)::int AS count FROM login_attempts
         WHERE email = $1 AND success = FALSE AND created_at > CURRENT_TIMESTAMP - ($2 * INTERVAL '1 minute')`,
        [String(email || '').trim().toLowerCase(), minutes]
    );
    return row?.count || 0;
};

module.exports = { getPermissions, recordLoginAttempt, failedAttemptsSince };