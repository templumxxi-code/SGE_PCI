// ============================================================================
// Tests - Fase Planejar (Arquivo 2 de 2: Testes 07-12)
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

const testSwot = {
    tipo: 'FORCA',
    descricao: 'Equipe dedicada'
};

const testCronograma = {
    atividade: 'Levantamento de dados',
    responsavel: 'João Silva',
    data_inicial: '2024-01-15',
    data_final: '2024-01-20',
    situacao: 'Planejada'
};

const testEquipe = {
    nome: 'Maria Santos',
    matricula: '123456',
    responsabilidades: 'Coordenadora',
    setor: 'Setor A'
};

// ============================================================================
// Testes 07-12
// ============================================================================

test('07 - Adicionar item SWOT', async (t) => {
    const projeto = await pool.queryOne(
        'SELECT swot FROM planejar WHERE processo_id = $1',
        [testProcessoId]
    );
    const safeProjeto = JSON.parse(JSON.stringify(projeto || {}));
    let swotArray = [];
    if (safeProjeto.swot) {
        swotArray = typeof safeProjeto.swot === 'string' ? JSON.parse(safeProjeto.swot) : safeProjeto.swot;
    }
    const novoItem = { id: Date.now(), ...testSwot };
    swotArray.push(novoItem);
    const result = await pool.queryOne(
        `UPDATE planejar SET swot = $1 WHERE processo_id = $2 RETURNING *`,
        [JSON.stringify(swotArray), testProcessoId]
    );
    const safeResult = JSON.parse(JSON.stringify(result || {}));
    assert.ok(safeResult, 'SWOT deveria ser atualizado');
    const swotAtualizado = typeof safeResult.swot === 'string' ? JSON.parse(safeResult.swot) : safeResult.swot;
    assert.ok(swotAtualizado.length > 0, 'SWOT deveria ter itens');
    console.log('✓ 07 - Adicionar SWOT');
});

test('08 - Adicionar cronograma', async (t) => {
    const projeto = await pool.queryOne(
        'SELECT cronograma FROM planejar WHERE processo_id = $1',
        [testProcessoId]
    );
    const safeProjeto = JSON.parse(JSON.stringify(projeto || {}));
    let cronogramaArray = [];
    if (safeProjeto.cronograma) {
        cronogramaArray = typeof safeProjeto.cronograma === 'string' ? JSON.parse(safeProjeto.cronograma) : safeProjeto.cronograma;
    }
    const novaEtapa = { id: Date.now(), ...testCronograma };
    cronogramaArray.push(novaEtapa);
    const result = await pool.queryOne(
        `UPDATE planejar SET cronograma = $1 WHERE processo_id = $2 RETURNING *`,
        [JSON.stringify(cronogramaArray), testProcessoId]
    );
    const safeResult = JSON.parse(JSON.stringify(result || {}));
    assert.ok(safeResult, 'Cronograma deveria ser atualizado');
    const cronogramaAtualizado = typeof safeResult.cronograma === 'string' ? JSON.parse(safeResult.cronograma) : safeResult.cronograma;
    assert.ok(cronogramaAtualizado.length > 0, 'Cronograma deveria ter etapas');
    console.log('✓ 08 - Adicionar cronograma');
});

test('09 - Adicionar membro da equipe', async (t) => {
    const projeto = await pool.queryOne(
        'SELECT equipe FROM planejar WHERE processo_id = $1',
        [testProcessoId]
    );
    const safeProjeto = JSON.parse(JSON.stringify(projeto || {}));
    let equipeArray = [];
    if (safeProjeto.equipe) {
        equipeArray = typeof safeProjeto.equipe === 'string' ? JSON.parse(safeProjeto.equipe) : safeProjeto.equipe;
    }
    const novoMembro = { id: Date.now(), ...testEquipe };
    equipeArray.push(novoMembro);
    const result = await pool.queryOne(
        `UPDATE planejar SET equipe = $1 WHERE processo_id = $2 RETURNING *`,
        [JSON.stringify(equipeArray), testProcessoId]
    );
    const safeResult = JSON.parse(JSON.stringify(result || {}));
    assert.ok(safeResult, 'Equipe deveria ser atualizada');
    const equipeAtualizada = typeof safeResult.equipe === 'string' ? JSON.parse(safeResult.equipe) : safeResult.equipe;
    assert.ok(equipeAtualizada.length > 0, 'Equipe deveria ter membros');
    console.log('✓ 09 - Adicionar membro da equipe');
});

// Teste 10 movido para arquivo separado por limite de serialização

// Teste 11 movido para arquivo separado por limite de serialização

// Teste 12 movido para arquivo separado por limite de serialização
