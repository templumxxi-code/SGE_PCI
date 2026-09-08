const { query, queryOne } = require('../../models/db');

const createActivity = async ({ phaseId, activityCode, title, description, responsibleUserId, status = 'PENDING' }) => queryOne(
    `INSERT INTO process_activities (phase_id, activity_code, codigo, title, titulo, description, descricao, responsible_user_id, status)
     VALUES ($1,$2,$2,$3,$3,$4,$4,$5,$6) RETURNING *`, [phaseId, activityCode, title, description || null, responsibleUserId || null, status]
);

const getActivities = async (phaseId) => (await query('SELECT * FROM process_activities WHERE phase_id=$1 ORDER BY created_at', [phaseId])).rows;
const getActivityById = async (id) => queryOne('SELECT * FROM process_activities WHERE id=$1', [id]);
const updateActivity = async (id, data) => queryOne('UPDATE process_activities SET title=COALESCE($2,title), description=COALESCE($3,description), status=COALESCE($4,status), updated_at=CURRENT_TIMESTAMP WHERE id=$1 RETURNING *', [id, data.title || null, data.description || null, data.status || null]);

module.exports = { createActivity, getActivities, getActivityById, updateActivity };