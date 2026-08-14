const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

function createSandbox() {
  const storage = {};
  const window = {
    app: { currentUser: { perfil: 'SETOR', setor_id: 1 } },
    DashboardManager: null,
    AccessControl: {
      normalizeUser: (user) => user || {},
      isNGE: (user) => String(user?.perfil || '').toUpperCase() === 'NGE_ADMIN'
    }
  };

  const context = {
    console,
    window,
    localStorage: {
      getItem(key) {
        return Object.prototype.hasOwnProperty.call(storage, key) ? storage[key] : null;
      },
      setItem(key, value) {
        storage[key] = String(value);
      },
      removeItem(key) {
        delete storage[key];
      },
      clear() {
        Object.keys(storage).forEach((key) => delete storage[key]);
      }
    },
    document: {
      querySelector() { return null; },
      querySelectorAll() { return []; },
      getElementById() { return null; },
      body: { insertAdjacentHTML() {} }
    },
    notificar() {},
    alert() {},
    formatarDataHora() { return ''; },
    Date,
    JSON,
    Number,
    String,
    Boolean,
    Object,
    Array,
    Math,
    parseInt,
    parseFloat,
    setTimeout,
    clearTimeout
  };

  context.globalThis = context;
  context.self = context;
  return context;
}

test('dashboard local usa setor do usuário e atualiza métricas após salvar/submeter atividade', async () => {
  const context = createSandbox();
  const dashboardPath = path.join(__dirname, '..', '..', 'public', 'js', 'dashboard.js');
  const processesPath = path.join(__dirname, '..', '..', 'public', 'js', 'processes.js');

  vm.runInNewContext(fs.readFileSync(dashboardPath, 'utf8'), context, { filename: dashboardPath });
  vm.runInNewContext(fs.readFileSync(processesPath, 'utf8'), context, { filename: processesPath });

  const initialProcess = {
    id: 1,
    nome: 'Processo A',
    setor_id: 1,
    status_fase: 'Planejar',
    percentual_conclusao: 0,
    phases: [{
      name: 'Planejar',
      activities: [{
        code: 'PLAN_A',
        title: 'A) Estabelecer objetivo do Projeto de Melhoria',
        content: {},
        attachments: [],
        history: [],
        checklist: [
          { itemId: 1, texto: 'Checklist 1', concluido: false },
          { itemId: 2, texto: 'Checklist 2', concluido: false }
        ]
      }]
    }]
  };

  const storedProcesses = [initialProcess];
  context.ProcessManager.getStoredProcesses = () => storedProcesses;
  context.ProcessManager.setStoredProcesses = (items) => {
    storedProcesses.length = 0;
    storedProcesses.push(...items);
  };
  context.ProcessManager.recalculateAndRender = () => {};
  context.ProcessManager.getStoredSelection = () => null;

  const dashboard = context.DashboardManager;
  const metrics = dashboard.buildDashboardFromLocalProcesses(storedProcesses, context.window.app.currentUser);
  assert.equal(metrics.processos.total, 1);
  assert.equal(metrics.atividades.concluidas, 0);
  assert.equal(metrics.atividades.pendentes, 2);

  const saveResult = await context.ProcessManager.saveActivity(1, 'Planejar', 'PLAN_A');
  assert.equal(saveResult, true);
  assert.equal(storedProcesses[0].phases[0].activities[0].status, 'em_andamento');

  storedProcesses[0].phases[0].activities[0].checklist.forEach((item) => {
    item.concluido = true;
  });

  const submitResult = await context.ProcessManager.submitActivity(1, 'Planejar', 'PLAN_A');
  assert.equal(submitResult, true);
  assert.equal(storedProcesses[0].phases[0].activities[0].concluida, true);
  assert.equal(storedProcesses[0].phases[0].activities[0].status, 'concluida');

  const updatedMetrics = dashboard.buildDashboardFromLocalProcesses(storedProcesses, context.window.app.currentUser);
  assert.equal(updatedMetrics.atividades.concluidas, 2);
  assert.equal(updatedMetrics.atividades.pendentes, 0);

  const noSetorMetrics = dashboard.buildDashboardFromLocalProcesses(storedProcesses, { perfil: 'OPERACIONAL' });
  assert.equal(noSetorMetrics.processos.total, 1);
  assert.equal(noSetorMetrics.atividades.pendentes, 0);
});
