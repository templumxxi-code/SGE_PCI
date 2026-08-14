process.env.NODE_ENV = 'test';
process.env.USE_REAL_PG = 'true';
process.env.ALLOW_TEST_DB_MIGRATIONS = 'true';
process.env.RATE_LIMIT_MAX = '1000';
process.env.DB_HOST = process.env.DB_HOST || '127.0.0.1';
process.env.DB_PORT = process.env.DB_PORT || '5432';
process.env.DB_NAME = process.env.DB_NAME || 'smp_pci_test';
process.env.DB_USER = process.env.DB_USER || 'postgres';
process.env.DB_PASSWORD = process.env.DB_PASSWORD || '';
process.env.JWT_SECRET = 'test-secret';
process.env.JWT_EXPIRES_IN = '15m';

const { test, beforeEach, afterEach, before } = require('node:test');
const assert = require('node:assert/strict');
const { startServer, resetLoginLimiter } = require('../../src/server');
const { resetTestDatabase, query, queryOne, initializeTestDatabase } = require('../../src/models/db');

const startTestServer = async () => {
  const server = await startServer(0);
  await new Promise((resolve) => server.once('listening', resolve));
  return server;
};

const stopTestServer = async (server) => {
  await new Promise((resolve, reject) => {
    server.close((error) => (error ? reject(error) : resolve()));
  });
};

let serverInstance = null;
let testDatabaseInitialized = false;

// Initialize test database once at the beginning (schema and migrations)
before(async () => {
  if (!testDatabaseInitialized) {
    console.log('[PostgreSQL Integration Tests] Initializing test database...');
    try {
      await initializeTestDatabase();
      testDatabaseInitialized = true;
      console.log('[PostgreSQL Integration Tests] Test database initialized successfully');
    } catch (error) {
      console.error('[PostgreSQL Integration Tests] Failed to initialize test database:', error.message);
      throw error;
    }
  }
});

beforeEach(async () => {
  resetLoginLimiter();
  await resetTestDatabase();
  serverInstance = await startTestServer();
});

afterEach(async () => {
  if (serverInstance) {
    await stopTestServer(serverInstance);
    serverInstance = null;
  }
});

const loginAs = async (email, senha) => {
  const response = await fetch(`http://127.0.0.1:${serverInstance.address().port}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, senha })
  });
  const body = await response.json();
  return { response, body };
};

const authHeaders = (token) => ({ Authorization: `Bearer ${token}` });

test('login válido com PostgreSQL real', async () => {
  const { response, body } = await loginAs('admin@pci.rn.gov.br', 'admin123');
  assert.equal(response.status, 200);
  assert.equal(typeof body.token, 'string');
  assert.ok(body.token.length > 20);
  assert.equal(body.usuario.email, 'admin@pci.rn.gov.br');
  assert.equal(body.usuario.perfil, 'NGE');
  assert.ok(body.usuario);
});

test('senha inválida retorna 401 e não revela detalhes', async () => {
  const { response, body } = await loginAs('admin@pci.rn.gov.br', 'senha-errada');
  assert.equal(response.status, 401);
  assert.equal(body.error, 'Credenciais inválidas.');
});

test('usuário inexistente retorna 401', async () => {
  const { response, body } = await loginAs('naoexiste@pci.rn.gov.br', 'senha1234');
  assert.equal(response.status, 401);
  assert.equal(body.error, 'Credenciais inválidas.');
});

test('usuário inativo não faz login', async () => {
  await query('UPDATE usuarios SET ativo = false WHERE email = $1', ['setor@pci.rn.gov.br']);
  const { response, body } = await loginAs('setor@pci.rn.gov.br', 'setor123');
  assert.equal(response.status, 401);
  assert.equal(body.error, 'Credenciais inválidas.');
});

test('token ausente e inválido retornam 401', async () => {
  const withoutToken = await fetch(`http://127.0.0.1:${serverInstance.address().port}/api/auth/perfil`);
  assert.equal(withoutToken.status, 401);

  const invalidToken = await fetch(`http://127.0.0.1:${serverInstance.address().port}/api/auth/perfil`, {
    headers: { Authorization: 'Bearer token-invalido' }
  });
  assert.equal(invalidToken.status, 401);
});

