const { query, queryOne } = require('../../models/db');

const createIndicator = async (data) => queryOne(
    `INSERT INTO process_indicators (process_id, name, description, target, current_value, unit, status)
     VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *`,
    [data.processId, data.name, data.description || null, data.target ?? null, data.currentValue ?? null, data.unit || null, data.status || null]
);

const getIndicators = async (processId) => (await query('SELECT * FROM process_indicators WHERE process_id=$1 ORDER BY created_at', [processId])).rows;
const updateIndicator = async (id, data) => queryOne(
    `UPDATE process_indicators SET name=COALESCE($2,name), description=COALESCE($3,description), target=COALESCE($4,target), current_value=COALESCE($5,current_value), unit=COALESCE($6,unit), status=COALESCE($7,status) WHERE id=$1 RETURNING *`,
    [id, data.name || null, data.description || null, data.target ?? null, data.currentValue ?? null, data.unit || null, data.status || null]
);

module.exports = { createIndicator, getIndicators, updateIndicator };