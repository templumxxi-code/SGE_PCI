const { query, queryOne } = require('../../models/db');

const getChecklist = async (activityId) => (await query(
    'SELECT * FROM activity_checklists WHERE activity_id = $1 ORDER BY created_at', [activityId]
)).rows;

const completeChecklistItem = async (id, completed, userId) => queryOne(
    `UPDATE activity_checklists
    SET completed = $2, completed_by = CASE WHEN $2 THEN $3::uuid ELSE NULL::uuid END,
         completed_at = CASE WHEN $2 THEN CURRENT_TIMESTAMP ELSE NULL END
     WHERE id = $1 RETURNING *`,
    [id, Boolean(completed), userId]
);

const calculateChecklistProgress = async (activityId) => {
    const row = await queryOne(
        `SELECT COALESCE(ROUND(100.0 * COUNT(*) FILTER (WHERE completed) / NULLIF(COUNT(*), 0), 2), 0) AS progress_percent
         FROM activity_checklists WHERE activity_id = $1`, [activityId]
    );
    return Number(row?.progress_percent || 0);
};

module.exports = { getChecklist, completeChecklistItem, calculateChecklistProgress };