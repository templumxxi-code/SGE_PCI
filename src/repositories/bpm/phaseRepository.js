const { query, queryOne } = require('../../models/db');

const createPhase = async ({ processId, phaseCode, phaseName, phaseOrder, status = 'PENDING' }) => {
    return queryOne(`INSERT INTO process_phases (process_id, phase_code, phase_name, phase_order, order_number, status)
        VALUES ($1,$2,$3,$4,$5,$6) RETURNING *`, [processId, phaseCode, phaseName, Number(phaseOrder), Number(phaseOrder), status]);
};

const getProcessPhases = async (processId) => (await query('SELECT * FROM process_phases WHERE process_id=$1 ORDER BY COALESCE(phase_order, order_number)', [processId])).rows;

const getPhaseById = async (id) => queryOne('SELECT * FROM process_phases WHERE id=$1', [id]);

const updatePhaseProgress = async (id, progressPercent) => queryOne('UPDATE process_phases SET progress_percent=$2, updated_at=CURRENT_TIMESTAMP WHERE id=$1 RETURNING *', [id, progressPercent]);

module.exports = { createPhase, getProcessPhases, getPhaseById, updatePhaseProgress };