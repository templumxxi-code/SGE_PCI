const { query, queryOne } = require('../../models/db');

const addResponsible = async (activityId, userId, assignedBy) => queryOne(
    `INSERT INTO activity_responsibles (activity_id, user_id, assigned_by)
     VALUES ($1,$2,$3) ON CONFLICT (activity_id,user_id) DO UPDATE SET assigned_by=EXCLUDED.assigned_by
     RETURNING *`, [activityId, userId, assignedBy]
);

const getResponsibles = async (activityId) => (await query(
    `SELECT ar.*, u.nome, u.email FROM activity_responsibles ar JOIN users u ON u.id=ar.user_id
     WHERE ar.activity_id=$1 ORDER BY ar.created_at`, [activityId]
)).rows;

const removeResponsible = async (activityId, userId) => queryOne(
    'DELETE FROM activity_responsibles WHERE activity_id=$1 AND user_id=$2 RETURNING *', [activityId, userId]
);

module.exports = { addResponsible, getResponsibles, removeResponsible };
