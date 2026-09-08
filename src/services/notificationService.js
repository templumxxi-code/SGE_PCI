const { query, queryOne } = require('../models/db');

const createNotification = async ({ userId, type, title, message, referenceId = null }) => queryOne(
    `INSERT INTO notifications (user_id, type, title, message, reference_id)
     VALUES ($1,$2,$3,$4,$5) RETURNING *`,
    [userId, type, title, message, referenceId]
);

const listNotifications = async (userId, limit = 50) => (await query(
    `SELECT id, user_id, type, title, message, reference_id, read, read_at, created_at
     FROM notifications WHERE user_id=$1 ORDER BY created_at DESC LIMIT $2`, [userId, Math.min(Number(limit) || 50, 100)]
)).rows;

const markAsRead = async (id, userId) => queryOne(
    `UPDATE notifications SET read=TRUE, read_at=CURRENT_TIMESTAMP
     WHERE id=$1 AND user_id=$2 RETURNING *`, [id, userId]
);

const unreadCount = async (userId) => {
    const row = await queryOne('SELECT COUNT(*)::int AS count FROM notifications WHERE user_id=$1 AND read=FALSE', [userId]);
    return row?.count || 0;
};

module.exports = { createNotification, listNotifications, markAsRead, unreadCount };