const assert = require('assert/strict');
const test = require('node:test');

class MemoryStorage {
  constructor() {
    this.store = new Map();
  }
  getItem(key) {
    return this.store.has(key) ? this.store.get(key) : null;
  }
  setItem(key, value) {
    this.store.set(key, String(value));
  }
  removeItem(key) {
    this.store.delete(key);
  }
  clear() {
    this.store.clear();
  }
}

global.localStorage = new MemoryStorage();
const AccessControl = require('../../public/js/access-control.js');

test('NGE visualiza todos os processos e o dashboard NGE é exclusivo', () => {
  const ngeUser = { id: 1, name: 'NGE', role: 'NGE_ADMIN' };
  const setorUser = { id: 2, name: 'Chefe', role: 'CHEFE_SETOR', sectorId: 10 };
  const processes = [
    { id: 1, active: true, sectorId: 10 },
    { id: 2, active: true, sectorId: 20 },
    { id: 3, active: false, sectorId: 10 }
  ];

  assert.equal(AccessControl.isNGE(ngeUser), true);
  assert.equal(AccessControl.isNGE(setorUser), false);
  assert.equal(AccessControl.canAccessSection(ngeUser, 'dashboard-nge'), true);
  assert.equal(AccessControl.canAccessSection(setorUser, 'dashboard-nge'), false);
  assert.deepEqual(AccessControl.getVisibleProcesses(ngeUser, processes).map((process) => process.id), [1, 2]);
  assert.deepEqual(AccessControl.getVisibleProcesses(setorUser, processes).map((process) => process.id), [1]);
});
