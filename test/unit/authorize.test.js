const test = require('node:test');
const assert = require('node:assert/strict');
const { authorize } = require('../../src/middleware/authorize');

const execute = async (options, user, params = {}) => {
    const response = { statusCode: null, body: null, status(code) { this.statusCode = code; return this; }, json(body) { this.body = body; } };
    let called = false;
    await authorize(options)({ user, params }, response, () => { called = true; });
    return { response, called };
};

test('autoriza NGE por role', async () => {
    const result = await execute({ roles: ['NGE'] }, { id: 1, perfil: 'NGE' });
    assert.equal(result.called, true);
    assert.equal(result.response.statusCode, null);
});

test('nega perfil fora da role', async () => {
    const result = await execute({ roles: ['NGE'] }, { id: 2, perfil: 'SETOR' });
    assert.equal(result.called, false);
    assert.equal(result.response.statusCode, 403);
});

test('permite proprio usuario sem liberar campos administrativos', async () => {
    const result = await execute({ roles: ['NGE'], allowSelf: true }, { id: 2, perfil: 'SETOR' }, { id: '2' });
    assert.equal(result.called, true);
});
