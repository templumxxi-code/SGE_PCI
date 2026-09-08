process.env.NODE_ENV = 'development';
process.env.USE_MOCK_API = 'false';

const { test, before } = require('node:test');
const assert = require('node:assert/strict');
const db = require('../src/models/db');

const baseUrl = process.env.BPM_TEST_URL || 'http://127.0.0.1:3002';
let auth;

const login = async () => {
    const response = await fetch(`${baseUrl}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: 'admin@pci.rn.gov.br', senha: 'admin123' })
    });
    assert.equal(response.status, 200);
    return response.json();
};

before(async () => {
    await db.query("DELETE FROM login_attempts WHERE email = 'admin@pci.rn.gov.br'");
    auth = await login();
});

test('API BPM cria e consulta processo com escopo', async () => {
    const unit = (await db.query('SELECT id FROM organizational_units_v2 WHERE ativo=TRUE LIMIT 1')).rows[0];
    assert.ok(unit);
    const headers = { Authorization: `Bearer ${auth.token}`, 'Content-Type': 'application/json' };
    const created = await fetch(`${baseUrl}/api/bpm/processes`, {
        method: 'POST', headers,
        body: JSON.stringify({ name: `API BPM ${Date.now()}`, organizational_unit_id: unit.id })
    });
    assert.equal(created.status, 201);
    const process = await created.json();
    assert.match(process.id, /^[0-9a-f-]{36}$/i);

    const fetched = await fetch(`${baseUrl}/api/bpm/processes/${process.id}`, { headers });
    assert.equal(fetched.status, 200);
    const body = await fetched.json();
    assert.equal(body.id, process.id);
});

test('API BPM rejeita UUID inválido', async () => {
    const response = await fetch(`${baseUrl}/api/bpm/processes/invalido`, { headers: { Authorization: `Bearer ${auth.token}` } });
    assert.equal(response.status, 400);
});

test.after(async () => db.pool.end());
