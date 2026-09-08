process.env.NODE_ENV = 'test';
process.env.USE_PG_MEM = 'true';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const { initializeTestDatabase, pool } = require('../src/models/db');
const { bootstrapTestDatabase } = require('../src/models/bootstrap-test-db');

test('bootstrap pg-mem pode ser executado duas vezes', async () => {
    await initializeTestDatabase();
    await assert.doesNotReject(() => bootstrapTestDatabase(pool));
});

test.after(() => pool.end());
