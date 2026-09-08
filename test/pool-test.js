// Teste com pool para diagnosticar serialização
const { test } = require('node:test');
const assert = require('assert');

process.env.NODE_ENV = 'test';
process.env.USE_PG_MEM = 'true';

// Carregar pool no topo do arquivo
const pool = require('../src/models/db');

test('com pool - teste simples', async (t) => {
    // Usar pool em query simples
    const result = await pool.query('SELECT 1 as num');
    assert.strictEqual(result.rows[0].num, 1);
});
