process.env.NODE_ENV = 'test';
process.env.USE_PG_MEM = 'true';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const { resolveLegacyUser } = require('../../src/adapters/userAdapter');
const db = require('../../src/models/db');

test('adapter resolve UUID canônico para usuário legado', async () => {
    const user = await resolveLegacyUser({ id: '550e8400-e29b-41d4-a716-446655440000', email: 'admin@pci.rn.gov.br' });
    assert.equal(typeof user.legacyUserId, 'number');
});

test('adapter mantém contexto sem vínculo legado sem lançar erro', async () => {
    const user = await resolveLegacyUser({ id: '550e8400-e29b-41d4-a716-446655440001', email: 'sem-vinculo@teste.com' });
    assert.equal(user.legacyUserId, null);
    assert.equal(user.legacySectorId, null);
});

test.after(() => db.pool.end());
