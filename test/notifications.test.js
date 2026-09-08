process.env.NODE_ENV = 'development';
process.env.USE_MOCK_API = 'false';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const service = require('../src/services/notificationService');
const db = require('../src/models/db');

test('notificacao pode ser criada, listada e marcada como lida', async () => {
    const user = (await db.query("SELECT id FROM users WHERE email='admin@pci.rn.gov.br' LIMIT 1")).rows[0];
    assert.ok(user);
    const created = await service.createNotification({ userId: user.id, type: 'CHECKLIST_PENDING', title: 'Teste', message: 'Teste de notificacao' });
    const listed = await service.listNotifications(user.id);
    assert.ok(listed.some((item) => item.id === created.id));
    const read = await service.markAsRead(created.id, user.id);
    assert.equal(read.read, true);
    await db.query('DELETE FROM notifications WHERE id=$1', [created.id]);
});

test.after(() => db.pool.end());
