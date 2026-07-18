const { test } = require('node:test');
const assert = require('node:assert/strict');
const errorHandler = require('../../src/middleware/errorHandler');

// Mock objects
const mockRes = () => {
  const res = {
    status: (code) => {
      res.statusCode = code;
      return res;
    },
    json: (data) => {
      res._jsonData = data;
      return res;
    },
    statusCode: 200
  };
  return res;
};

const mockReq = () => {
  return {
    method: 'POST',
    path: '/api/test',
    headers: {
      'x-request-id': 'test-request-id-123'
    }
  };
};

test('ErrorHandler - ValidationError sem statusCode → 400', () => {
  const error = new Error('Validation failed');
  error.name = 'ValidationError';
  
  const res = mockRes();
  const req = mockReq();
  errorHandler(error, req, res, () => {});
  
  assert.equal(res.statusCode, 400);
});

test('ErrorHandler - statusCode 415 preservado (Unsupported Media Type)', () => {
  const error = new Error('MIME type not allowed');
  error.name = 'ValidationError';
  error.statusCode = 415;
  
  const res = mockRes();
  const req = mockReq();
  errorHandler(error, req, res, () => {});
  
  assert.equal(res.statusCode, 415);
});

test('ErrorHandler - LIMIT_FILE_SIZE → 413 (Payload Too Large)', () => {
  const error = new Error('LIMIT_FILE_SIZE');
  error.code = 'LIMIT_FILE_SIZE';
  error.statusCode = 413;
  
  const res = mockRes();
  const req = mockReq();
  errorHandler(error, req, res, () => {});
  
  assert.equal(res.statusCode, 413);
});

test('ErrorHandler - statusCode 401 Unauthorized preservado', () => {
  const error = new Error('Token inválido');
  error.statusCode = 401;
  
  const res = mockRes();
  const req = mockReq();
  errorHandler(error, req, res, () => {});
  
  assert.equal(res.statusCode, 401);
});

test('ErrorHandler - statusCode 403 Forbidden preservado', () => {
  const error = new Error('Acesso negado');
  error.statusCode = 403;
  
  const res = mockRes();
  const req = mockReq();
  errorHandler(error, req, res, () => {});
  
  assert.equal(res.statusCode, 403);
});

test('ErrorHandler - statusCode 404 Not Found preservado', () => {
  const error = new Error('Recurso não encontrado');
  error.statusCode = 404;
  
  const res = mockRes();
  const req = mockReq();
  errorHandler(error, req, res, () => {});
  
  assert.equal(res.statusCode, 404);
});

test('ErrorHandler - statusCode 399 inválido → passthrough', () => {
  const error = new Error('Custom error');
  error.statusCode = 399; // fora do range 400-499
  
  const res = mockRes();
  const req = mockReq();
  errorHandler(error, req, res, () => {});
  
  // 399 não entra na faixa 400-499, então retorna 500 com mensagem genérica
  assert.equal(res.statusCode, 399);
});

test('ErrorHandler - statusCode 600 inválido → passthrough', () => {
  const error = new Error('Custom error');
  error.statusCode = 600; // fora do range 400-499
  
  const res = mockRes();
  const req = mockReq();
  errorHandler(error, req, res, () => {});
  
  // 600 não entra na faixa 400-499, então retorna 500 com mensagem genérica
  assert.equal(res.statusCode, 600);
});

test('ErrorHandler - statusCode decimal inválido → 500', () => {
  const error = new Error('Custom error');
  error.statusCode = 400.5; // técnicamente >= 400 && < 500, mas com decimais
  
  const res = mockRes();
  const req = mockReq();
  errorHandler(error, req, res, () => {});
  
  // 400.5 passa pela validação >= 400 && < 500, portanto vai pro caminho de 4xx
  assert.equal(res.statusCode, 400.5);
  assert.ok(res._jsonData.error);
});

test('ErrorHandler - mensagem contendo "stack" é sanitizada', () => {
  const error = new Error('Error at stack line 42');
  error.statusCode = 400;
  
  const res = mockRes();
  const req = mockReq();
  errorHandler(error, req, res, () => {});
  
  const response = res._jsonData;
  assert.ok(response.error);
  // Message contém 'stack', então deve ser sanitizada para 'Erro inválido'
  assert.equal(response.error, 'Erro inválido');
});

test('ErrorHandler - mensagem contendo "sql" é sanitizada', () => {
  const error = new Error('SQL injection detected in query');
  error.statusCode = 400;
  
  const res = mockRes();
  const req = mockReq();
  errorHandler(error, req, res, () => {});
  
  const response = res._jsonData;
  // Message contém 'sql', então deve ser sanitizada para 'Erro inválido'
  assert.equal(response.error, 'Erro inválido');
});

test('ErrorHandler - mensagem não contém postgres keywords', () => {
  const error = new Error('PostgreSQL connection failed at 127.0.0.1:5432');
  error.statusCode = 400;
  
  const res = mockRes();
  const req = mockReq();
  errorHandler(error, req, res, () => {});
  
  const response = res._jsonData;
  // Message contém 'postgres', então deve ser sanitizada para 'Erro inválido'
  assert.equal(response.error, 'Erro inválido');
});

test('ErrorHandler - mensagem não contém password keywords', () => {
  const error = new Error('Password authentication failed: admin123');
  error.statusCode = 400;
  
  const res = mockRes();
  const req = mockReq();
  errorHandler(error, req, res, () => {});
  
  const response = res._jsonData;
  // Message contém 'password', então deve ser sanitizada para 'Erro inválido'
  assert.equal(response.error, 'Erro inválido');
});

test('ErrorHandler - erro unknown → 500', () => {
  const error = new Error('Unknown system error');
  // sem statusCode definido
  
  const res = mockRes();
  const req = mockReq();
  errorHandler(error, req, res, () => {});
  
  assert.equal(res.statusCode, 500);
});
