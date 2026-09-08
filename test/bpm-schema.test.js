process.env.NODE_ENV = 'test';
process.env.USE_REAL_PG = 'true';
process.env.USE_PG_MEM = 'false';
process.env.TEST_DATABASE_URL = '';
process.env.DATABASE_HOST = process.env.DATABASE_HOST || '127.0.0.1';
process.env.DATABASE_PORT = process.env.DATABASE_PORT || '5432';
process.env.DATABASE_NAME = process.env.DATABASE_NAME || 'sge_pci';
process.env.DATABASE_USER = process.env.DATABASE_USER || 'sge_app';

const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const db = require('../src/models/db');
const processRepository = require('../src/repositories/bpm/processRepository');
const phaseRepository = require('../src/repositories/bpm/phaseRepository');
const activityRepository = require('../src/repositories/bpm/activityRepository');
const checklistRepository = require('../src/repositories/bpm/checklistRepository');

let admin;
let bpmProcess;
let phase;
let activity;
let checklist;
let testUnitId;

before(async () => {
    try {
    const role = (await db.query("SELECT id FROM roles WHERE code = 'NGE_ADMIN' LIMIT 1")).rows[0];
    assert.ok(role);
    testUnitId = (await db.query("INSERT INTO organizational_units_v2 (nome, tipo) VALUES ($1, 'SETOR') RETURNING id", [`Unidade teste BPM ${Date.now()}`])).rows[0].id;
    admin = (await db.query("INSERT INTO users (nome, email, password_hash, ativo, role_id, organizational_unit_id) VALUES ('Teste BPM', $1, 'test-hash', TRUE, $2, $3) RETURNING id, organizational_unit_id AS \"organizationUnitId\", 'NGE' AS perfil", [`bpm-${Date.now()}@teste.local`, role.id, testUnitId])).rows[0];
     bpmProcess = await processRepository.createProcess({ name: `Teste BPM ${Date.now()}`, organizationalUnitId: admin.organizationUnitId }, admin);
    phase = await phaseRepository.createPhase({ processId: bpmProcess.id, phaseCode: 'PLAN', phaseName: 'Planejar', phaseOrder: 1 });
    activity = await activityRepository.createActivity({ phaseId: phase.id, activityCode: `TEST_${Date.now()}`, title: 'Atividade de teste' });
    checklist = (await db.query('INSERT INTO activity_checklists (activity_id, description) VALUES ($1, $2) RETURNING *', [activity.id, 'Item de teste'])).rows[0];
    } catch (error) {
        console.error('BPM setup failed:', error.code || error.message);
        throw error;
    }
});

after(async () => {
    await db.query('DELETE FROM processes_v2 WHERE id = $1', [bpmProcess.id]);
    await db.query('DELETE FROM processes WHERE id = $1', [bpmProcess.id]);
    await db.query('DELETE FROM users WHERE id = $1', [admin.id]);
    await db.query('DELETE FROM organizational_units_v2 WHERE id = $1', [testUnitId]);
    await db.pool.end();
});

test('cria processo, fase, atividade e checklist com UUID', async () => {
    assert.match(bpmProcess.id, /^[0-9a-f-]{36}$/i);
     assert.equal(phase.process_id, bpmProcess.id);
    assert.equal(activity.phase_id, phase.id);
    assert.equal(checklist.activity_id, activity.id);
});

test('completa checklist e calcula progresso no banco', async () => {
    await checklistRepository.completeChecklistItem(checklist.id, true, admin.id);
    assert.equal(Number(await checklistRepository.calculateChecklistProgress(activity.id)), 100);
    const saved = (await checklistRepository.getChecklist(activity.id))[0];
    assert.equal(saved.completed, true);
});