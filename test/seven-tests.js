// Teste com 7 testes para verificar limite de serialização
const { test } = require('node:test');
const assert = require('assert');

process.env.NODE_ENV = 'test';
process.env.USE_PG_MEM = 'true';

// Carregar pool no topo do arquivo
const pool = require('../src/models/db');

test('teste 1', async (t) => {
    const result = await pool.query('SELECT 1 as num');
    assert.strictEqual(result.rows[0].num, 1);
});

test('teste 2', async (t) => {
    const result = await pool.query('SELECT 2 as num');
    assert.strictEqual(result.rows[0].num, 2);
});

test('teste 3', async (t) => {
    const result = await pool.query('SELECT 3 as num');
    assert.strictEqual(result.rows[0].num, 3);
});

test('teste 4', async (t) => {
    const result = await pool.query('SELECT 4 as num');
    assert.strictEqual(result.rows[0].num, 4);
});

test('teste 5', async (t) => {
    const result = await pool.query('SELECT 5 as num');
    assert.strictEqual(result.rows[0].num, 5);
});

test('teste 6', async (t) => {
    const result = await pool.query('SELECT 6 as num');
    assert.strictEqual(result.rows[0].num, 6);
});

test('teste 7 - DEVE FALHAR COM SERIALIZAÇÃO', async (t) => {
    const result = await pool.query('SELECT 7 as num');
    assert.strictEqual(result.rows[0].num, 7);
});
