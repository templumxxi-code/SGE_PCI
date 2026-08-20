const fs = require('fs');
const vm = require('vm');

const appCode = fs.readFileSync('public/js/app.js', 'utf8');
const storage = {};
const windowObject = {
  location: { protocol: 'http:', origin: 'http://localhost:3001' },
  app: {
    currentUser: {
      id: 'user-1',
      nome: 'Teste',
      email: 'teste@pci.rn.gov.br',
      perfil: 'CHEFE_SETOR',
      accessProfileKey: 'CHEFE_SETOR'
    }
  },
  AccessControl: {
    normalizeUser: (user) => ({ ...(user || {}), perfil: 'CHEFE_SETOR', accessProfileKey: 'CHEFE_SETOR', profileLabel: 'Chefe de Setor' }),
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
    removeEventListener() {},
    createElement() { return {}; },
    body: {}
  },
  localStorage: {
    getItem(key) { return Object.prototype.hasOwnProperty.call(storage, key) ? storage[key] : null; },
    setItem(key, value) { storage[key] = String(value); },
    removeItem(key) { delete storage[key]; }
  },
  console,
  setTimeout,
  clearTimeout,
  fetch: async () => ({ ok: false })
};

vm.createContext(context);
vm.runInContext(appCode, context);

const valid = windowObject.NotificationCenter.emitNotification('PROCESSO_SUBMETIDO', {
  sourceEvent: 'PROCESSO_SUBMETIDO',
  processId: 'PROC-123',
  recipientUserId: 'user-1',
  recipientRole: 'CHEFE_SETOR',
  title: 'Processo submetido',
  message: 'Processo foi encaminhado para análise.'
});

const rejected = windowObject.NotificationCenter.emitNotification('UPDATE', {
  processId: 'PROC-456',
  title: 'Sem evento real',
  message: 'Não deveria ser persistida.'
});

const notifications = JSON.parse(storage['sge_pci_notifications'] || '[]');

console.log(JSON.stringify({
  valid: !!valid,
  validSource: valid && valid.sourceEvent,
  rejected: rejected,
  total: notifications.length,
  entries: notifications.map((n) => ({ title: n.title, sourceEvent: n.sourceEvent, category: n.category }))
}, null, 2));

if (!valid || valid.sourceEvent !== 'PROCESSO_SUBMETIDO') {
  process.exit(1);
}
if (rejected !== null) {
  process.exit(1);
}