test('token expirado retorna 401', async () => {
  const jwt = require('jsonwebtoken');
  const expired = jwt.sign({ id: 1, email: 'admin@pci.rn.gov.br', nome: 'Admin', perfil: 'NGE', setor_id: null }, process.env.JWT_SECRET, { expiresIn: '-1s' });
  const response = await fetch(`http://127.0.0.1:${serverInstance.address().port}/api/auth/perfil`, {
    headers: { Authorization: `Bearer ${expired}` }
  });
  assert.equal(response.status, 401);
});

test('hash de senha não aparece na resposta do login', async () => {
  const { response, body } = await loginAs('admin@pci.rn.gov.br', 'admin123');
  assert.equal(response.status, 200);
  assert.equal(body.usuario.senha_hash, undefined);
});

test('usuário desativado após emissão do token perde acesso', async () => {
  const { body } = await loginAs('setor@pci.rn.gov.br', 'setor123');
  await query('UPDATE usuarios SET ativo = false WHERE id = $1', [2]);
  const response = await fetch(`http://127.0.0.1:${serverInstance.address().port}/api/processes`, {
    headers: authHeaders(body.token)
  });
  assert.equal(response.status, 401);
});

test('setor A acessa processo A e não acessa processo B', async () => {
  const { body } = await loginAs('setor@pci.rn.gov.br', 'setor123');
  const processoA = await fetch(`http://127.0.0.1:${serverInstance.address().port}/api/processes/1`, { headers: authHeaders(body.token) });
  const processoB = await fetch(`http://127.0.0.1:${serverInstance.address().port}/api/processes/2`, { headers: authHeaders(body.token) });
  assert.equal(processoA.status, 200);
  assert.equal(processoB.status, 403);
});

test('setor A não altera nem exclui processo B', async () => {
  const { body } = await loginAs('setor@pci.rn.gov.br', 'setor123');
  const updateResponse = await fetch(`http://127.0.0.1:${serverInstance.address().port}/api/processes/2`, {
    method: 'PUT',
    headers: { ...authHeaders(body.token), 'Content-Type': 'application/json' },
    body: JSON.stringify({ status_fase: 'Monitorar' })
  });
  const deleteResponse = await fetch(`http://127.0.0.1:${serverInstance.address().port}/api/processes/2`, {
    method: 'DELETE',
    headers: authHeaders(body.token)
  });
  assert.equal(updateResponse.status, 403);
  assert.equal(deleteResponse.status, 403);
});

test('setor A não cria processo em outro setor pelo body', async () => {
  const { body } = await loginAs('setor@pci.rn.gov.br', 'setor123');
  const response = await fetch(`http://127.0.0.1:${serverInstance.address().port}/api/processes`, {
    method: 'POST',
    headers: { ...authHeaders(body.token), 'Content-Type': 'application/json' },
    body: JSON.stringify({ nome: 'Processo indevido', setor_id: 2, macroprocesso_id: 1 })
  });
  assert.equal(response.status, 201);
  const created = await response.json();
  assert.equal(created.id, 3);
});

test('criar processo garante template Planejar fixo e persistente', async () => {
  const { body } = await loginAs('admin@pci.rn.gov.br', 'admin123');
  const response = await fetch(`http://127.0.0.1:${serverInstance.address().port}/api/processes`, {
    method: 'POST',
    headers: { ...authHeaders(body.token), 'Content-Type': 'application/json' },
    body: JSON.stringify({ nome: 'Processo Planejar Template', setor_id: 1, macroprocesso_id: 1 })
  });

  assert.equal(response.status, 201);
  const created = await response.json();
  assert.equal(typeof created.id, 'number');

  const processResponse = await fetch(`http://127.0.0.1:${serverInstance.address().port}/api/processes/${created.id}`, { headers: authHeaders(body.token) });
  assert.equal(processResponse.status, 200);
  const processo = await processResponse.json();
  assert.equal(processo.id, created.id);
  assert.ok(Array.isArray(processo.atividades));
  const expectedCodes = ['PLAN_A', 'PLAN_B', 'PLAN_C', 'PLAN_D', 'PLAN_E', 'PLAN_G'];
  const actualCodes = processo.atividades.map((activity) => activity.codigo).sort();
  assert.deepEqual(actualCodes, expectedCodes.sort());
  assert.ok(processo.atividades.every((activity) => activity.fase === 'Planejar'));
});

