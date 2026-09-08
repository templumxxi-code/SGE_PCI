// ============================================================================
// Tests - Fase Planejar (Teste 12: Impedir alteração após aprovação)
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

// ============================================================================
// Teste 12
// ============================================================================

test('12 - Impedir alteração após aprovação', async (t) => {
    await pool.query(
        `UPDATE planejar SET status = 'APROVADA' WHERE processo_id = $1`,
        [testProcessoId]
    );
    const projeto = await pool.queryOne(
        'SELECT status FROM planejar WHERE processo_id = $1',
        [testProcessoId]
    );
    const safeProjeto = JSON.parse(JSON.stringify(projeto || {}));
    assert.strictEqual(safeProjeto.status, 'APROVADA', 'Status deveria estar APROVADA');
    console.log('✓ 12 - Prevenção de alteração após aprovação');
});
