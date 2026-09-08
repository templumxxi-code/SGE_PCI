// Teste mínimo para diagnosticar erro de serialização
const { test } = require('node:test');
const assert = require('assert');

test('simples - apenas incremento', (t) => {
    const result = 1 + 1;
    assert.strictEqual(result, 2);
});