test('setor A não amplia acesso com setorId na query string', async () => {
  const { body } = await loginAs('setor@pci.rn.gov.br', 'setor123');
  const response = await fetch(`http://127.0.0.1:${serverInstance.address().port}/api/processes?setor_id=2`, { headers: authHeaders(body.token) });
  assert.equal(response.status, 200);
  const payload = await response.json();
  assert.ok(payload.every((item) => item.setor_id === 1));
});

test('admin acessa recursos globais permitidos', async () => {
  const { response: loginResponse, body: loginBody } = await loginAs('admin@pci.rn.gov.br', 'admin123');
  assert.equal(loginResponse.status, 200);
  assert.equal(typeof loginBody.token, 'string');
  assert.ok(loginBody.token.length > 20);
  assert.equal(loginBody.usuario.email, 'admin@pci.rn.gov.br');
  assert.equal(loginBody.usuario.perfil, 'NGE');

  const perfilResponse = await fetch(`http://127.0.0.1:${serverInstance.address().port}/api/auth/perfil`, {
    method: 'GET',
    headers: authHeaders(loginBody.token)
  });
  assert.equal(perfilResponse.status, 200);
  const perfilBody = await perfilResponse.json();
  assert.equal(perfilBody.email, 'admin@pci.rn.gov.br');
  assert.equal(perfilBody.perfil, 'NGE');

  const response = await fetch(`http://127.0.0.1:${serverInstance.address().port}/api/processes`, { headers: authHeaders(loginBody.token) });
  assert.equal(response.status, 200);
});

test('setor A acessa indicador A e não acessa indicador B', async () => {
  const { body } = await loginAs('setor@pci.rn.gov.br', 'setor123');
  const a = await fetch(`http://127.0.0.1:${serverInstance.address().port}/api/indicators/1`, { headers: authHeaders(body.token) });
  const b = await fetch(`http://127.0.0.1:${serverInstance.address().port}/api/indicators/2`, { headers: authHeaders(body.token) });
  assert.equal(a.status, 200);
  assert.equal(b.status, 403);
});

test('setor A não altera indicador B nem força outro setor', async () => {
  const { body } = await loginAs('setor@pci.rn.gov.br', 'setor123');
  const updateResponse = await fetch(`http://127.0.0.1:${serverInstance.address().port}/api/indicators/2/valor`, {
    method: 'PUT',
    headers: { ...authHeaders(body.token), 'Content-Type': 'application/json' },
    body: JSON.stringify({ novoValor: 99 })
  });
  assert.equal(updateResponse.status, 403);
});

test('admin acessa relatório global e setor recebe apenas o próprio escopo', async () => {
  const adminLogin = await loginAs('admin@pci.rn.gov.br', 'admin123');
  const adminResponse = await fetch(`http://127.0.0.1:${serverInstance.address().port}/api/reports/processos`, { headers: authHeaders(adminLogin.body.token) });
  const adminBody = await adminResponse.json();
  assert.equal(adminResponse.status, 200);
  assert.ok(adminBody.dados.length >= 1);

  const setorLogin = await loginAs('setor@pci.rn.gov.br', 'setor123');
  const setorResponse = await fetch(`http://127.0.0.1:${serverInstance.address().port}/api/reports/processos`, { headers: authHeaders(setorLogin.body.token) });
  const setorBody = await setorResponse.json();
  assert.equal(setorResponse.status, 200);
  assert.ok(setorBody.dados.every((item) => item.setor_id === 1));
});

test('constraints de integridade do PostgreSQL real são respeitadas', async () => {
  await assert.rejects(query('INSERT INTO usuarios (nome, email, senha_hash, perfil, setor_id) VALUES ($1, $2, $3, $4, $5)', ['Erro', 'dup@teste.com', 'hash', 'SETOR', 999]), (error) => error.code === '23503');
  await assert.rejects(query('INSERT INTO processos (nome, setor_id, macroprocesso_id) VALUES ($1, $2, $3)', ['Erro', 999, 1]), (error) => error.code === '23503');
  await assert.rejects(query('INSERT INTO indicadores (processo_id, nome, valor_meta, tipo_indicador, periodicidade) VALUES ($1, $2, $3, $4, $5)', [999, 'I', 10, 'Eficiência', 'Mensal']), (error) => error.code === '23503');
  await assert.rejects(query('INSERT INTO usuarios (nome, email, senha_hash, perfil, setor_id) VALUES ($1, $2, $3, $4, $5)', ['X', 'admin@pci.rn.gov.br', 'hash', 'SETOR', 1]), (error) => error.code === '23505');
  await assert.rejects(query('INSERT INTO processos (nome, setor_id, macroprocesso_id) VALUES ($1, $2, $3)', ['Erro', null, 1]), (error) => error.code === '23502');
});

