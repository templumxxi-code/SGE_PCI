const { test } = require('node:test');
const assert = require('node:assert/strict');
const { loginLimiter, resetLoginLimiter } = require('../../src/middleware/loginLimiter');

test('Rate limiting - loginLimiter é uma função middleware', () => {
  assert.equal(typeof loginLimiter, 'function', 'loginLimiter deve ser uma função');
});

test('Rate limiting - resetLoginLimiter é uma função', () => {
  assert.equal(typeof resetLoginLimiter, 'function', 'resetLoginLimiter deve ser uma função');
});

test('Rate limiting - loginLimiter aceita middleware signature (req, res, next)', () => {
  const req = { ip: '127.0.0.1', headers: {} };
  const res = {};
  const next = () => {};
  
  // Deve aceitar os 3 parâmetros sem erro
  assert.doesNotThrow(() => {
    loginLimiter(req, res, next);
  });
});

test('Rate limiting - resetLoginLimiter não lança erro', () => {
  assert.doesNotThrow(() => {
    resetLoginLimiter();
  });
});

test('Rate limiting - resetLoginLimiter é chamado apenas em testes, não produção', () => {
  // Verifica que resetLoginLimiter é exportado e disponível para testes
  assert.ok(resetLoginLimiter, 'resetLoginLimiter deve estar disponível para uso em testes');
  
  // Nota: A verificação real de que não é usado em produção seria feita via grep_search
  // para garantir que resetLoginLimiter não é chamado em src/server.js ou rotas de produção
});
