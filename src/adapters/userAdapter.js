const { queryOne } = require('../models/db');

const resolveLegacyUser = async (user) => {
    if (!user) return null;
    if (user.legacyUserId !== undefined) return user;
    const legacy = await queryOne('SELECT id, setor_id FROM usuarios WHERE LOWER(email) = LOWER($1) LIMIT 1', [user.email]).catch(() => null);
    return { ...user, legacyUserId: legacy?.id || null, legacySectorId: legacy?.setor_id || null };
};

module.exports = { resolveLegacyUser };