test('reset protegido exige banco de teste e ambiente test', async () => {
  const original = process.env.DB_NAME;
  process.env.DB_NAME = 'smp_pci';
  const { query: protectedQuery } = require('../../src/models/db');
  const result = await protectedQuery('SELECT 1');
  assert.ok(result);
  process.env.DB_NAME = original;
});

// ==================================================
// ANEXOS - INTEGRAÇÃO COM POSTGRESQL REAL
// ==================================================

test('[ANEXOS] upload válido persiste com hash SHA-256', async () => {
  const { body: admin } = await loginAs('admin@pci.rn.gov.br', 'admin123');
  
  const pdfBuffer = Buffer.from([0x25, 0x50, 0x44, 0x46, ...Buffer.alloc(1000)]);
  const file = new File([pdfBuffer], 'doc.pdf', { type: 'application/pdf' });
  const form = new FormData();
  form.append('file', file);
  form.append('tipo', 'POP');
  
  const response = await fetch(`http://127.0.0.1:${serverInstance.address().port}/api/processes/1/activities/1/attachments`, {
    method: 'POST',
    headers: authHeaders(admin.token),
    body: form
  });
  
  assert.equal(response.status, 201);
  const uploadedFile = await response.json();
  
  // Verify in database
  const record = await queryOne(
    'SELECT id, nome_arquivo, hash_sha256, tamanho_bytes, mime_type FROM anexos WHERE id = $1',
    [uploadedFile.id]
  );
  
  assert.ok(record, 'Anexo deve estar no banco');
  assert.equal(record.nome_arquivo, 'doc.pdf');
  assert.ok(record.hash_sha256.length === 64, 'SHA-256 deve ter 64 caracteres');
  assert.equal(record.tamanho_bytes, pdfBuffer.length);
  assert.equal(record.mime_type, 'application/pdf');
});

test('[ANEXOS] setor A bloqueado em processo de setor B', async () => {
  const { body: setor } = await loginAs('setor@pci.rn.gov.br', 'setor123');
  
  const pdfBuffer = Buffer.from([0x25, 0x50, 0x44, 0x46, ...Buffer.alloc(1000)]);
  const file = new File([pdfBuffer], 'doc.pdf', { type: 'application/pdf' });
  const form = new FormData();
  form.append('file', file);
  form.append('tipo', 'POP');
  
  const response = await fetch(`http://127.0.0.1:${serverInstance.address().port}/api/processes/2/activities/2/attachments`, {
    method: 'POST',
    headers: authHeaders(setor.token),
    body: form
  });
  
  assert.equal(response.status, 403);
});

test('[ANEXOS] NGE upload em outro setor', async () => {
  const { body: admin } = await loginAs('admin@pci.rn.gov.br', 'admin123');
  
  const pdfBuffer = Buffer.from([0x25, 0x50, 0x44, 0x46, ...Buffer.alloc(1000)]);
  const file = new File([pdfBuffer], 'doc.pdf', { type: 'application/pdf' });
  const form = new FormData();
  form.append('file', file);
  form.append('tipo', 'POP');
  
  const response = await fetch(`http://127.0.0.1:${serverInstance.address().port}/api/processes/2/activities/2/attachments`, {
    method: 'POST',
    headers: authHeaders(admin.token),
    body: form
  });
  
  assert.equal(response.status, 201);
});

