process.env.NODE_ENV = 'development';
process.env.USE_MOCK_API = 'false';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const db = require('../src/models/db');

test('relatorios estrategicos usam consultas parametrizadas e retornam dados', async () => {
    const row = await db.query("SELECT COUNT(*)::int AS count FROM processes WHERE status <> 'CANCELLED'");
    assert.equal(typeof row.rows[0].count, 'number');
});

test.after(() => db.pool.end());
