const { queryOne } = require('../models/db');

const resolveLegacyUnit = async (unitId) => {
    if (unitId === null || unitId === undefined) return null;
    if (/^\d+$/.test(String(unitId))) return Number(unitId);
    const row = await queryOne('SELECT setor_legado_id FROM organizational_units_v2 WHERE id = $1', [unitId]).catch(() => null);
    return row?.setor_legado_id || null;
};

module.exports = { resolveLegacyUnit };
