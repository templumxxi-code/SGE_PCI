const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

function loadNotificationCenter() {
  const appCode = fs.readFileSync(path.join(__dirname, '../../public/js/app.js'), 'utf8');
  const storage = {};
  const windowObject = {
    location: { protocol: 'http:', origin: 'http://localhost:3000' },
    app: {
      currentUser: {
        id: 'user-1',
        nome: 'Usuário Teste',
        email: 'teste@pci.rn.gov.br',
        perfil: 'CHEFE_SETOR',
        accessProfileKey: 'CHEFE_SETOR'
      }
    },
    AccessControl: {
      normalizeUser: (user) => ({
        ...(user || {}),
        perfil: 'CHEFE_SETOR',
        accessProfileKey: 'CHEFE_SETOR',
        profileLabel: 'Chefe de Setor'
      }),
      getCurrentUser: () => windowObject.app.currentUser,
      canViewProcess: () => true
    },
    DashboardManager: {},
    ProcessManager: {},
    IndicatorManager: {},
    SettingsManager: {},
    AuthManager: {}
  };

  const context = {
    window: windowObject,
    document: {
      addEventListener() {},
      querySelector() { return null; },
      querySelectorAll() { return []; },
      getElementById() { return null; },
      removeEventListener() {}
    },
    localStorage: {
      getItem(key) {
        return Object.prototype.hasOwnProperty.call(storage, key) ? storage[key] : null;
      },
      setItem(key, value) {
        storage[key] = String(value);
      },
      removeItem(key) {
        delete storage[key];
      }
    },
    console,
    setTimeout,
    clearTimeout,
    fetch: async () => ({ ok: false })
  };

  vm.createContext(context);
  vm.runInContext(appCode, context);
  windowObject.NotificationCenter.ensureCurrentUserNotifications = () => {};
  return { window: windowObject, storage };
}

test('o bootstrap não cria notificações sem evento real de domínio', () => {
  const { window, storage } = loadNotificationCenter();
  const before = JSON.parse(storage['sge_pci_notifications'] || '[]');
  assert.equal(before.length, 0);

  assert.doesNotThrow(() => {
    window.NotificationCenter.ensureCurrentUserNotifications();
  });

  const after = JSON.parse(storage['sge_pci_notifications'] || '[]');
  assert.equal(after.length, 0);
});

test('uma notificação só pode ser emitida quando há uma fonte de evento explícita', () => {
  const { window } = loadNotificationCenter();

  const created = window.NotificationCenter.emitNotification('UPDATE', {
    sourceEvent: 'PROCESSO_SUBMETIDO',
    processId: 'PROC-123',
    recipientUserId: 'user-1',
    recipientRole: 'CHEFE_SETOR',
    title: 'Processo submetido',
    message: 'O processo foi encaminhado para análise.'
  });

  assert.ok(created);
  assert.equal(created.sourceEvent, 'PROCESSO_SUBMETIDO');

  const rejected = window.NotificationCenter.emitNotification('UPDATE', {
    processId: 'PROC-456',
    title: 'Sem evento real',
    message: 'Não deveria ser persistida.'
  });

  assert.equal(rejected, null);
});
