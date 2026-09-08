process.env.NODE_ENV = 'development';
process.env.USE_MOCK_API = 'false';
const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const db = require('../src/models/db');
const base = process.env.TEST_URL || 'http://127.0.0.1:3003';
let token;

before(async () => {
    await db.query("DELETE FROM login_attempts WHERE email='admin@pci.rn.gov.br'");
    const response = await fetch(`${base}/api/auth/login`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ email: 'admin@pci.rn.gov.br', senha: 'admin123' }) });
    assert.equal(response.status, 200);
    token = (await response.json()).token;
});

test('dashboard NGE retorna dados do PostgreSQL', async () => {
    const response = await fetch(`${base}/api/dashboard/nge`, { headers: { Authorization: `Bearer ${token}` } });
    assert.equal(response.status, 200);
    const body = await response.json();
    assert.equal(typeof body.processos.total, 'number');
});

test('notificacoes retornam contador e lista do usuario', async () => {
    const headers = { Authorization: `Bearer ${token}` };
    const list = await fetch(`${base}/api/notifications`, { headers });
    const count = await fetch(`${base}/api/notifications/unread-count`, { headers });
    assert.equal(list.status, 200);
    assert.equal(count.status, 200);
    assert.equal(typeof (await count.json()).count, 'number');
});

test('relatorio estrategico respeita API autenticada', async () => {
    const response = await fetch(`${base}/api/reports/process-summary`, { headers: { Authorization: `Bearer ${token}` } });
    assert.equal(response.status, 200);
    assert.ok(Array.isArray((await response.json()).data));
});

after(() => db.pool.end());
