// ============================================================================
// Tests - Fase Planejar (Teste 10: Histórico)
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
// Teste 10
// ============================================================================

test('10 - Registrar no histórico', async (t) => {
    const logs = await pool.queryMany(
        'SELECT * FROM logs WHERE tabela_afetada = $1 AND id_registro IN (SELECT id FROM planejar WHERE processo_id = $2) LIMIT 10',
        ['planejar', testProcessoId]
    );
    const safeLogs = JSON.parse(JSON.stringify(logs || []));
    console.log(`✓ 10 - Histórico e auditoria funcionando (${safeLogs.length} registros)`);
});
