process.env.NODE_ENV = 'test';
process.env.USE_PG_MEM = 'true';
process.env.JWT_SECRET = 'test-secret';
process.env.JWT_EXPIRES_IN = '15m';
process.env.RATE_LIMIT_MAX = '2';
process.env.RATE_LIMIT_WINDOW_MS = '5000';
process.env.CORS_ORIGINS = 'http://localhost:3000,http://127.0.0.1:3000';

const { test, beforeEach } = require('node:test');
const assert = require('node:assert/strict');
const jwt = require('jsonwebtoken');
const { startServer, resetLoginLimiter } = require('../../src/server');
const { query, queryOne, resetTestDatabase } = require('../../src/models/db');

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

beforeEach(async () => {
  resetLoginLimiter();
  await resetTestDatabase();
});

test('login com senha inválida devolve mensagem genérica e status 401', async (t) => {
  const server = await startTestServer();
  t.after(() => stopTestServer(server));
  const { port } = server.address();

  const response = await fetch(`http://127.0.0.1:${port}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'admin@pci.rn.gov.br', senha: 'senha-errada' })
  });

  const body = await response.json();
  assert.equal(response.status, 401);
  assert.equal(body.error, 'Credenciais inválidas.');
});

test('usuário inexistente recebe 401 genérico', async (t) => {
  const server = await startTestServer();
  t.after(() => stopTestServer(server));
  const { port } = server.address();

  const response = await fetch(`http://127.0.0.1:${port}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'naoexiste@pci.rn.gov.br', senha: 'senha1234' })
  });

  const body = await response.json();
  assert.equal(response.status, 401);
  assert.equal(body.error, 'Credenciais inválidas.');
});

test('usuário inativo não consegue fazer login', async (t) => {
  const server = await startTestServer();
  t.after(() => stopTestServer(server));
  const { port } = server.address();

  await query('UPDATE usuarios SET ativo = false WHERE email = $1', ['setor@pci.rn.gov.br']);
  const response = await fetch(`http://127.0.0.1:${port}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'setor@pci.rn.gov.br', senha: 'setor123' })
  });

  const body = await response.json();
  assert.equal(response.status, 401);
  assert.equal(body.error, 'Credenciais inválidas.');
});

test('usuário de setor não consegue acessar recurso de outro setor', async (t) => {
  const server = await startTestServer();
  t.after(() => stopTestServer(server));
  const { port } = server.address();

  const loginResponse = await fetch(`http://127.0.0.1:${port}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'setor@pci.rn.gov.br', senha: 'setor123' })
  });

  const loginBody = await loginResponse.json();
  assert.equal(loginResponse.status, 200);

  const response = await fetch(`http://127.0.0.1:${port}/api/processes/2`, {
    headers: { Authorization: `Bearer ${loginBody.token}` }
  });

  const body = await response.json();
  assert.equal(response.status, 403);
  assert.match(body.error, /não autorizado|restrito/i);
});

test('token ausente e inválido retornam 401', async (t) => {
  const server = await startTestServer();
  t.after(() => stopTestServer(server));
  const { port } = server.address();

  const withoutToken = await fetch(`http://127.0.0.1:${port}/api/auth/perfil`);
  assert.equal(withoutToken.status, 401);

  const invalidToken = await fetch(`http://127.0.0.1:${port}/api/auth/perfil`, {
    headers: { Authorization: 'Bearer token-invalido' }
  });
  assert.equal(invalidToken.status, 401);
});

test('token expirado retorna 401', async (t) => {
  const server = await startTestServer();
  t.after(() => stopTestServer(server));
  const { port } = server.address();

  const expiredToken = jwt.sign({ id: 1, email: 'admin@pci.rn.gov.br', nome: 'Admin', perfil: 'NGE', setor_id: null }, process.env.JWT_SECRET, { expiresIn: '-1s' });
  const response = await fetch(`http://127.0.0.1:${port}/api/auth/perfil`, {
    headers: { Authorization: `Bearer ${expiredToken}` }
  });

  assert.equal(response.status, 401);
});

test('usuário inativo não mantém acesso após token antigo', async (t) => {
  const server = await startTestServer();
  t.after(() => stopTestServer(server));
  const { port } = server.address();

  const loginResponse = await fetch(`http://127.0.0.1:${port}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'setor@pci.rn.gov.br', senha: 'setor123' })
  });
  const loginBody = await loginResponse.json();

  await query('UPDATE usuarios SET ativo = false WHERE id = $1', [2]);
  const response = await fetch(`http://127.0.0.1:${port}/api/processes`, {
    headers: { Authorization: `Bearer ${loginBody.token}` }
  });

  assert.equal(response.status, 401);
});

test('login válido não devolve senha hash e bloqueia acesso indevido', async (t) => {
  const server = await startTestServer();
  t.after(() => stopTestServer(server));
  const { port } = server.address();

  const response = await fetch(`http://127.0.0.1:${port}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'admin@pci.rn.gov.br', senha: 'admin123' })
  });

  const body = await response.json();
  assert.equal(response.status, 200);
  assert.equal(body.usuario.senha_hash, undefined);
  assert.equal(body.usuario.perfil, 'NGE');
});

test('rate limit aplica o limite no fluxo de login quando disponível', async (t) => {
  const server = await startTestServer();
  t.after(() => stopTestServer(server));
  const { port } = server.address();
  resetLoginLimiter();

  const first = await fetch(`http://127.0.0.1:${port}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'admin@pci.rn.gov.br', senha: 'senha-errada' })
  });
  const second = await fetch(`http://127.0.0.1:${port}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'admin@pci.rn.gov.br', senha: 'senha-errada' })
  });
  const third = await fetch(`http://127.0.0.1:${port}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'admin@pci.rn.gov.br', senha: 'senha-errada' })
  });

  const firstBody = await first.json();
  const secondBody = await second.json();
  const thirdBody = await third.json();

  assert.equal(first.status, 401);
  assert.equal(second.status, 401);
  assert.equal(third.status, 429);
  assert.equal(firstBody.error, 'Credenciais inválidas.');
  assert.equal(secondBody.error, 'Credenciais inválidas.');
  assert.match(thirdBody.error, /muitas tentativas|too many requests/i);
  assert.ok(third.headers.get('retry-after'));
});

test('payload acima do limite é rejeitado com 413', async (t) => {
  const server = await startTestServer();
  t.after(() => stopTestServer(server));
  const { port } = server.address();

  const oversized = 'x'.repeat(1024 * 1024 + 1);
  const response = await fetch(`http://127.0.0.1:${port}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'admin@pci.rn.gov.br', senha: oversized })
  });

  assert.equal(response.status, 413);
});

test('CORS e headers de segurança são aplicados', async (t) => {
  const server = await startTestServer();
  t.after(() => stopTestServer(server));
  const { port } = server.address();

  const allowed = await fetch(`http://127.0.0.1:${port}/api/health`, {
    headers: { Origin: 'http://localhost:3000' }
  });
  assert.equal(allowed.headers.get('access-control-allow-origin'), 'http://localhost:3000');
  assert.equal(allowed.headers.get('x-dns-prefetch-control'), 'off');
  assert.equal(allowed.headers.get('x-content-type-options'), 'nosniff');
  assert.equal(allowed.headers.get('x-frame-options'), 'SAMEORIGIN');

  const denied = await fetch(`http://127.0.0.1:${port}/api/health`, {
    headers: { Origin: 'https://evil.example' }
  });
  assert.equal(denied.status, 500);
});
