// ============================================================================
// Tests - Fase Planejar (Arquivo 1 de 2: Testes 01-06)
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
const testUsuarioId = 1;
const testObjetivo = 'Teste objetivo de melhoria';

// ============================================================================
// Testes 01-06
// ============================================================================

test('01 - Criar e obter projeto de planejamento', async (t) => {
    const result = await pool.queryOne(
        'SELECT * FROM planejar WHERE processo_id = $1',
        [testProcessoId]
    );
    const safeResult = JSON.parse(JSON.stringify(result || {}));
    assert.ok(safeResult, 'Projeto deveria existir');
    assert.strictEqual(safeResult.processo_id, testProcessoId);
    assert.strictEqual(safeResult.status, 'NÃO_INICIADA');
    console.log('✓ 01 - Criar e obter projeto');
});

test('02 - Atualizar objetivo do projeto', async (t) => {
    const result = await pool.queryOne(
        `UPDATE planejar SET objetivo = $1, status = 'EM_PREENCHIMENTO' WHERE processo_id = $2 RETURNING *`,
        [testObjetivo, testProcessoId]
    );
    const safeResult = JSON.parse(JSON.stringify(result || {}));
    assert.ok(safeResult, 'Projeto deveria ser atualizado');
    assert.strictEqual(safeResult.objetivo, testObjetivo);
    assert.strictEqual(safeResult.status, 'EM_PREENCHIMENTO');
    console.log('✓ 02 - Atualizar objetivo');
});

test('03 - Validar campos obrigatórios', async (t) => {
    const projeto = await pool.queryOne(
        'SELECT * FROM planejar WHERE processo_id = $1',
        [testProcessoId]
    );
    const safeProjeto = JSON.parse(JSON.stringify(projeto || {}));
    assert.ok(safeProjeto.objetivo, 'Objetivo é obrigatório');
    console.log('✓ 03 - Validar campos obrigatórios');
});

test('04 - Enviar para validação (status)', async (t) => {
    const result = await pool.queryOne(
        `UPDATE planejar SET status = 'AGUARDANDO_VALIDACAO' WHERE processo_id = $1 RETURNING *`,
        [testProcessoId]
    );
    const safeResult = JSON.parse(JSON.stringify(result || {}));
    assert.ok(safeResult, 'Status deveria ser atualizado');
    assert.strictEqual(safeResult.status, 'AGUARDANDO_VALIDACAO');
    console.log('✓ 04 - Enviar para validação');
});

test('05 - Aprovar projeto', async (t) => {
    const result = await pool.queryOne(
        `UPDATE planejar SET status = 'APROVADA', aprovado_por = $1, aprovado_em = CURRENT_TIMESTAMP WHERE processo_id = $2 RETURNING *`,
        [testUsuarioId, testProcessoId]
    );
    const safeResult = JSON.parse(JSON.stringify(result || {}));
    assert.ok(safeResult, 'Projeto deveria ser aprovado');
    assert.strictEqual(safeResult.status, 'APROVADA');
    assert.ok(safeResult.aprovado_em, 'Data de aprovação deveria ser registrada');
    console.log('✓ 05 - Aprovar projeto');
});

test('06 - Devolver para correção', async (t) => {
    await pool.query(
        `UPDATE planejar SET status = 'AGUARDANDO_VALIDACAO' WHERE processo_id = $1`,
        [testProcessoId]
    );
    const justificativa = 'Faltam informações no cronograma';
    const result = await pool.queryOne(
        `UPDATE planejar SET status = 'DEVOLVIDA_PARA_CORRECAO', devolucao_justificativa = $1 WHERE processo_id = $2 RETURNING *`,
        [justificativa, testProcessoId]
    );
    const safeResult = JSON.parse(JSON.stringify(result || {}));
    assert.ok(safeResult, 'Projeto deveria ser devolvido');
    assert.strictEqual(safeResult.status, 'DEVOLVIDA_PARA_CORRECAO');
    assert.strictEqual(safeResult.devolucao_justificativa, justificativa);
    console.log('✓ 06 - Devolver para correção');
});
