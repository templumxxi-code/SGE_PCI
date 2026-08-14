process.env.NODE_ENV = 'development';
process.env.USE_MOCK_API = 'false';
process.env.USE_PG_MEM = 'false';
process.env.USE_REAL_PG = 'false';
process.env.JWT_SECRET = 'test-secret';
process.env.JWT_EXPIRES_IN = '15m';
delete process.env.TEST_DATABASE_URL;

const { test } = require('node:test');
const assert = require('node:assert/strict');
const { startServer } = require('../../src/server');

test('login usa o armazenamento local quando não há banco configurado e mantém só o admin inicial', async (t) => {
  const server = await startServer(0);
  t.after(() => new Promise((resolve, reject) => {
    server.close((error) => (error ? reject(error) : resolve()));
  }));

  const { port } = server.address();
  const response = await fetch(`http://127.0.0.1:${port}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'admin@pci.rn.gov.br', senha: 'admin123' })
  });

  assert.equal(response.status, 200);
  const body = await response.json();
  assert.equal(body.usuario.email, 'admin@pci.rn.gov.br');
  assert.equal(body.usuario.perfil, 'NGE');

  const usersResponse = await fetch(`http://127.0.0.1:${port}/api/auth/usuarios`, {
    headers: { Authorization: `Bearer ${body.token}` }
  });
  assert.equal(usersResponse.status, 200);
  const users = await usersResponse.json();
  assert.equal(users.length, 1);
  assert.equal(users[0].email, 'admin@pci.rn.gov.br');
});

test('cadastro e login de usuário novo funcionam com o armazenamento local', async (t) => {
  const server = await startServer(0);
  t.after(() => new Promise((resolve, reject) => {
    server.close((error) => (error ? reject(error) : resolve()));
  }));

  const { port } = server.address();
  const uniqueEmail = `novo-${Date.now()}@pci.rn.gov.br`;
  const adminLogin = await fetch(`http://127.0.0.1:${port}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'admin@pci.rn.gov.br', senha: 'admin123' })
  });
  const adminBody = await adminLogin.json();

  const perfilResponse = await fetch(`http://127.0.0.1:${port}/api/auth/perfil`, {
    headers: { Authorization: `Bearer ${adminBody.token}` }
  });
  assert.equal(perfilResponse.status, 200);

  const registerResponse = await fetch(`http://127.0.0.1:${port}/api/auth/registrar`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${adminBody.token}`
    },
    body: JSON.stringify({ nome: 'Usuário Novo', email: uniqueEmail, senha: 'senhateste123', perfil: 'OPERACIONAL' })
  });

  assert.equal(registerResponse.status, 201);

  const newLogin = await fetch(`http://127.0.0.1:${port}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: uniqueEmail, senha: 'senhateste123' })
  });

  assert.equal(newLogin.status, 200);
  const newLoginBody = await newLogin.json();
  assert.equal(newLoginBody.usuario.email, uniqueEmail);
  assert.equal(newLoginBody.usuario.perfil, 'OPERACIONAL');
});
