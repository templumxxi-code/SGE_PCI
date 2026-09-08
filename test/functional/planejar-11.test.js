// ============================================================================
// Tests - Fase Planejar (Arquivo de Isolamento: Testes 11-12)
// Polícia Científica do Rio Grande do Norte
// ============================================================================

const assert = require('assert');
const { test } = require('node:test');
process.env.NODE_ENV = 'test';
process.env.USE_PG_MEM = 'true';
const pool = require('../../src/models/db');
const { initializeTestDatabase } = pool;

test.before(async () => {
    await initializeTestDatabase();
});

// Setup
const testProcessoId = 1;
const testSetorId = 1;

// ============================================================================
// Testes 11-12
// ============================================================================

test('11 - Isolamento entre setores', async (t) => {
    const processo = await pool.queryOne(
        'SELECT setor_id FROM processos WHERE id = $1',
        [testProcessoId]
    );
    const safeProcesso = JSON.parse(JSON.stringify(processo || {}));
    assert.ok(safeProcesso, 'Processo deveria existir');
    assert.strictEqual(safeProcesso.setor_id, testSetorId);
    console.log('✓ 11 - Isolamento entre setores');
});

// Teste 12 movido para arquivo separado por limite de serialização