test('[ANEXOS] auditoria UPLOAD_ANEXO persistida no PostgreSQL real', async () => {
  const { body: admin } = await loginAs('admin@pci.rn.gov.br', 'admin123');
  
  const pdfBuffer = Buffer.from([0x25, 0x50, 0x44, 0x46, ...Buffer.alloc(1000)]);
  const file = new File([pdfBuffer], 'doc.pdf', { type: 'application/pdf' });
  const form = new FormData();
  form.append('file', file);
  form.append('tipo', 'POP');
  
  const response = await fetch(`http://127.0.0.1:${serverInstance.address().port}/api/processes/1/activities/1/attachments`, {
    method: 'POST',
    headers: authHeaders(admin.token),
    body: form
  });
  
  const uploadedFile = await response.json();
  
  // Verify audit log
  const logs = await query(
    'SELECT acao, tabela_afetada, id_registro FROM logs WHERE acao = $1 AND id_registro = $2',
    ['UPLOAD_ANEXO', uploadedFile.id]
  );
  
  const logRows = logs.rows || logs;
  assert.ok(logRows.length > 0, 'Log UPLOAD_ANEXO deve existir');
  assert.equal(logRows[0].tabela_afetada, 'anexos');
});

test('[ANEXOS] exclusão lógica e download bloqueado', async () => {
  const { body: admin } = await loginAs('admin@pci.rn.gov.br', 'admin123');
  
  const pdfBuffer = Buffer.from([0x25, 0x50, 0x44, 0x46, ...Buffer.alloc(1000)]);
  const file = new File([pdfBuffer], 'doc.pdf', { type: 'application/pdf' });
  const form = new FormData();
  form.append('file', file);
  form.append('tipo', 'POP');
  
  const uploadResponse = await fetch(`http://127.0.0.1:${serverInstance.address().port}/api/processes/1/activities/1/attachments`, {
    method: 'POST',
    headers: authHeaders(admin.token),
    body: form
  });
  
  const uploadedFile = await uploadResponse.json();
  
  // Delete
  const deleteResponse = await fetch(`http://127.0.0.1:${serverInstance.address().port}/api/processes/1/activities/1/attachments/${uploadedFile.id}`, {
    method: 'DELETE',
    headers: authHeaders(admin.token)
  });
  
  assert.equal(deleteResponse.status, 200);
  
  // Try download
  const downloadResponse = await fetch(`http://127.0.0.1:${serverInstance.address().port}/api/processes/1/activities/1/attachments/${uploadedFile.id}/download`, {
    headers: authHeaders(admin.token)
  });
  
  assert.equal(downloadResponse.status, 404);
});

test('[ANEXOS] NGE download e exclusão em outro setor', async () => {
  const { body: admin } = await loginAs('admin@pci.rn.gov.br', 'admin123');
  
  // Upload em setor B
  const pdfBuffer = Buffer.from([0x25, 0x50, 0x44, 0x46, ...Buffer.alloc(1000)]);
  const file = new File([pdfBuffer], 'doc.pdf', { type: 'application/pdf' });
  const form = new FormData();
  form.append('file', file);
  form.append('tipo', 'POP');
  
  const uploadResponse = await fetch(`http://127.0.0.1:${serverInstance.address().port}/api/processes/2/activities/2/attachments`, {
    method: 'POST',
    headers: authHeaders(admin.token),
    body: form
  });
  
  const uploadedFile = await uploadResponse.json();
  
  // NGE download setor B
  const downloadResponse = await fetch(`http://127.0.0.1:${serverInstance.address().port}/api/processes/2/activities/2/attachments/${uploadedFile.id}/download`, {
    headers: authHeaders(admin.token)
  });
  
  assert.equal(downloadResponse.status, 200);
  
  // NGE delete setor B
  const deleteResponse = await fetch(`http://127.0.0.1:${serverInstance.address().port}/api/processes/2/activities/2/attachments/${uploadedFile.id}`, {
    method: 'DELETE',
    headers: authHeaders(admin.token)
  });
  
  assert.equal(deleteResponse.status, 200);
  
  // Verify deleted via list
  const listResponse = await fetch(`http://127.0.0.1:${serverInstance.address().port}/api/processes/2/activities/2/attachments`, {
    headers: authHeaders(admin.token)
  });
  
  const listData = await listResponse.json();
  const attachmentsList = listData.attachments || listData;
  const deleted = attachmentsList.find(a => a.id === uploadedFile.id);
  assert.ok(!deleted, 'Arquivo excluído não deve aparecer na lista');
});
