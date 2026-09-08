const { queryOne } = require('../models/db');

const resolveLegacyProcessId = async (processId) => {
    if (Number.isInteger(processId) || /^\d+$/.test(String(processId))) return Number(processId);
    const row = await queryOne('SELECT id FROM processos WHERE canonical_id = $1 LIMIT 1', [processId]).catch(() => null);
    return row?.id || null;
};

module.exports = { resolveLegacyProcessId };
