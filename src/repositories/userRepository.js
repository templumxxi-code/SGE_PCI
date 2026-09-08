const { query, queryOne } = require('../models/db');

const userSelect = `
    SELECT u.id, u.nome, u.matricula, u.email, u.password_hash,
           u.ativo, u.organizational_unit_id, u.must_change_password,
           u.created_at, u.updated_at, r.code AS role_code,
           ou.nome AS organizational_unit_name, ou.tipo AS organizational_unit_type
    FROM users u
    JOIN roles r ON r.id = u.role_id
    LEFT JOIN organizational_units_v2 ou ON ou.id = u.organizational_unit_id
`;

const mapUser = (row) => {
    if (!row) return null;
    const perfil = row.role_code === 'NGE_ADMIN' ? 'NGE' : row.role_code;
    return {
        id: row.id,
        nome: row.nome,
        name: row.nome,
        registration: row.matricula,
        matricula: row.matricula,
        email: row.email,
        passwordHash: row.password_hash,
        ativo: row.ativo,
        active: row.ativo,
        perfil,
        role: row.role_code,
        perfis: [perfil],
        organizationUnitId: row.organizational_unit_id,
        organizationUnitName: row.organizational_unit_name,
        organizationType: row.organizational_unit_type,
        mustChangePassword: row.must_change_password,
        createdAt: row.created_at,
        updatedAt: row.updated_at
    };
};

const findUserByEmail = async (email) => {
    const row = await queryOne(`${userSelect} WHERE LOWER(u.email) = LOWER($1)`, [String(email || '').trim()]);
    return mapUser(row);
};

const findUserById = async (id) => {
    const row = await queryOne(`${userSelect} WHERE u.id = $1`, [id]);
    return mapUser(row);
};

const findAllUsers = async () => {
    const result = await query(`${userSelect} ORDER BY u.nome`);
    return result.rows.map(mapUser);
};

const findUsersByUnitIds = async (unitIds) => {
    if (!Array.isArray(unitIds) || unitIds.length === 0) return [];
    const result = await query(`${userSelect} WHERE u.organizational_unit_id = ANY($1::uuid[]) ORDER BY u.nome`, [unitIds]);
    return result.rows.map(mapUser);
};

const findRoleId = async (roleCode) => {
    const row = await queryOne('SELECT id FROM roles WHERE code = $1 AND active = TRUE', [roleCode]);
    return row?.id || null;
};

const createUser = async ({ nome, matricula, email, passwordHash, roleCode, organizationalUnitId, mustChangePassword = true }) => {
    const roleId = await findRoleId(roleCode);
    if (!roleId) throw new Error('Perfil não encontrado');
    const row = await queryOne(
        `INSERT INTO users (nome, matricula, email, password_hash, ativo, role_id, organizational_unit_id, must_change_password)
         VALUES ($1, $2, LOWER($3), $4, TRUE, $5, $6, $7)
         RETURNING id`,
        [nome, matricula || null, email, passwordHash, roleId, organizationalUnitId || null, mustChangePassword]
    );
    return findUserById(row.id);
};

const updateUser = async (id, { nome, matricula, email, roleCode, organizationalUnitId, ativo }) => {
    const roleId = roleCode ? await findRoleId(roleCode) : null;
    if (roleCode && !roleId) throw new Error('Perfil não encontrado');
    const row = await queryOne(
        `UPDATE users
         SET nome = COALESCE($2, nome), matricula = COALESCE($3, matricula),
             email = COALESCE(LOWER($4), email), role_id = COALESCE($5, role_id),
             organizational_unit_id = COALESCE($6, organizational_unit_id),
             ativo = COALESCE($7, ativo), updated_at = CURRENT_TIMESTAMP
         WHERE id = $1
         RETURNING id`,
        [id, nome || null, matricula || null, email || null, roleId, organizationalUnitId || null, ativo]
    );
    return row ? findUserById(row.id) : null;
};

const disableUser = async (id) => updateUser(id, { ativo: false });

const changePassword = async (id, passwordHash) => {
    const row = await queryOne(
        `UPDATE users SET password_hash = $2, must_change_password = FALSE, updated_at = CURRENT_TIMESTAMP
         WHERE id = $1 RETURNING id`,
        [id, passwordHash]
    );
    return Boolean(row);
};

module.exports = {
    findUserByEmail,
    findUserById,
    findAllUsers,
    findUsersByUnitIds,
    createUser,
    updateUser,
    disableUser,
    changePassword
};
