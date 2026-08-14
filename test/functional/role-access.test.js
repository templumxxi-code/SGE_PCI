// Ensure test environment uses the in-memory DB and deterministic secrets
process.env.NODE_ENV = 'test';
process.env.USE_PG_MEM = 'true';
process.env.JWT_SECRET = 'test-secret';

const assert = require('assert').strict;
const { test, beforeEach } = require('node:test');
const fetch = global.fetch;
const { startServer } = require('../../src/server');
const { resetTestDatabase } = require('../../src/models/db');

if (!fetch) {
    throw new Error('Este teste requer Node.js 18+ com suporte a fetch nativo.');
}

const request = async (path, options = {}, baseUrl) => {
    const response = await fetch(`${baseUrl}${path}`, options);
    const text = await response.text();
    let data;

    try {
        data = JSON.parse(text);
    } catch {
        data = text;
    }

    return { status: response.status, data };
};

const login = async (email, senha, baseUrl) => {
    const { status, data } = await request('/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, senha })
    }, baseUrl);

    assert.equal(status, 200, `Falha ao logar ${email}: ${JSON.stringify(data)}`);
    return data;
};

const get = async (path, token, baseUrl) => {
    const { status, data } = await request(path, {
        headers: { Authorization: `Bearer ${token}` }
    }, baseUrl);
    return { status, data };
};

beforeEach(async () => {
    await resetTestDatabase();
});

test('fluxo funcional NGE e Setor com autorização real', async (t) => {
    const server = await startServer(0);
    t.after(() => new Promise((resolve, reject) => server.close((error) => (error ? reject(error) : resolve()))));
    const address = server.address();
    const baseUrl = `http://127.0.0.1:${address.port}/api`;

    const admin = await login('admin@pci.rn.gov.br', 'admin123', baseUrl);
    const sector = await login('setor@pci.rn.gov.br', 'setor123', baseUrl);

    assert.equal(admin.usuario.perfil, 'NGE');
    assert.equal(sector.usuario.perfil, 'SETOR');

    const adminProcesses = await get('/processes', admin.token, baseUrl);
    assert.equal(adminProcesses.status, 200);
    assert(Array.isArray(adminProcesses.data));
    assert(adminProcesses.data.length >= 1);

    const sectorProcesses = await get('/processes', sector.token, baseUrl);
    assert.equal(sectorProcesses.status, 200);
    sectorProcesses.data.forEach((processo) => {
        assert.equal(processo.setor_id, sector.usuario.setor_id);
    });

    const protectedProcess = await get('/processes/2', sector.token, baseUrl);
    assert.equal(protectedProcess.status, 403);

    const adminDashboard = await get('/reports/dashboard', admin.token, baseUrl);
    assert.equal(adminDashboard.status, 200);
    assert.equal(typeof adminDashboard.data.processos.total, 'number');

    const sectorDashboard = await get('/reports/dashboard', sector.token, baseUrl);
    assert.equal(sectorDashboard.status, 200);
    assert.equal(typeof sectorDashboard.data.processos.total, 'number');
    assert(sectorDashboard.data.processos.total <= adminDashboard.data.processos.total);
    assert.equal(typeof sectorDashboard.data.atividades.concluidas, 'number');
    assert.equal(typeof sectorDashboard.data.atividades.pendentes, 'number');
    assert.equal(sectorDashboard.data.atividades.atrasadas, 0);

    const sectorReports = await get('/reports/processos?setor_id=2', sector.token, baseUrl);
    assert.equal(sectorReports.status, 200);
    assert(sectorReports.data.dados.every((item) => item.setor_id === sector.usuario.setor_id));
});

test('setor lê apenas seus próprios processos e é negado em processo de outro setor', async (t) => {
    const server = await startServer(0);
    t.after(() => new Promise((resolve, reject) => server.close((error) => (error ? reject(error) : resolve()))));
    const address = server.address();
    const baseUrl = `http://127.0.0.1:${address.port}/api`;

    const sector = await login('setor@pci.rn.gov.br', 'setor123', baseUrl);
    const ownProcess = await get('/processes/1', sector.token, baseUrl);
    const foreignProcess = await get('/processes/2', sector.token, baseUrl);

    assert.equal(ownProcess.status, 200);
    assert.equal(ownProcess.data.setor_id, 1);
    assert.equal(foreignProcess.status, 403);
});

test('setor não altera nem deleta processo de outro setor', async (t) => {
    const server = await startServer(0);
    t.after(() => new Promise((resolve, reject) => server.close((error) => (error ? reject(error) : resolve()))));
    const address = server.address();
    const baseUrl = `http://127.0.0.1:${address.port}/api`;

    const sector = await login('setor@pci.rn.gov.br', 'setor123', baseUrl);
    const updateResponse = await request('/processes/2', {
        method: 'PUT',
        headers: {
            Authorization: `Bearer ${sector.token}`,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ status_fase: 'Concluído' })
    }, baseUrl);
    const deleteResponse = await request('/processes/2', {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${sector.token}` }
    }, baseUrl);

    assert.equal(updateResponse.status, 403);
    assert.equal(deleteResponse.status, 403);
});

test('setor lê seus indicadores e é negado em indicador de outro setor', async (t) => {
    const server = await startServer(0);
    t.after(() => new Promise((resolve, reject) => server.close((error) => (error ? reject(error) : resolve()))));
    const address = server.address();
    const baseUrl = `http://127.0.0.1:${address.port}/api`;

    const sector = await login('setor@pci.rn.gov.br', 'setor123', baseUrl);
    const ownIndicator = await get('/indicators/1', sector.token, baseUrl);
    const foreignIndicator = await get('/indicators/2', sector.token, baseUrl);

    assert.equal(ownIndicator.status, 200);
    assert.equal(ownIndicator.data.processo_id, 1);
    assert.equal(foreignIndicator.status, 403);
});

test('admin global acessa relatórios de qualquer setor, e setor é restrito ao próprio', async (t) => {
    const server = await startServer(0);
    t.after(() => new Promise((resolve, reject) => server.close((error) => (error ? reject(error) : resolve()))));
    const address = server.address();
    const baseUrl = `http://127.0.0.1:${address.port}/api`;

    const admin = await login('admin@pci.rn.gov.br', 'admin123', baseUrl);
    const sector = await login('setor@pci.rn.gov.br', 'setor123', baseUrl);

    const adminReport = await get('/reports/processos?setor_id=2', admin.token, baseUrl);
    const sectorReport = await get('/reports/processos?setor_id=2', sector.token, baseUrl);

    assert.equal(adminReport.status, 200);
    assert.equal(sectorReport.status, 200);
    assert(sectorReport.data.dados.every((item) => item.setor_id === 1));
    assert(sectorReport.data.dados.some((item) => item.setor_id === 1));
});

test('setor não amplia acesso ao relatório usando setor_id externo', async (t) => {
    const server = await startServer(0);
    t.after(() => new Promise((resolve, reject) => server.close((error) => (error ? reject(error) : resolve()))));
    const address = server.address();
    const baseUrl = `http://127.0.0.1:${address.port}/api`;

    const sector = await login('setor@pci.rn.gov.br', 'setor123', baseUrl);
    const report = await get('/reports/processos?setor_id=2', sector.token, baseUrl);

    assert.equal(report.status, 200);
    assert.equal(report.data.dados.length, 1);
    assert.equal(report.data.dados[0].setor_id, 1);
});

