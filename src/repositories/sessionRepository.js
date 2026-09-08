const crypto = require('crypto');
const { query, queryOne } = require('../models/db');

const hashToken = (token) => crypto.createHash('sha256').update(token).digest('hex');

const createSession = async (userId, token, expiresAt) => {
    const row = await queryOne(
        `INSERT INTO sessions (user_id, token_hash, expires_at)
         VALUES ($1, $2, $3) RETURNING id`,
        [userId, hashToken(token), expiresAt]
    );
    return row.id;
};

const isSessionActive = async (userId, token) => {
    const row = await queryOne(
        `SELECT id FROM sessions
         WHERE user_id = $1 AND token_hash = $2 AND revoked_at IS NULL AND expires_at > CURRENT_TIMESTAMP`,
        [userId, hashToken(token)]
    );
    return Boolean(row);
};

const revokeSession = async (userId, token) => {
    await query(
        `UPDATE sessions SET revoked_at = CURRENT_TIMESTAMP
         WHERE user_id = $1 AND token_hash = $2 AND revoked_at IS NULL`,
        [userId, hashToken(token)]
    );
};

module.exports = { createSession, isSessionActive, revokeSession, hashToken };
